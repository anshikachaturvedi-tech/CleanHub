import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("cleanhub", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash,
      role: "admin",
      displayName: "Demo Admin",
    },
    create: {
      username: "admin",
      passwordHash,
      role: "admin",
      displayName: "Demo Admin",
      email: null,
      phone: null,
    },
  });
  console.log('Seeded demo admin: username "admin", password "cleanhub"');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
