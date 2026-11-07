import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';

const TAG = 'rep-test';
let teacher;
let group;
let auth;

const cleanup = async () => {
  await prisma.lesson.deleteMany({ where: { topic: TAG } });
  await prisma.user.deleteMany({ where: { email: { startsWith: `${TAG}-` } } });
  await prisma.group.deleteMany({ where: { name: { startsWith: TAG } } });
  await prisma.subject.deleteMany({ where: { name: { startsWith: TAG } } });
};

before(async () => {
  await cleanup();
  group = await prisma.group.create({ data: { name: `${TAG}-group` } });
  const subject = await prisma.subject.create({ data: { name: `${TAG}-subject` } });
  const mk = (name, role, groupId) =>
    prisma.user.create({
      data: { email: `${TAG}-${name}@example.com`, password: 'x', fullName: name, role, groupId },
    });
  teacher = await mk('teacher', 'TEACHER');
  const a = await mk('a-student', 'STUDENT', group.id);
  const b = await mk('b-student', 'STUDENT', group.id);
  await mk('c-student', 'STUDENT', group.id); // без жодного запису відвідуваності

  const lesson = (day) =>
    prisma.lesson.create({
      data: {
        date: new Date(`2026-10-0${day}T09:00:00Z`),
        topic: TAG,
        subjectId: subject.id,
        groupId: group.id,
        teacherId: teacher.id,
      },
    });
  const [l1, l2] = [await lesson(1), await lesson(2)];

  await prisma.attendance.createMany({
    data: [
      { lessonId: l1.id, studentId: a.id, status: 'PRESENT' },
      { lessonId: l2.id, studentId: a.id, status: 'LATE' },
      { lessonId: l1.id, studentId: b.id, status: 'ABSENT' },
      { lessonId: l2.id, studentId: b.id, status: 'ABSENT' },
    ],
  });
  auth = { Authorization: `Bearer ${generateAccessToken(teacher.id, 'TEACHER')}` };
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

test('зведення відвідуваності: підрахунок статусів і відсотка', async () => {
  const res = await request(app).get(`/api/reports/attendance-summary?groupId=${group.id}`).set(auth);
  assert.equal(res.status, 200);
  const [a, b, c] = res.body.data;

  assert.deepEqual(
    { total: a.total, present: a.present, late: a.late, absent: a.absent, pct: a.attendancePercent },
    { total: 2, present: 1, late: 1, absent: 0, pct: 100 },
  );
  assert.deepEqual(
    { total: b.total, absent: b.absent, pct: b.attendancePercent },
    { total: 2, absent: 2, pct: 0 },
  );
  // студент без записів: нулі, а відсотка немає (не ділимо на нуль)
  assert.deepEqual({ total: c.total, pct: c.attendancePercent }, { total: 0, pct: null });
});

test('зведення: фільтр за датою обмежує заняття', async () => {
  const res = await request(app)
    .get(`/api/reports/attendance-summary?groupId=${group.id}&dateFrom=2026-10-02`)
    .set(auth);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.map((s) => s.total), [1, 1, 0]);
});

test('зведення: валідація та права', async () => {
  const noGroup = await request(app).get('/api/reports/attendance-summary').set(auth);
  assert.equal(noGroup.status, 400);

  const badDate = await request(app)
    .get(`/api/reports/attendance-summary?groupId=${group.id}&dateFrom=not-a-date`)
    .set(auth);
  assert.equal(badDate.status, 400);

  assert.equal((await request(app).get(`/api/reports/attendance-summary?groupId=${group.id}`)).status, 401);

  const student = { Authorization: `Bearer ${generateAccessToken(teacher.id, 'STUDENT')}` };
  const forbidden = await request(app).get(`/api/reports/attendance-summary?groupId=${group.id}`).set(student);
  assert.equal(forbidden.status, 403);
});