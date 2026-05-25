import { useRef, useState, useEffect, useCallback } from "react";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

type Filter = "none" | "warm" | "cool" | "mono";

const FILTERS: Record<Filter, string> = {
  none: "none",
  warm: "sepia(0.4) saturate(1.3)",
  cool: "hue-rotate(180deg) saturate(1.2)",
  mono: "grayscale(1)",
};

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [filter, setFilter] = useState<Filter>("none");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("Camera access denied or unavailable");
    }
  }, [facing, stopStream]);

  useEffect(() => {
    startCamera();
    return stopStream;
  }, [startCamera, stopStream]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.filter = FILTERS[filter];
    ctx.drawImage(video, 0, 0);
    ctx.filter = "none";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `${Math.max(14, canvas.width / 24)}px sans-serif`;
    ctx.fillText("Secure Chat", 12, canvas.height - 16);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreview(dataUrl);
    stopStream();
  };

  const send = async () => {
    if (!preview) return;
    const res = await fetch(preview);
    const blob = await res.blob();
    onCapture(blob);
  };

  const retake = () => {
    setPreview(null);
    startCamera();
  };

  const toggleFacing = () => {
    setFacing((f) => (f === "user" ? "environment" : "user"));
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6">
        <p className="text-red-400 mb-4">{error}</p>
        <button type="button" onClick={onClose} className="text-white underline">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black snap-camera flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      {preview ? (
        <div className="flex-1 relative">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8">
            <button
              type="button"
              onClick={retake}
              className="w-14 h-14 rounded-full bg-[#333] text-white text-sm"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={send}
              className="w-14 h-14 rounded-full bg-[#25d366] text-white font-bold"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="flex-1 w-full"
            style={{ filter: FILTERS[filter] }}
          />
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-2">
            {(Object.keys(FILTERS) as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs ${
                  filter === f ? "bg-white text-black" : "bg-black/50 text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-12">
            <button type="button" onClick={onClose} className="text-white text-2xl">
              ✕
            </button>
            <button
              type="button"
              onClick={capture}
              className="w-16 h-16 rounded-full border-4 border-white bg-white/30"
              aria-label="Capture"
            />
            <button type="button" onClick={toggleFacing} className="text-white text-2xl">
              🔄
            </button>
          </div>
        </>
      )}
    </div>
  );
}
