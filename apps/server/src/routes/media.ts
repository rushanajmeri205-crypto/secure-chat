import { Router } from "express";
import multer from "multer";
import path from "path";
import { requireAuth } from "../middleware/requireAuth.js";
import { getUploadDir, safeFilename, verifyMediaToken } from "../lib/media.js";
import { prisma } from "../lib/prisma.js";

export const mediaRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadDir());
  },
  filename: (_req, file, cb) => {
    cb(null, safeFilename(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"));
    }
  },
});

mediaRouter.post("/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  res.json({ mediaPath: req.file.filename });
});

mediaRouter.get("/:token", requireAuth, (req, res) => {
  const userId = req.user!.role === "admin" ? "admin" : req.user!.userId;
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const filePath = verifyMediaToken(token, userId);

  if (!filePath) {
    res.status(403).json({ error: "Invalid or expired media token" });
    return;
  }

  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(filePath);
});

mediaRouter.post("/capture-event", requireAuth, async (req, res) => {
  const { chatId, eventType } = req.body as { chatId?: string; eventType?: string };
  await prisma.captureEvent.create({
    data: {
      userId: req.user!.userId,
      chatId: chatId || null,
      eventType: eventType || "possible_capture",
    },
  });
  res.json({ ok: true });
});
