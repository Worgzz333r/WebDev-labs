// scripts/seed-test.js
import argon2 from 'argon2';
import prisma from '../src/utils/prisma.js';

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '')) {
  throw new Error('Тільки для локальної БД');
}

const password = await argon2.hash('Test1234!');

const group = await prisma.group.create({ data: { name: 'TEST-1' } });
const subject = await prisma.subject.create({ data: { name: 'test-subject' } });
const teacher = await prisma.user.create({
  data: { email: 'teacher@test.com', password, fullName: 'Test Teacher', role: 'TEACHER' },
});
const student = await prisma.user.create({
  data: { email: 'student@test.com', password, fullName: 'Test Student', role: 'STUDENT', groupId: group.id },
});
const lesson = await prisma.lesson.create({
  data: { date: new Date(), topic: 'test-lesson', subjectId: subject.id, groupId: group.id, teacherId: teacher.id },
});

console.log({ studentId: student.id, lessonId: lesson.id });
await prisma.$disconnect();