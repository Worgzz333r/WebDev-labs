import { once } from 'node:events';
import { io as connect } from 'socket.io-client';

const base = process.argv[2];
if (!base) throw new Error('Використання: node --env-file=.env scripts/smoke.js <URL сервера>');

const tag = `smoke-${Date.now()}`;
const wait = (socket, event) => once(socket, event, { signal: AbortSignal.timeout(90000) });

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

const step = (msg) => console.log(`✓ ${msg}`);
const created = {};
const sockets = [];

try {
  const t0 = Date.now();
  const admin = await api('POST', '/api/auth/login', null, {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  const token = admin.tokens.accessToken;
  step(`вхід адміна (${Date.now() - t0} мс, включно з можливим холодним стартом)`);

  created.group = (await api('POST', '/api/groups', token, { name: tag })).id;
  created.subject = (await api('POST', '/api/subjects', token, { name: tag })).id;
  const student = await api('POST', '/api/auth/register', null, {
    email: `${tag}@example.com`,
    password: 'smoke-password-123',
    fullName: 'Smoke Student',
    groupId: created.group,
  });
  created.student = student.user.id;
  step('створено тестову групу, предмет і студента');

  const open = async (accessToken) => {
    const s = connect(base, { auth: { token: accessToken } });
    sockets.push(s);
    await wait(s, 'connect');
    return s;
  };
  const adminSocket = await open(token);
  const studentSocket = await open(student.tokens.accessToken);
  step('обидва WebSocket-з\'єднання встановлено');

  const lessonEvent = wait(adminSocket, 'lesson:created');
  const lessonNote = wait(studentSocket, 'notification');
  const lesson = await api('POST', '/api/lessons', token, {
    date: new Date().toISOString(),
    topic: tag,
    subjectId: created.subject,
    groupId: created.group,
    teacherId: admin.user.id,
  });
  created.lesson = lesson.id;
  await lessonEvent;
  const [note] = await lessonNote;
  step(`заняття створено: подія lesson:created і сповіщення «${note.title}» отримано`);

  await adminSocket.emitWithAck('room:join', `lesson:${lesson.id}`);
  const attEvent = wait(studentSocket, 'attendance:created');
  await api('POST', '/api/attendance', token, {
    lessonId: lesson.id,
    studentId: created.student,
    status: 'ABSENT',
  });
  const [att] = await attEvent;
  step(`студент отримав attendance:created зі статусом ${att.status}`);
  console.log('\nУсе працює.');
} catch (err) {
  console.error('✗', err.message);
  process.exitCode = 1;
} finally {
  sockets.forEach((s) => s.close());
  // Прибирання (заняття першим, воно каскадом видаляє відвідуваність)
  try {
    const { tokens } = await api('POST', '/api/auth/login', null, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    const t = tokens.accessToken;
    if (created.lesson) await api('DELETE', `/api/lessons/${created.lesson}`, t);
    if (created.student) await api('DELETE', `/api/users/${created.student}`, t);
    if (created.subject) await api('DELETE', `/api/subjects/${created.subject}`, t);
    if (created.group) await api('DELETE', `/api/groups/${created.group}`, t);
    console.log('Тестові дані видалено.');
  } catch (e) {
    console.error('Прибирання не вдалося:', e.message);
  }
}