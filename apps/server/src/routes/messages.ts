import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { signMediaToken } from "../lib/media.js";
import type { Server as SocketServer } from "socket.io";

let io: SocketServer | null = null;

export function setMessageIo(socketIo: SocketServer) {
  io = socketIo;
}

export const messagesRouter = Router();

messagesRouter.use(requireAuth);

async function canAccessChat(chatId: string, userId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;
  const member = await prisma.chatMember.findFirst({
    where: { chatId, userId, leftAt: null },
  });
  return !!member;
}

messagesRouter.get("/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user!.userId;
  const role = req.user!.role;

  if (!(await canAccessChat(chatId, userId, role))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const isAdmin = role === "admin";

  const messages = await prisma.message.findMany({
    where: {
      chatId,
      ...(isAdmin ? {} : { deletedForUsersAt: null }),
    },
    orderBy: { createdAt: "asc" },
    include: {
      readReceipts: { where: { userId } },
    },
  });

  res.json({
    messages: messages.map((m) => formatMessage(m, userId, isAdmin)),
  });
});

function formatMessage(
  m: {
    id: string;
    chatId: string;
    senderId: string | null;
    senderUsername: string | null;
    type: string;
    content: string | null;
    mediaPath: string | null;
    viewOnce: boolean;
    viewedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    readReceipts: { readAt: Date }[];
  },
  userId: string,
  isAdmin: boolean
) {
  const isOwn = m.senderId === userId;
  const canShowMedia =
    m.mediaPath &&
    (isAdmin || isOwn || !m.viewOnce || !!m.viewedAt);
  const mediaUrl = canShowMedia
    ? `/api/media/${signMediaToken(m.mediaPath!, isAdmin ? "admin" : userId)}`
    : null;

  return {
    id: m.id,
    chatId: m.chatId,
    senderId: m.senderId,
    senderUsername: m.senderUsername,
    type: m.type,
    content: m.content,
    mediaUrl,
    viewOnce: m.viewOnce,
    viewedAt: m.viewedAt,
    expiresAt: m.expiresAt,
    createdAt: m.createdAt,
    isOwn,
    read: m.readReceipts.length > 0,
  };
}

const sendSchema = z.object({
  type: z.enum(["text", "image", "snap"]).default("text"),
  content: z.string().max(5000).optional(),
  mediaPath: z.string().optional(),
  viewOnce: z.boolean().optional(),
  ephemeralHours: z.number().min(1).max(168).optional(),
});

messagesRouter.post("/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user!.userId;
  const username = req.user!.username;

  if (!(await canAccessChat(chatId, userId, req.user!.role))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { type, content, mediaPath, viewOnce, ephemeralHours } = parsed.data;

  if (type === "text" && !content?.trim()) {
    res.status(400).json({ error: "Content required for text messages" });
    return;
  }

  if ((type === "image" || type === "snap") && !mediaPath) {
    res.status(400).json({ error: "Media required" });
    return;
  }

  const expiresAt = ephemeralHours
    ? new Date(Date.now() + ephemeralHours * 60 * 60 * 1000)
    : null;

  const message = await prisma.message.create({
    data: {
      chatId,
      senderId: userId,
      senderUsername: username,
      type,
      content: content || null,
      mediaPath: mediaPath || null,
      viewOnce: viewOnce ?? type === "snap",
      expiresAt,
    },
  });

  const formatted = formatMessage(
    { ...message, readReceipts: [] },
    userId,
    false
  );

  io?.to(`chat:${chatId}`).emit("message", formatted);

  res.status(201).json({ message: formatted });
});

messagesRouter.post("/:chatId/messages/:messageId/view", async (req, res) => {
  const { chatId, messageId } = req.params;
  const userId = req.user!.userId;

  if (!(await canAccessChat(chatId, userId, req.user!.role))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const message = await prisma.message.findFirst({
    where: { id: messageId, chatId },
  });

  if (!message || message.senderId === userId) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (message.viewOnce && !message.viewedAt) {
    await prisma.message.update({
      where: { id: messageId },
      data: { viewedAt: new Date() },
    });

    await prisma.messageAdminArchive.upsert({
      where: { messageId },
      create: {
        messageId,
        snapshot: {
          mediaPath: message.mediaPath,
          type: message.type,
          viewedAt: new Date(),
          viewedBy: userId,
        },
      },
      update: {
        snapshot: {
          mediaPath: message.mediaPath,
          type: message.type,
          viewedAt: new Date(),
          viewedBy: userId,
        },
      },
    });

    io?.to(`chat:${chatId}`).emit("message_viewed", { messageId });
  }

  await prisma.messageRead.upsert({
    where: { messageId_userId: { messageId, userId } },
    create: { messageId, userId },
    update: { readAt: new Date() },
  });

  const updated = await prisma.message.findUnique({
    where: { id: messageId },
    include: { readReceipts: { where: { userId } } },
  });

  if (!updated) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  res.json({ message: formatMessage(updated, userId, false) });
});

messagesRouter.post("/:chatId/read", async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user!.userId;
  const { messageIds } = req.body as { messageIds?: string[] };

  if (!(await canAccessChat(chatId, userId, req.user!.role))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  if (!messageIds?.length) {
    res.json({ ok: true });
    return;
  }

  for (const messageId of messageIds) {
    await prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: { readAt: new Date() },
    });
  }

  io?.to(`chat:${chatId}`).emit("read", { userId, messageIds });
  res.json({ ok: true });
});
