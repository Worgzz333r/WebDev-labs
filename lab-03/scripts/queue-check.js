import { io } from 'socket.io-client';

const BASE = 'http://localhost:3000';
const LESSON_ID = 4048; // існуюче заняття з seed-test, з нього беремо subjectId/groupId/teacherId

async function login(creds) {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });
  const { tokens } = await r.json();
  return tokens.accessToken ?? tokens.access;
}

const studentToken = await login({ email: 'student@test.com', password: 'Test1234!' });
const teacherToken = await login({ email: 'teacher@test.com', password: 'Test1234!' });
const auth = { Authorization: `Bearer ${teacherToken}`, 'Content-Type': 'application/json' };

const base = await (await fetch(`${BASE}/api/lessons/${LESSON_ID}`, { headers: auth })).json();

const socket = io(BASE, { auth: { token: studentToken } });
socket.on('connect_error', (e) => { console.log('connect_error:', e.message); process.exit(1); });

socket.on('notification', (n) => {
  console.log('✅ сповіщення прийшло через чергу:', n.title);
  process.exit(0);
});

socket.on('connect', async () => {
  const r = await fetch(`${BASE}/api/lessons`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      date: new Date().toISOString(),
      topic: 'queue-test',
      subjectId: base.subjectId,
      groupId: base.groupId,
      teacherId: base.teacherId,
    }),
  });
  console.log('POST /api/lessons →', r.status);
});

setTimeout(() => { console.log('❌ сповіщення не прийшло'); process.exit(1); }, 8000);