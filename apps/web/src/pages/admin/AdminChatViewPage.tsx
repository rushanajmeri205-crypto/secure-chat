import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type AdminMessage } from "../../lib/api";

export function AdminChatViewPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<AdminMessage[]>([]);

  useEffect(() => {
    if (!chatId) return;
    api.adminMessages(chatId).then(({ messages: m }) => setMessages(m));
  }, [chatId]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-[#222d34] flex items-center gap-2">
        <button type="button" onClick={() => navigate("/admin/chats")} className="text-[#8696a0]">
          ←
        </button>
        <span className="text-[#e9edef] text-sm">Read-only audit view</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="bg-[var(--wa-panel)] rounded-lg p-3 text-sm">
            <div className="flex justify-between text-[#8696a0] text-xs mb-1">
              <span>{m.senderUsername || "Deleted user"}</span>
              <span>{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            {m.deletedForUsersAt && (
              <span className="text-yellow-500 text-xs">Expired for users</span>
            )}
            {m.type === "text" && <p className="text-[#e9edef]">{m.content}</p>}
            {(m.type === "image" || m.type === "snap") && (
              <div>
                {m.mediaUrl ? (
                  <img
                    src={m.mediaUrl}
                    alt=""
                    className="max-w-full rounded mt-2 no-select"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <p className="text-[#8696a0]">
                    [{m.type}] {m.mediaPath || "media removed"}
                  </p>
                )}
                {m.viewOnce && (
                  <p className="text-xs text-[#8696a0] mt-1">
                    viewOnce {m.viewedAt ? "opened" : "unopened"}
                  </p>
                )}
              </div>
            )}
            {m.archive != null && (
              <pre className="text-xs text-[#667781] mt-2 overflow-x-auto">
                {JSON.stringify(m.archive, null, 2)}
              </pre>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-[#8696a0] text-center">No messages in this chat</p>
        )}
      </div>
    </div>
  );
}
