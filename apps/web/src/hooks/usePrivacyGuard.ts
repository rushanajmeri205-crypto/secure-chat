import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

export function usePrivacyGuard(chatId?: string) {
  const [blurred, setBlurred] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const reportCapture = useCallback(
    (eventType: string) => {
      if (chatId) {
        api.captureEvent(chatId, eventType).catch(() => {});
      }
    },
    [chatId]
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setBlurred(true);
        reportCapture("tab_hidden");
      } else {
        setBlurred(false);
      }
    };

    const onBlur = () => {
      setBlurred(true);
      reportCapture("window_blur");
    };

    const onFocus = () => setBlurred(false);

    const blockContext = (e: Event) => e.preventDefault();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("contextmenu", blockContext);

    const origGetDisplayMedia = navigator.mediaDevices?.getDisplayMedia?.bind(
      navigator.mediaDevices
    );
    if (origGetDisplayMedia && navigator.mediaDevices) {
      navigator.mediaDevices.getDisplayMedia = async (...args) => {
        setWarning("Screen capture detected");
        reportCapture("screen_capture_attempt");
        setTimeout(() => setWarning(null), 5000);
        return origGetDisplayMedia(...args);
      };
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("contextmenu", blockContext);
      if (origGetDisplayMedia && navigator.mediaDevices) {
        navigator.mediaDevices.getDisplayMedia = origGetDisplayMedia;
      }
    };
  }, [reportCapture]);

  return { blurred, warning };
}
