import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/auth.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";
import { archiveAndDeleteUser } from "../services/userDelete.js";
import { signMediaToken } from "../lib/media.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

const createUserSchema = z.object({
  username: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(100),
});

adminRouter.post("/users", async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { username, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    res.status(409).json({ error: "Username already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { username, passwordHash, role: "user" },
    select: { id: true, username: true, role: true, createdAt: true },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId: req.user!.userId,
      action: "create_user",
      targetId: user.id,
      metadata: { username },
    },
  });

  res.status(201).json({ user });
});

adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: "user" },
    select: {
      id: true,
      username: true,
      createdAt: true,
      failedLoginAttempts: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users });
});

adminRouter.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "user") {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await archiveAndDeleteUser(id);

  await prisma.adminAuditLog.create({
    data: {
      adminId: req.user!.userId,
      action: "delete_user",
      targetId: id,
      metadata: { username: user.username },
    },
  });

  res.json({ ok: true });
});

adminRouter.get("/chats", async (_req, res) => {
  const chats = await prisma.chat.findMany({
    include: {
      members: {
        include: { user: { select: { id: true, username: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          type: true,
          createdAt: true,
          senderUsername: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    chats: chats.map((c) => ({
      id: c.id,
      type: c.type,
      createdAt: c.createdAt,
      members: c.members.map((m) => ({
        userId: m.userId,
        username: m.user.username,
        leftAt: m.leftAt,
      })),
      lastMessage: c.messages[0] || null,
    })),
  });
});

adminRouter.get("/chats/:id/messages", async (req, res) => {
  const { id } = req.params;
  const chat = await prisma.chat.findUnique({ where: { id } });
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  const messages = await prisma.message.findMany({
    where: { chatId: id },
    orderBy: { createdAt: "asc" },
    include: { adminArchive: true },
  });

  res.json({
    messages: messages.map((m) => ({
      id: m.id,
      chatId: m.chatId,
      senderId: m.senderId,
      senderUsername: m.senderUsername,
      type: m.type,
      content: m.content,
      mediaPath: m.mediaPath,
      mediaUrl: m.mediaPath
        ? `/api/media/${signMediaToken(m.mediaPath, "admin")}`
        : null,
      viewOnce: m.viewOnce,
      viewedAt: m.viewedAt,
      expiresAt: m.expiresAt,
      deletedForUsersAt: m.deletedForUsersAt,
      createdAt: m.createdAt,
      archive: m.adminArchive?.snapshot || null,
    })),
  });
});
