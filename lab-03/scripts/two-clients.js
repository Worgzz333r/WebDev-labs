import { io } from 'socket.io-client';

const BASE = 'http://localhost:3000';
const LESSON_ID = 4048;
const ATTENDANCE_ID = 120103; // id з відповіді redis-check

async function login(email) {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test1234!' }),
  });
  const d = await r.json();
  return d.tokens?.accessToken ?? d.tokens?.access;
}

const studentToken = await login('student@test.com');
const teacherToken = await login('teacher@test.com');

const student = io(BASE, { auth: { token: studentToken } });
const teacher = io(BASE, { auth: { token: teacherToken } });
await Promise.all([new Promise((r) => student.on('connect', r)), new Promise((r) => teacher.on('connect', r))]);
console.log('✓ підключено двох клієнтів: студент і викладач');

await teacher.emitWithAck('room:join', `lesson:${LESSON_ID}`);

student.on('attendance:updated', (p) => console.log('СТУДЕНТ отримав attendance:updated:', p.status));
teacher.on('attendance:updated', (p) => console.log('ВИКЛАДАЧ отримав attendance:updated:', p.status));

const r = await fetch(`${BASE}/api/attendance/${ATTENDANCE_ID}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
  body: JSON.stringify({ status: 'ABSENT' }),
});
console.log('PUT →', r.status);

setTimeout(() => process.exit(0), 1500);