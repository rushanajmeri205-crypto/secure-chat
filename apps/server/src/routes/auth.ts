import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword, signToken } from "../lib/auth.js";
import { requireAuth, COOKIE_NAME } from "../middleware/requireAuth.js";
import { archiveAndDeleteUser } from "../services/userDelete.js";

const MAX_ATTEMPTS = 3;

const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(100),
});

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts, try again later" },
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { username, password } = parsed.data;
  const ip = req.ip || req.socket.remoteAddress || undefined;

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    await prisma.loginAttempt.create({
      data: { username, ip, success: false },
    });
    res.status(401).json({ error: "Invalid credentials", remaining: MAX_ATTEMPTS });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const newAttempts = user.failedLoginAttempts + 1;

    await prisma.loginAttempt.create({
      data: { userId: user.id, username, ip, success: false },
    });

    if (newAttempts >= MAX_ATTEMPTS) {
      await archiveAndDeleteUser(user.id);
      res.status(403).json({
        error: "account_deleted",
        message: "Account deleted after 3 failed login attempts",
      });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: newAttempts },
    });

    res.status(401).json({
      error: "Invalid credentials",
      remaining: MAX_ATTEMPTS - newAttempts,
    });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0 },
  });

  await prisma.loginAttempt.create({
    data: { userId: user.id, username, ip, success: true },
  });

  const token = signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: { id: user.id, username: user.username, role: user.role },
  });
});

authRouter.post("/logout", requireAuth, (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, username: true, role: true },
  });

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({ user });
});

authRouter.get("/users", requireAuth, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { role: "user", id: { not: req.user!.userId } },
    select: { id: true, username: true },
    orderBy: { username: "asc" },
  });

  res.json({ users });
});