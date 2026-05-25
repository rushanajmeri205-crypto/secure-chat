const API_BASE = "/api";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || "Request failed") as Error & {
      status: number;
      data: unknown;
    };
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  me: () => request<{ user: User }>("/auth/me"),

  users: () => request<{ users: Pick<User, "id" | "username">[] }>("/auth/users"),

  chats: () => request<{ chats: ChatSummary[] }>("/chats"),

  createChat: (otherUserId: string) =>
    request<{ chat: { id: string } }>("/chats", {
      method: "POST",
      body: JSON.stringify({ otherUserId }),
    }),

  leaveChat: (chatId: string) =>
    request<{ ok: boolean }>(`/chats/${chatId}/leave`, { method: "POST" }),

  messages: (chatId: string) =>
    request<{ messages: Message[] }>(`/chats/${chatId}/messages`),

  sendMessage: (
    chatId: string,
    body: {
      type?: string;
      content?: string;
      mediaPath?: string;
      viewOnce?: boolean;
      ephemeralHours?: number;
    }
  ) =>
    request<{ message: Message }>(`/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  viewMessage: (chatId: string, messageId: string) =>
    request<{ message: Message }>(`/chats/${chatId}/messages/${messageId}/view`, {
      method: "POST",
    }),

  markRead: (chatId: string, messageIds: string[]) =>
    request<{ ok: boolean }>(`/chats/${chatId}/read`, {
      method: "POST",
      body: JSON.stringify({ messageIds }),
    }),

  uploadMedia: async (file: Blob, filename = "snap.jpg") => {
    const form = new FormData();
    form.append("file", file, filename);
    const res = await fetch(`${API_BASE}/media/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data as { mediaPath: string };
  },

  captureEvent: (chatId: string, eventType: string) =>
    request<{ ok: boolean }>("/media/capture-event", {
      method: "POST",
      body: JSON.stringify({ chatId, eventType }),
    }),

  adminUsers: () => request<{ users: AdminUser[] }>("/admin/users"),

  adminCreateUser: (username: string, password: string) =>
    request<{ user: User }>("/admin/users", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  adminDeleteUser: (id: string) =>
    request<{ ok: boolean }>(`/admin/users/${id}`, { method: "DELETE" }),

  adminChats: () => request<{ chats: AdminChatSummary[] }>("/admin/chats"),

  adminMessages: (chatId: string) =>
    request<{ messages: AdminMessage[] }>(`/admin/chats/${chatId}/messages`),
};

export interface User {
  id: string;
  username: string;
  role: "admin" | "user";
}

export interface ChatSummary {
  id: string;
  type: string;
  title: string;
  members: { userId: string; username: string; leftAt: string | null }[];
  lastMessage: {
    id: string;
    content: string;
    type: string;
    createdAt: string;
    senderUsername: string | null;
  } | null;
  unreadCount?: number;
  leftAt: string | null;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string | null;
  senderUsername: string | null;
  type: "text" | "image" | "snap";
  content: string | null;
  mediaUrl: string | null;
  viewOnce: boolean;
  viewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  isOwn: boolean;
  read: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  createdAt: string;
  failedLoginAttempts: number;
}

export interface AdminChatSummary {
  id: string;
  type: string;
  createdAt: string;
  members: { userId: string; username: string; leftAt: string | null }[];
  lastMessage: {
    id: string;
    content: string | null;
    type: string;
    createdAt: string;
    senderUsername: string | null;
  } | null;
}

export interface AdminMessage {
  id: string;
  chatId: string;
  senderId: string | null;
  senderUsername: string | null;
  type: string;
  content: string | null;
  mediaPath: string | null;
  mediaUrl?: string | null;
  viewOnce: boolean;
  viewedAt: string | null;
  expiresAt: string | null;
  deletedForUsersAt: string | null;
  createdAt: string;
  archive: unknown;
}
