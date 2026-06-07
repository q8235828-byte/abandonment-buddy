const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  const email = 'qa034942@gmail.com';
  const password = 'Qa034942@#$';
  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { isAdmin: true },
    create: { email, password: hash, fullName: 'Admin', isAdmin: true },
  });

  console.log('Admin ready:', user.email);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
