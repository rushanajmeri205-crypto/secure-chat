import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AdminChatSummary } from "../../lib/api";

export function AdminChatsPage() {
  const [chats, setChats] = useState<AdminChatSummary[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.adminChats().then(({ chats: c }) => setChats(c));
  }, []);

  const filtered = chats.filter((c) => {
    const names = c.members.map((m) => m.username).join(" ").toLowerCase();
    return names.includes(search.toLowerCase());
  });

  return (
    <div className="p-4">
      <h2 className="text-[#e9edef] font-medium mb-2">All Chats (Audit)</h2>
      <p className="text-[#8696a0] text-sm mb-4">
        View all conversations including after users leave. Messages are retained for admin review.
      </p>

      <input
        type="search"
        placeholder="Search by username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 mb-4 rounded bg-[#202c33] text-[#e9edef] border border-[#2a3942]"
      />

      <div className="space-y-2">
        {filtered.map((chat) => (
          <Link
            key={chat.id}
            to={`/admin/chats/${chat.id}`}
            className="block p-3 bg-[var(--wa-panel)] rounded-lg hover:bg-[#202c33]"
          >
            <p className="text-[#e9edef]">
              {chat.members.map((m) => m.username).join(" ↔ ")}
            </p>
            <p className="text-xs text-[#8696a0] mt-1">
              {chat.members.some((m) => m.leftAt) && (
                <span className="text-yellow-500 mr-2">User left</span>
              )}
              {chat.lastMessage?.content || chat.lastMessage?.type || "No messages"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
