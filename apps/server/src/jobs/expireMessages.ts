import { prisma } from "../lib/prisma.js";
import fs from "fs";
import path from "path";
import { getUploadDir } from "../lib/media.js";

export async function expireMessages(): Promise<number> {
  const now = new Date();
  const expired = await prisma.message.findMany({
    where: {
      expiresAt: { lte: now },
      deletedForUsersAt: null,
    },
  });

  for (const msg of expired) {
    const hasArchive = await prisma.messageAdminArchive.findUnique({
      where: { messageId: msg.id },
    });
    if (!hasArchive) {
      await prisma.messageAdminArchive.create({
        data: {
          messageId: msg.id,
          snapshot: {
            content: msg.content,
            mediaPath: msg.mediaPath,
            type: msg.type,
            senderUsername: msg.senderUsername,
            expiredAt: now,
          },
        },
      });
    }

    await prisma.message.update({
      where: { id: msg.id },
      data: { deletedForUsersAt: now },
    });
  }

  const viewedSnaps = await prisma.message.findMany({
    where: {
      viewOnce: true,
      viewedAt: { not: null },
      mediaPath: { not: null },
      deletedForUsersAt: null,
      createdAt: { lt: new Date(Date.now() - 60 * 1000) },
    },
  });

  const uploadDir = getUploadDir();
  for (const msg of viewedSnaps) {
    if (msg.mediaPath) {
      const full = path.join(uploadDir, msg.mediaPath);
      if (fs.existsSync(full)) {
        try {
          fs.unlinkSync(full);
        } catch {
          /* ignore */
        }
      }
      await prisma.message.update({
        where: { id: msg.id },
        data: { mediaPath: null, deletedForUsersAt: now },
      });
    }
  }

  return expired.length + viewedSnaps.length;
}

export function startExpireJob(intervalMs = 60_000): NodeJS.Timeout {
  return setInterval(() => {
    expireMessages().catch(console.error);
  }, intervalMs);
}
