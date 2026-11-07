import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { io as connect } from 'socket.io-client';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';
import { initSocket } from '../src/socket/index.js';
import { generateAccessToken } from '../src/utils/jwt.js';

const TAG = 'sk-test';
const httpServer = createServer(app);
const io = initSocket(httpServer);
app.set('io', io);
httpServer.listen(0);
await once(httpServer, 'listening');
const url = `http://localhost:${httpServer.address().port}`;
const clients = [];

const cleanup = () =>
  prisma.user.deleteMany({ where: { email: { startsWith: `${TAG}-` } } });
const mk = (name, role) =>
  prisma.user.create({
    data: { email: `${TAG}-${name}@example.com`, password: 'x', fullName: name, role },
  });

let alice;
let bob;
let loner;

before(async () => {
  await cleanup();
  alice = await mk('alice', 'ADMIN');
  bob = await mk('bob', 'STUDENT');
  loner = await mk('loner', 'STUDENT');
});

after(async () => {
  clients.forEach((c) => c.close());
  io.close();
  await cleanup();
  await prisma.$disconnect();
});

test('підключення без токена відхиляється', async () => {
  const client = connect(url, { auth: {}, reconnection: false });
  clients.push(client);
  const [error] = await once(client, 'connect_error');
  assert.equal(error.message, 'unauthorized');
});

test('токен видаленого користувача відхиляється', async () => {
  const ghost = await mk('ghost', 'STUDENT');
  const token = generateAccessToken(ghost.id, 'STUDENT');
  await prisma.user.delete({ where: { id: ghost.id } });

  const client = connect(url, { auth: { token }, reconnection: false });
  clients.push(client);
  const [error] = await once(client, 'connect_error');
  assert.equal(error.message, 'unauthorized');
});

test('кімнати та персональні сповіщення', async () => {
  const a = connect(url, { auth: { token: generateAccessToken(alice.id, 'ADMIN') } });
  const b = connect(url, { auth: { token: generateAccessToken(bob.id, 'STUDENT') } });
  clients.push(a, b);
  await Promise.all([once(a, 'connect'), once(b, 'connect')]);

  await a.emitWithAck('room:join', 'lesson:7');

  // Подію в кімнату отримує лише той, хто до неї приєднався
  const got = once(a, 'attendance:updated');
  let bobGot = false;
  b.on('attendance:updated', () => (bobGot = true));
  io.to('lesson:7').emit('attendance:updated', { id: 5, status: 'PRESENT' });
  const [payload] = await got;
  assert.deepEqual(payload, { id: 5, status: 'PRESENT' });

  // Персональне сповіщення отримує лише власник
  const personal = once(b, 'notification');
  io.to(`user:${bob.id}`).emit('notification', { text: 'привіт' });
  assert.deepEqual((await personal)[0], { text: 'привіт' });
  assert.equal(bobGot, false);
});

test('студент не може приєднатися до чужої кімнати', async () => {
  const student = connect(url, { auth: { token: generateAccessToken(loner.id, 'STUDENT') } });
  clients.push(student);
  await once(student, 'connect');

  assert.deepEqual(await student.emitWithAck('room:join', 'group:1'), { ok: false, error: 'forbidden' });
  assert.deepEqual(await student.emitWithAck('room:join', 'user:1'), { ok: false, error: 'forbidden' });
  assert.deepEqual(await student.emitWithAck('room:join', 'що-завгодно'), { ok: false, error: 'forbidden' });
});