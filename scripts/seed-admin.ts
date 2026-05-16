import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@exorcise.ai";
  const password = process.env.ADMIN_PASSWORD || "ChangeThisAdminPassword123!";

  console.log(`\n👻 Exorcise AI — Admin Seed Script\n${"=".repeat(40)}\n`);

  const passwordHash = await bcryptjs.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      isAdmin: true,
      passwordHash,
      hasSetPassword: true,
      isPreRegistered: true,
      onboardingDone: true,
      emailVerified: true,
    },
    create: {
      email,
      name: "Admin",
      isAdmin: true,
      passwordHash,
      hasSetPassword: true,
      hasTotpEnabled: false,
      isPreRegistered: true,
      onboardingDone: true,
      emailVerified: true,
    },
  });

  console.log(`✅ Admin user created/updated:`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   ID: ${admin.id}`);
  console.log(`   Admin: ${admin.isAdmin}`);
  console.log(`\n⚠️  Remember to change the admin password in production!\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
