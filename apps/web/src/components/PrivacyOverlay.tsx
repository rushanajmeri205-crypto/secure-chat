interface PrivacyOverlayProps {
  blurred: boolean;
  warning: string | null;
}

export function PrivacyOverlay({ blurred, warning }: PrivacyOverlayProps) {
  if (!blurred && !warning) return null;

  return (
    <>
      {blurred && (
        <div
          className="fixed inset-0 z-[9998] bg-[#0b141a]/90 backdrop-blur-xl flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <p className="text-[#8696a0] text-sm">Content hidden for privacy</p>
        </div>
      )}
      {warning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-red-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          {warning}
        </div>
      )}
    </>
  );
}
