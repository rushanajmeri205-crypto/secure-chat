import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type ChatSummary } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

export function ChatsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);

  const load = async () => {
    try {
      const { chats: c } = await api.chats();
      setChats(c);
    } catch {
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNewChat = async () => {
    setShowNew(true);
    try {
      const { users: u } = await api.users();
      setUsers(u);
    } catch {
      setUsers([]);
    }
  };

  const startChat = async (otherUserId: string) => {
    const { chat } = await api.createChat(otherUserId);
    setShowNew(false);
    navigate(`/chat/${chat.id}`);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString();
  };

  return (
    <div className="h-dvh flex flex-col bg-[var(--wa-bg)]">
      <header className="bg-[var(--wa-green)] px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-medium text-white">Chats</h1>
        <div className="flex items-center gap-3">
          {user?.role === "admin" && (
            <Link to="/admin" className="text-white text-sm underline">
              Admin
            </Link>
          )}
          <button type="button" onClick={() => logout()} className="text-white/80 text-sm">
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-center text-[#8696a0] py-8">Loading...</p>
        ) : chats.length === 0 ? (
          <p className="text-center text-[#8696a0] py-8">No chats yet. Start a conversation.</p>
        ) : (
          chats.map((chat) => (
            <Link
              key={chat.id}
              to={`/chat/${chat.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#202c33] border-b border-[#222d34]"
            >
              <div className="w-12 h-12 rounded-full bg-[#6b7c85] flex items-center justify-center text-xl shrink-0">
                {chat.title.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-[#e9edef] font-medium truncate">{chat.title}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {chat.lastMessage && (
                      <span className="text-xs text-[#8696a0]">
                        {formatTime(chat.lastMessage.createdAt)}
                      </span>
                    )}
                    {(chat.unreadCount ?? 0) > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--wa-teal)] text-white text-xs flex items-center justify-center">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[#8696a0] truncate">
                  {chat.lastMessage?.content || "No messages yet"}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={openNewChat}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--wa-teal)] text-white text-2xl shadow-lg flex items-center justify-center"
        aria-label="New chat"
      >
        +
      </button>

      {showNew && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center">
          <div className="bg-[var(--wa-panel)] w-full max-w-md rounded-t-2xl sm:rounded-2xl p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[#e9edef] font-medium">New chat</h2>
              <button type="button" onClick={() => setShowNew(false)} className="text-[#8696a0]">
                ✕
              </button>
            </div>
            {users.length === 0 ? (
              <p className="text-[#8696a0] text-sm">No other users available</p>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => startChat(u.id)}
                  className="w-full text-left px-3 py-3 rounded-lg hover:bg-[#202c33] text-[#e9edef]"
                >
                  {u.username}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
