import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { io as connect } from 'socket.io-client';
import app from '../src/app.js';
import { initSocket } from '../src/socket/index.js';
import { generateAccessToken } from '../src/utils/jwt.js';

const httpServer = createServer(app);
const io = initSocket(httpServer);
app.set('io', io);
httpServer.listen(0);
await once(httpServer, 'listening');
const url = `http://localhost:${httpServer.address().port}`;
const clients = [];

after(() => {
  clients.forEach((c) => c.close());
  io.close();
});

test('підключення без токена відхиляється', async () => {
  const client = connect(url, { auth: {}, reconnection: false });
  clients.push(client);
  const [error] = await once(client, 'connect_error');
  assert.equal(error.message, 'unauthorized');
});

test('кімнати та персональні сповіщення', async () => {
  const alice = connect(url, { auth: { token: generateAccessToken(1, 'ADMIN') } });
  const bob = connect(url, { auth: { token: generateAccessToken(2, 'STUDENT') } });
  clients.push(alice, bob);
  await Promise.all([once(alice, 'connect'), once(bob, 'connect')]);

  await alice.emitWithAck('room:join', 'lesson:7');

  // Подію в кімнату отримує лише той, хто до неї приєднався
  const got = once(alice, 'attendance:updated');
  let bobGot = false;
  bob.on('attendance:updated', () => (bobGot = true));
  io.to('lesson:7').emit('attendance:updated', { id: 5, status: 'PRESENT' });
  const [payload] = await got;
  assert.deepEqual(payload, { id: 5, status: 'PRESENT' });

  // Персональне сповіщення отримує лише власник
  const personal = once(bob, 'notification');
  io.to('user:2').emit('notification', { text: 'привіт' });
  assert.deepEqual((await personal)[0], { text: 'привіт' });
  assert.equal(bobGot, false);
});

test('студент не може приєднатися до чужої кімнати', async () => {
  const student = connect(url, { auth: { token: generateAccessToken(999999, 'STUDENT') } });
  clients.push(student);
  await once(student, 'connect');

  assert.deepEqual(await student.emitWithAck('room:join', 'group:1'), { ok: false, error: 'forbidden' });
  assert.deepEqual(await student.emitWithAck('room:join', 'user:1'), { ok: false, error: 'forbidden' });
  assert.deepEqual(await student.emitWithAck('room:join', 'що-завгодно'), { ok: false, error: 'forbidden' });
});