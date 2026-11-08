// scripts/redis-check.js
import { io } from 'socket.io-client';

const A = 'http://localhost:3000'; // студент слухає тут
const B = 'http://localhost:3001'; // викладач пише сюди

// ЗМІНИ під свою БД і API
const STUDENT = { email: 'student@test.com', password: 'Test1234!' };
const TEACHER = { email: 'teacher@test.com', password: 'Test1234!' };
const LOGIN_PATH = '/api/auth/login';
const LESSON_ID = 4048;
const STUDENT_ID = 1133;
const STATUS = 'PRESENT';

async function login(base, creds) {
  const r = await fetch(base + LOGIN_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });
  const data = await r.json();
  console.log('login:', r.status, Object.keys(data));
  return data.tokens?.accessToken ?? data.tokens?.access;
}

const studentToken = await login(A, STUDENT);
const teacherToken = await login(B, TEACHER);

const socket = io(A, { auth: { token: studentToken } });
socket.on('connect_error', (e) => { console.log('connect_error:', e.message); process.exit(1); });

socket.on('connect', async () => {
  console.log('студент підключений до :3000');
  const r = await fetch(B + '/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({ lessonId: LESSON_ID, studentId: STUDENT_ID, status: STATUS }),
  });
  console.log('POST на :3001 →', r.status);
});

socket.on('attendance:created', (p) => {
  console.log('✅ подія дійшла між інстансами:', p);
  process.exit(0);
});

setTimeout(() => { console.log('❌ подія не прийшла'); process.exit(1); }, 30000);