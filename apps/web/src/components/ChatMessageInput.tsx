import { useRef, useEffect, type KeyboardEvent } from "react";

const MAX_HEIGHT = 120;
const MIN_HEIGHT = 40;

interface ChatMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
}

function isCoarsePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

export function ChatMessageInput({
  value,
  onChange,
  onSend,
  placeholder = "Message",
}: ChatMessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = `${MIN_HEIGHT}px`;
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  };

  useEffect(() => {
    resize();
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;

    // Mobile / touch: Enter adds a new line (keyboard return key)
    if (isCoarsePointer()) return;

    // Desktop: Enter sends, Shift+Enter new line
    if (!e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSend();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      rows={1}
      enterKeyHint="enter"
      inputMode="text"
      autoComplete="off"
      autoCorrect="on"
      spellCheck
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      aria-label="Message"
      className="chat-input flex-1 px-4 py-2.5 rounded-3xl bg-[#202c33] text-[#e9edef] border-none focus:outline-none text-[15px] leading-snug"
      style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
    />
  );
}

export { MIN_HEIGHT as CHAT_INPUT_MIN_HEIGHT };
