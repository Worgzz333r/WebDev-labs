import prisma from '../src/utils/prisma.js';
import { hashPassword } from '../src/utils/password.js';

const email = process.env.ADMIN_EMAIL || 'admin@example.com';
const password = process.env.ADMIN_PASSWORD || 'admin12345';

const admin = await prisma.user.upsert({
  where: { email },
  update: { role: 'ADMIN' },
  create: {
    email,
    password: await hashPassword(password),
    fullName: 'Administrator',
    role: 'ADMIN',
  },
});

console.log(`Admin ready: ${admin.email}`);
await prisma.$disconnect();