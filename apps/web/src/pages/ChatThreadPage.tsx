import { useEffect, useState, useRef, useCallback, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type Message } from "../lib/api";
import { ChatBubble } from "../components/ChatBubble";
import { CameraCapture } from "../components/CameraCapture";
import { PrivacyOverlay } from "../components/PrivacyOverlay";
import { usePrivacyGuard } from "../hooks/usePrivacyGuard";
import { useSocket, joinChat, leaveChatRoom, emitTyping } from "../hooks/useSocket";

export function ChatThreadPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("Chat");
  const [showCamera, setShowCamera] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [ephemeral, setEphemeral] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { blurred, warning } = usePrivacyGuard(chatId);

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    const { messages: m } = await api.messages(chatId);
    setMessages(m);
    const unread = m.filter((msg) => !msg.isOwn && !msg.read).map((msg) => msg.id);
    if (unread.length) await api.markRead(chatId, unread);
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    joinChat(chatId);
    loadMessages();

    api.chats().then(({ chats }) => {
      const chat = chats.find((c) => c.id === chatId);
      if (chat) setTitle(chat.title);
    });

    return () => leaveChatRoom(chatId);
  }, [chatId, loadMessages]);

  useSocket(
    "message",
    (msg: unknown) => {
      const m = msg as Message;
      if (m.chatId === chatId) {
        setMessages((prev) => [...prev, m]);
        if (chatId && !m.isOwn) api.markRead(chatId, [m.id]);
      }
    },
    [chatId]
  );

  useSocket(
    "message_viewed",
    (data: unknown) => {
      const { messageId } = data as { messageId: string };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, viewedAt: new Date().toISOString(), mediaUrl: null } : m
        )
      );
    },
    [chatId]
  );

  useSocket(
    "typing",
    (data: unknown) => {
      const { chatId: cId, username, isTyping } = data as {
        chatId: string;
        username: string;
        isTyping: boolean;
      };
      if (cId === chatId && isTyping) {
        setTypingUser(username);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTypingUser(null), 3000);
      } else if (!isTyping) {
        setTypingUser(null);
      }
    },
    [chatId]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !chatId) return;
    const content = text.trim();
    setText("");
    emitTyping(chatId, false);
    await api.sendMessage(chatId, {
      type: "text",
      content,
      ephemeralHours: ephemeral ? 24 : undefined,
    });
    await loadMessages();
  };

  const handleTyping = (value: string) => {
    setText(value);
    if (!chatId) return;
    emitTyping(chatId, true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => emitTyping(chatId, false), 1500);
  };

  const handleSnapCapture = async (blob: Blob) => {
    if (!chatId) return;
    setShowCamera(false);
    const { mediaPath } = await api.uploadMedia(blob);
    await api.sendMessage(chatId, {
      type: "snap",
      mediaPath,
      viewOnce: true,
    });
    await loadMessages();
  };

  const handleViewSnap = async (message: Message) => {
    if (!chatId) return;
    const { message: updated } = await api.viewMessage(chatId, message.id);
    setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleLeave = async () => {
    if (!chatId) return;
    if (confirm("Leave this chat? Admin can still view message history.")) {
      await api.leaveChat(chatId);
      navigate("/");
    }
  };

  let lastDate = "";

  return (
    <div className={`h-dvh flex flex-col bg-[#0b141a] ${blurred ? "privacy-blur" : ""}`}>
      <PrivacyOverlay blurred={blurred} warning={warning} />

      <header className="bg-[var(--wa-green)] px-2 py-2 flex items-center gap-2 shrink-0">
        <button type="button" onClick={() => navigate("/")} className="text-white px-2 text-xl">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-medium truncate">{title}</h1>
          {typingUser && <p className="text-xs text-white/70">{typingUser} is typing...</p>}
        </div>
        <button type="button" onClick={handleLeave} className="text-white/80 text-xs px-2">
          Leave
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-2 py-2 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M0 0h60v60H0z%22 fill=%22%230b141a%22/%3E%3Cpath d=%22M0 0l30 30M30 0l30 30M0 30l30 30%22 stroke=%22%23111b21%22 stroke-width=%220.5%22/%3E%3C/svg%3E')]">
        {messages.map((msg) => {
          const d = new Date(msg.createdAt).toDateString();
          const showDate = d !== lastDate;
          lastDate = d;
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center my-3">
                  <span className="text-xs bg-[#182229] text-[#8696a0] px-3 py-1 rounded-lg">
                    {d}
                  </span>
                </div>
              )}
              <ChatBubble message={msg} onViewSnap={handleViewSnap} />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="bg-[var(--wa-panel)] px-2 py-2 flex items-center gap-2 shrink-0 border-t border-[#222d34]"
      >
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          className="w-10 h-10 rounded-full bg-[#202c33] text-xl flex items-center justify-center shrink-0"
          aria-label="Camera"
        >
          📷
        </button>
        <label className="flex items-center gap-1 text-xs text-[#8696a0] shrink-0">
          <input
            type="checkbox"
            checked={ephemeral}
            onChange={(e) => setEphemeral(e.target.checked)}
            className="rounded"
          />
          24h
        </label>
        <input
          type="text"
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="Message"
          className="flex-1 px-4 py-2 rounded-full bg-[#202c33] text-[#e9edef] border-none focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="w-10 h-10 rounded-full bg-[var(--wa-teal)] text-white flex items-center justify-center disabled:opacity-40 shrink-0"
        >
          ➤
        </button>
      </form>

      {showCamera && (
        <CameraCapture onCapture={handleSnapCapture} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
}
