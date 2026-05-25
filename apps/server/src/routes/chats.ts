import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const chatsRouter = Router();

chatsRouter.use(requireAuth);

chatsRouter.get("/", async (req, res) => {
  const userId = req.user!.userId;
  const isAdmin = req.user!.role === "admin";

  const memberships = await prisma.chatMember.findMany({
    where: isAdmin ? {} : { userId, leftAt: null },
    include: {
      chat: {
        include: {
          members: {
            include: { user: { select: { id: true, username: true } } },
          },
          messages: {
            where: isAdmin
              ? {}
              : { deletedForUsersAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const chatIds = memberships.map((m) => m.chat.id);
  const unreadCounts = await prisma.message.groupBy({
    by: ["chatId"],
    where: {
      chatId: { in: chatIds },
      senderId: { not: userId },
      deletedForUsersAt: null,
      readReceipts: { none: { userId } },
    },
    _count: { id: true },
  });
  const unreadMap = Object.fromEntries(
    unreadCounts.map((u) => [u.chatId, u._count.id])
  );

  const chats = memberships.map((m) => {
    const otherMembers = m.chat.members.filter((cm) => cm.userId !== userId && !cm.leftAt);
    const lastMsg = m.chat.messages[0];
    return {
      id: m.chat.id,
      type: m.chat.type,
      title: otherMembers.map((om) => om.user.username).join(", ") || "Chat",
      members: m.chat.members.map((cm) => ({
        userId: cm.userId,
        username: cm.user.username,
        leftAt: cm.leftAt,
      })),
      lastMessage: lastMsg
        ? {
            id: lastMsg.id,
            content: lastMsg.deletedForUsersAt ? "[Message expired]" : previewMessage(lastMsg),
            type: lastMsg.type,
            createdAt: lastMsg.createdAt,
            senderUsername: lastMsg.senderUsername,
          }
        : null,
      unreadCount: unreadMap[m.chat.id] || 0,
      leftAt: m.leftAt,
    };
  });

  res.json({ chats });
});

function previewMessage(msg: { type: string; content: string | null }): string {
  if (msg.type === "text") return msg.content || "";
  if (msg.type === "snap") return "Snap";
  return "Photo";
}

const createChatSchema = z.object({
  otherUserId: z.string().min(1),
});

chatsRouter.post("/", async (req, res) => {
  const parsed = createChatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { otherUserId } = parsed.data;
  const userId = req.user!.userId;

  if (otherUserId === userId) {
    res.status(400).json({ error: "Cannot chat with yourself" });
    return;
  }

  const other = await prisma.user.findUnique({ where: { id: otherUserId } });
  if (!other || other.role !== "user") {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const existing = await prisma.chat.findFirst({
    where: {
      type: "direct",
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: otherUserId } } },
      ],
    },
    include: { members: true },
  });

  if (existing) {
    const myMembership = existing.members.find((m) => m.userId === userId);
    if (myMembership?.leftAt) {
      await prisma.chatMember.update({
        where: { id: myMembership.id },
        data: { leftAt: null },
      });
    }
    res.json({ chat: { id: existing.id } });
    return;
  }

  const chat = await prisma.chat.create({
    data: {
      type: "direct",
      members: {
        create: [{ userId }, { userId: otherUserId }],
      },
    },
  });

  res.status(201).json({ chat: { id: chat.id } });
});

chatsRouter.post("/:id/leave", async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const membership = await prisma.chatMember.findFirst({
    where: { chatId: id, userId, leftAt: null },
  });

  if (!membership) {
    res.status(404).json({ error: "Not a member of this chat" });
    return;
  }

  await prisma.chatMember.update({
    where: { id: membership.id },
    data: { leftAt: new Date() },
  });

  res.json({ ok: true });
});
