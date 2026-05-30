import { useEffect, useRef } from "react";
import EmojiPicker, { Theme, type EmojiClickData } from "emoji-picker-react";

interface EmojiPickerPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function EmojiPickerPanel({ open, onClose, onSelect }: EmojiPickerPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleClick = (data: EmojiClickData) => {
    onSelect(data.emoji);
  };

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full left-0 right-0 mb-1 z-50 px-1"
    >
      <div className="rounded-xl overflow-hidden shadow-2xl border border-[#2a3942] max-h-[min(360px,45dvh)]">
        <EmojiPicker
          onEmojiClick={handleClick}
          theme={Theme.DARK}
          width="100%"
          height={350}
          searchPlaceholder="Search emojis..."
          previewConfig={{ showPreview: false }}
          lazyLoadEmojis
        />
      </div>
    </div>
  );
}
