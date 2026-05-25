import "dotenv/config";
import { prisma } from "./lib/prisma.js";
import { hashPassword } from "./lib/auth.js";

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existing = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!existing) {
    const passwordHash = await hashPassword(adminPassword);
    await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash,
        role: "admin",
      },
    });
    console.log(`Admin created: ${adminUsername}`);
  } else {
    console.log(`Admin already exists: ${existing.username}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
