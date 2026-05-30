import type { Message } from "../lib/api";
import { isEmojiOnlyMessage } from "../lib/emoji";

interface ChatBubbleProps {
  message: Message;
  onViewSnap?: (message: Message) => void;
}

export function ChatBubble({ message, onViewSnap }: ChatBubbleProps) {
  const isMedia = message.type === "image" || message.type === "snap";
  const isSnap = message.type === "snap";
  const unopenedSnap =
    isSnap && message.viewOnce && !message.viewedAt && !message.isOwn && !message.mediaUrl;

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const emojiOnly =
    message.type === "text" && isEmojiOnlyMessage(message.content);

  return (
    <div className={`flex mb-1 ${message.isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 no-select ${
          message.isOwn ? "bg-[var(--wa-bubble-out)]" : "bg-[var(--wa-bubble-in)]"
        }`}
      >
        {!message.isOwn && message.senderUsername && (
          <p className="text-xs text-[#25d366] mb-1">{message.senderUsername}</p>
        )}

        {message.type === "text" && (
          <p
            className={`text-[#e9edef] break-words whitespace-pre-wrap ${
              emojiOnly ? "text-[2.5rem] leading-tight" : "text-[15px]"
            }`}
          >
            {message.content}
          </p>
        )}

        {isMedia && unopenedSnap && (
          <button
            type="button"
            onClick={() => onViewSnap?.(message)}
            className="flex items-center gap-2 px-4 py-6 bg-[#202c33] rounded-lg border border-dashed border-[#8696a0]"
          >
            <span className="text-2xl">👆</span>
            <span className="text-sm text-[#8696a0]">Tap to view snap</span>
          </button>
        )}

        {isMedia && message.mediaUrl && (
          <img
            src={message.mediaUrl}
            alt=""
            className="max-w-full rounded-md no-select"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
        )}

        {isSnap && message.viewOnce && message.viewedAt && !message.isOwn && (
          <p className="text-xs text-[#8696a0] mt-1">Opened</p>
        )}

        <div className="flex items-center justify-end gap-1 mt-1">
          {isSnap && <span className="text-[10px] text-[#8696a0]">snap</span>}
          <span className="text-[11px] text-[#8696a0]">{time}</span>
          {message.isOwn && (
            <span className="text-[11px] text-[#53bdeb]">{message.read ? "✓✓" : "✓"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
