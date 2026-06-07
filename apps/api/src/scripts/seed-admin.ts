/**
 * Run once to create the admin account.
 * Usage: npx ts-node -r tsconfig-paths/register src/scripts/seed-admin.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const prisma = new PrismaClient();

  const email    = 'qa034942@gmail.com';
  const password = 'Qa034942@#$';

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Update to ensure isAdmin is true
    await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
    });
    console.log(`✅ Admin account already exists — marked as admin: ${email}`);
  } else {
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email, password: hashed, fullName: 'Admin', isAdmin: true },
    });
    console.log(`✅ Admin account created: ${email}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
