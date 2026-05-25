import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import { verifyToken } from "../lib/auth.js";
import { COOKIE_NAME } from "../middleware/requireAuth.js";
import { prisma } from "../lib/prisma.js";

export function setupSocket(httpServer: HttpServer): Server {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  const io = new Server(httpServer, {
    cors: {
      origin: clientUrl,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const req = socket.request as { headers?: { cookie?: string } };
    const cookies = parseCookies(req.headers?.cookie || "");
    const token = cookies[COOKIE_NAME];
    if (!token) {
      next(new Error("Unauthorized"));
      return;
    }
    const payload = verifyToken(token);
    if (!payload) {
      next(new Error("Unauthorized"));
      return;
    }
    socket.data.user = payload;
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as { userId: string; username: string; role: string };
    socket.join(`user:${user.userId}`);

    socket.on("join_chat", async (chatId: string) => {
      if (user.role === "admin") {
        socket.join(`chat:${chatId}`);
        return;
      }
      const member = await prisma.chatMember.findFirst({
        where: { chatId, userId: user.userId, leftAt: null },
      });
      if (member) socket.join(`chat:${chatId}`);
    });

    socket.on("leave_chat", (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on("typing", ({ chatId, isTyping }: { chatId: string; isTyping: boolean }) => {
      socket.to(`chat:${chatId}`).emit("typing", {
        chatId,
        userId: user.userId,
        username: user.username,
        isTyping,
      });
    });
  });

  return io;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(";").reduce(
    (acc, part) => {
      const [key, ...rest] = part.trim().split("=");
      if (key) acc[key] = rest.join("=");
      return acc;
    },
    {} as Record<string, string>
  );
}
