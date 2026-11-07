import prisma from '../src/utils/prisma.js';

// Захист: навантажувальні дані тільки для локальної БД (не для Neon)
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '')) {
  throw new Error('seed:load працює лише з локальною БД');
}

const run = (sql) => prisma.$executeRawUnsafe(sql);

if (process.argv.includes('--clean')) {
  await run(`DELETE FROM "Lesson" WHERE topic LIKE 'load-lesson-%'`); // відвідуваність видаляється каскадом
  await run(`DELETE FROM "User" WHERE email LIKE 'load-%@example.com'`);
  await run(`DELETE FROM "Group" WHERE name LIKE 'LOAD-G-%'`);
  await run(`DELETE FROM "Subject" WHERE name LIKE 'load-subj-%'`);
  console.log('Навантажувальні дані видалено.');
} else {
  console.time('seed');
  await run(`INSERT INTO "Subject"(name) SELECT 'load-subj-' || g FROM generate_series(1, 10) g`);
  await run(`INSERT INTO "Group"(name) SELECT 'LOAD-G-' || g FROM generate_series(1, 20) g`);
  await run(`
    INSERT INTO "User"(email, password, "fullName", role)
    SELECT 'load-t-' || g || '@example.com', 'x', 'Teacher ' || g, 'TEACHER'::"Role"
    FROM generate_series(1, 5) g`);
  await run(`
    INSERT INTO "User"(email, password, "fullName", role, "groupId")
    SELECT 'load-s-' || s || '@example.com', 'x', 'Student ' || s, 'STUDENT'::"Role", grp.id
    FROM generate_series(1, 600) s
    JOIN "Group" grp ON grp.name = 'LOAD-G-' || (((s - 1) % 20) + 1)`);
  // 20 груп × 200 занять = 4000 занять за останній рік
  await run(`
    INSERT INTO "Lesson"(date, topic, "subjectId", "groupId", "teacherId")
    SELECT now() - make_interval(days => (random() * 365)::int),
           'load-lesson-' || grp.id || '-' || n,
           (SELECT id FROM "Subject" WHERE name = 'load-subj-' || (1 + (n % 10))),
           grp.id,
           (SELECT id FROM "User" WHERE email = 'load-t-' || (1 + (n % 5)) || '@example.com')
    FROM "Group" grp CROSS JOIN generate_series(1, 200) n
    WHERE grp.name LIKE 'LOAD-G-%'`);
  // кожне заняття × 30 студентів групи = 120 000 записів відвідуваності
  await run(`
    INSERT INTO "Attendance"(status, "lessonId", "studentId")
    SELECT (ARRAY['PRESENT','PRESENT','PRESENT','ABSENT','LATE','EXCUSED'])[1 + floor(random() * 6)::int]::"AttendanceStatus",
           l.id, u.id
    FROM "Lesson" l
    JOIN "User" u ON u."groupId" = l."groupId" AND u.role = 'STUDENT'
    WHERE l.topic LIKE 'load-lesson-%'`);
  await run('ANALYZE'); // оновлює статистику, за якою планувальник обирає план
  console.timeEnd('seed');
  const [{ count }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "Attendance"`;
  console.log(`Записів відвідуваності в БД: ${count}`);
}

await prisma.$disconnect();