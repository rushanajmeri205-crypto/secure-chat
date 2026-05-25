import { prisma } from "../lib/prisma.js";
import fs from "fs";
import path from "path";
import { getUploadDir } from "../lib/media.js";

export async function archiveAndDeleteUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      sentMessages: { include: { adminArchive: true } },
    },
  });
  if (!user) return;

  await prisma.$transaction(async (tx) => {
    for (const msg of user.sentMessages) {
      if (!msg.adminArchive) {
        await tx.messageAdminArchive.create({
          data: {
            messageId: msg.id,
            snapshot: {
              content: msg.content,
              mediaPath: msg.mediaPath,
              type: msg.type,
              senderUsername: user.username,
              viewOnce: msg.viewOnce,
              createdAt: msg.createdAt,
            },
          },
        });
      }
      await tx.message.update({
        where: { id: msg.id },
        data: { senderId: null, senderUsername: user.username },
      });
    }

    const mediaPaths = user.sentMessages
      .map((m) => m.mediaPath)
      .filter((p): p is string => !!p);

    await tx.chatMember.deleteMany({ where: { userId } });
    await tx.messageRead.deleteMany({ where: { userId } });
    await tx.loginAttempt.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });

    const uploadDir = getUploadDir();
    for (const mp of mediaPaths) {
      const full = path.join(uploadDir, mp);
      if (fs.existsSync(full)) {
        try {
          fs.unlinkSync(full);
        } catch {
          /* ignore */
        }
      }
    }
  });
}
