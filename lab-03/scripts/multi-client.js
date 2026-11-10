// scripts/multi-client.js
// Перевірка реального часу з кількома одночасними клієнтами (для розгорнутого застосунку).
// Запуск: node --env-file=.env scripts/multi-client.js https://webdev-labs-omr1.onrender.com [кількість студентів]
import { io as connect } from 'socket.io-client';

const base = process.argv[2];
if (!base) throw new Error('Використання: node --env-file=.env scripts/multi-client.js <URL> [N]');
const N = Number(process.argv[3] ?? 5);

const tag = `multi-${Date.now()}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = (msg) => console.log(`✓ ${msg}`);
const check = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function api(method, path, token, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

// Підключає клієнта й збирає всі його події (назва, payload, seq)
function open(token) {
  const socket = connect(base, { auth: { token }, reconnection: false });
  const log = [];
  socket.onAny((type, payload, meta) => log.push({ type, payload, seq: meta?.seq }));
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve({ socket, log }));
    socket.once('connect_error', reject);
  });
}

const created = { students: [] };
const clients = [];

try {
  const t0 = Date.now();
  const admin = await api('POST', '/api/auth/login', null, {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  const token = admin.tokens.accessToken;
  step(`вхід адміна (${Date.now() - t0} мс)`);

  created.group = (await api('POST', '/api/groups', token, { name: tag })).id;
  created.subject = (await api('POST', '/api/subjects', token, { name: tag })).id;
  const students = [];
  for (let i = 0; i < N; i++) {
    const s = await api('POST', '/api/auth/register', null, {
      email: `${tag}-${i}@example.com`,
      password: 'multi-password-123',
      fullName: `Multi Student ${i}`,
      groupId: created.group,
    });
    created.students.push(s.user.id);
    students.push(s);
  }
  step(`створено групу, предмет і ${N} студентів`);

  // Усі клієнти підключаються одночасно
  const t1 = Date.now();
  const [adminC, ...studentCs] = await Promise.all([
    open(token),
    ...students.map((s) => open(s.tokens.accessToken)),
  ]);
  clients.push(adminC, ...studentCs);
  step(`${N + 1} одночасних WebSocket-з'єднань за ${Date.now() - t1} мс`);

  await sleep(500);
  const { online } = await adminC.socket.emitWithAck('presence:list');
  check(
    created.students.every((id) => online.includes(id)),
    'presence:list не містить усіх студентів',
  );
  step('presence:list: усі студенти онлайн');

  // Заняття: усі студенти групи отримують подію й сповіщення
  const lesson = await api('POST', '/api/lessons', token, {
    date: new Date().toISOString(),
    topic: tag,
    subjectId: created.subject,
    groupId: created.group,
    teacherId: admin.user.id,
  });
  created.lesson = lesson.id;
  await sleep(1500);
  for (const [i, c] of studentCs.entries()) {
    check(c.log.some((e) => e.type === 'lesson:created'), `студент ${i}: немає lesson:created`);
    check(c.log.some((e) => e.type === 'notification'), `студент ${i}: немає сповіщення`);
  }
  step(`усі ${N} студентів отримали lesson:created і сповіщення`);

  // Відвідуваність: кожен студент бачить лише свою відмітку
  await adminC.socket.emitWithAck('room:join', `lesson:${lesson.id}`);
  const statuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
  const records = await Promise.all(
    created.students.map((studentId, i) =>
      api('POST', '/api/attendance', token, {
        lessonId: lesson.id,
        studentId,
        status: statuses[i % statuses.length],
      }),
    ),
  );
  await sleep(1500);
  for (const [i, c] of studentCs.entries()) {
    const own = c.log.filter((e) => e.type === 'attendance:created');
    check(own.length === 1, `студент ${i}: отримав ${own.length} подій attendance:created замість 1`);
    check(own[0].payload.studentId === created.students[i], `студент ${i} отримав чужу відмітку`);
  }
  const adminSeen = adminC.log.filter((e) => e.type === 'attendance:created').length;
  check(adminSeen === N, `викладач отримав ${adminSeen} подій замість ${N}`);
  step(`кожен студент отримав рівно одну власну відмітку, викладач бачить усі ${N}`);

  // Відновлення пропущених подій: студент 0 відключається, відмітку змінюють, він повертається
  const lastSeq = studentCs[0].log.filter((e) => e.seq).at(-1).seq;
  studentCs[0].socket.close();
  await sleep(500);
  await api('PUT', `/api/attendance/${records[0].id}`, token, { status: 'ABSENT', comment: 'пропущено офлайн' });
  const back = await open(students[0].tokens.accessToken);
  clients.push(back);
  const missed = await back.socket.emitWithAck('events:since', lastSeq);
  check(missed.ok && missed.events.some((e) => e.type === 'attendance:updated'), 'пропущену подію не відновлено');
  step(`після перепідключення отримано пропущені події (${missed.events.length}), gap=${missed.gap}`);

  console.log('\nУсе працює.');
} catch (err) {
  console.error('✗', err.message);
  process.exitCode = 1;
} finally {
  clients.forEach((c) => c.socket.close());
  try {
    const { tokens } = await api('POST', '/api/auth/login', null, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    const t = tokens.accessToken;
    if (created.lesson) await api('DELETE', `/api/lessons/${created.lesson}`, t);
    for (const id of created.students) await api('DELETE', `/api/users/${id}`, t);
    if (created.subject) await api('DELETE', `/api/subjects/${created.subject}`, t);
    if (created.group) await api('DELETE', `/api/groups/${created.group}`, t);
    console.log('Тестові дані видалено.');
  } catch (e) {
    console.error('Прибирання не вдалося:', e.message);
  }
}