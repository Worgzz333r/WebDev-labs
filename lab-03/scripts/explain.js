import { writeFile } from 'node:fs/promises';
import prisma from '../src/utils/prisma.js';

// Використання: npm run explain -- reports/explain-before.txt (без аргументу лише друкує в консоль)
const out = [];
const log = (text) => {
  console.log(text);
  out.push(text);
};

// Тестові id беремо з навантажувальних даних (npm run seed:load)
const [{ id: studentId }] = await prisma.$queryRaw`SELECT id FROM "User" WHERE email = 'load-s-1@example.com'`;
const [{ id: groupId }] = await prisma.$queryRaw`SELECT id FROM "Group" WHERE name = 'LOAD-G-1'`;

const queries = {
  '1. Відвідуваність студента: кількість (GET /api/attendance, студент)':
    `SELECT COUNT(*) FROM "Attendance" WHERE "studentId" = ${studentId}`,
  '2. Відвідуваність студента: остання сторінка':
    `SELECT * FROM "Attendance" WHERE "studentId" = ${studentId} ORDER BY id DESC LIMIT 10`,
  '3. Заняття групи за період (GET /api/lessons?groupId=...)':
    `SELECT * FROM "Lesson" WHERE "groupId" = ${groupId} AND date >= now() - interval '60 days' ORDER BY date DESC LIMIT 10`,
  '4. Усі відсутні (GET /api/attendance?status=ABSENT)':
    `SELECT COUNT(*) FROM "Attendance" WHERE status = 'ABSENT'`,
};

for (const [title, sql] of Object.entries(queries)) {
  const rows = await prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`);
  log(`\n=== ${title}`);
  log(rows.map((r) => r['QUERY PLAN']).join('\n'));
}

if (process.argv[2]) {
  await writeFile(process.argv[2], `${out.join('\n')}\n`, 'utf8');
  console.log(`\nЗбережено: ${process.argv[2]}`);
}

await prisma.$disconnect();