import crypto from "crypto";
import path from "path";
import fs from "fs";

export function getUploadDir(): string {
  const dir = process.env.UPLOAD_DIR || "./uploads";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function signMediaToken(filePath: string, userId: string): string {
  const secret = process.env.MEDIA_TOKEN_SECRET || process.env.JWT_SECRET || "media";
  const exp = Date.now() + 15 * 60 * 1000;
  const payload = `${filePath}:${userId}:${exp}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyMediaToken(token: string, userId: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length < 4) return null;
    const sig = parts.pop()!;
    const exp = parseInt(parts.pop()!, 10);
    const tokenUserId = parts.pop()!;
    const filePath = parts.join(":");

    if (tokenUserId !== userId && tokenUserId !== "admin") return null;
    if (Date.now() > exp) return null;

    const secret = process.env.MEDIA_TOKEN_SECRET || process.env.JWT_SECRET || "media";
    const payload = `${filePath}:${tokenUserId}:${exp}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (sig !== expected) return null;

    const fullPath = path.join(getUploadDir(), filePath);
    if (!fs.existsSync(fullPath)) return null;
    return fullPath;
  } catch {
    return null;
  }
}

export function safeFilename(original: string): string {
  const ext = path.extname(original).toLowerCase().slice(0, 10);
  return `${crypto.randomUUID()}${ext}`;
}
