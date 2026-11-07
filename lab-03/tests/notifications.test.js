import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';

const TAG = 'nt-test';
const bearer = (user) => ({ Authorization: `Bearer ${generateAccessToken(user.id, user.role)}` });

let alice;
let bob;
let aliceNotes;
let bobNote;

const cleanup = () =>
  prisma.user.deleteMany({ where: { email: { startsWith: `${TAG}-` } } });

before(async () => {
  await cleanup();
  const mk = (name) =>
    prisma.user.create({
      data: { email: `${TAG}-${name}@example.com`, password: 'x', fullName: name, role: 'STUDENT' },
    });
  alice = await mk('alice');
  bob = await mk('bob');

  const note = (userId, i, type = 'ATTENDANCE') =>
    prisma.notification.create({
      data: { userId, type, title: `Сповіщення ${i}`, body: 'тіло' },
    });
  aliceNotes = [await note(alice.id, 1), await note(alice.id, 2), await note(alice.id, 3, 'LESSON')];
  bobNote = await note(bob.id, 1);
});

after(async () => {
  await cleanup(); // сповіщення видаляються каскадом
  await prisma.$disconnect();
});

test('без токена 401', async () => {
  assert.equal((await request(app).get('/api/notifications')).status, 401);
});

test('користувач бачить лише свої сповіщення, нові першими, з лічильником', async () => {
  const res = await request(app).get('/api/notifications').set(bearer(alice));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 3);
  assert.equal(res.body.unreadCount, 3);
  assert.ok(res.body.data.every((n) => n.userId === alice.id));
  assert.equal(res.body.data[0].id, aliceNotes[2].id);
});

test('фільтри type, unread та некоректний type (400)', async () => {
  const byType = await request(app).get('/api/notifications?type=LESSON').set(bearer(alice));
  assert.equal(byType.body.data.length, 1);

  const bad = await request(app).get('/api/notifications?type=NOPE').set(bearer(alice));
  assert.equal(bad.status, 400);
});

test('позначення прочитаним: своє 200 (повторно теж), чуже 404', async () => {
  const id = aliceNotes[0].id;
  const first = await request(app).patch(`/api/notifications/${id}/read`).set(bearer(alice));
  assert.equal(first.status, 200);
  assert.ok(first.body.readAt);

  const again = await request(app).patch(`/api/notifications/${id}/read`).set(bearer(alice));
  assert.equal(again.status, 200);

  const foreign = await request(app).patch(`/api/notifications/${bobNote.id}/read`).set(bearer(alice));
  assert.equal(foreign.status, 404);

  const unread = await request(app).get('/api/notifications?unread=true').set(bearer(alice));
  assert.equal(unread.body.data.length, 2);
  assert.equal(unread.body.unreadCount, 2);
});

test('read-all позначає лише мої', async () => {
  const res = await request(app).patch('/api/notifications/read-all').set(bearer(alice));
  assert.equal(res.status, 200);
  assert.equal(res.body.updated, 2);

  // сповіщення Боба не зачеплено
  const bobList = await request(app).get('/api/notifications').set(bearer(bob));
  assert.equal(bobList.body.unreadCount, 1);
});

test('видалення: своє 204, чуже 404, повторно 404, невалідний id 400', async () => {
  const id = aliceNotes[1].id;
  assert.equal((await request(app).delete(`/api/notifications/${id}`).set(bearer(alice))).status, 204);
  assert.equal((await request(app).delete(`/api/notifications/${id}`).set(bearer(alice))).status, 404);
  assert.equal((await request(app).delete(`/api/notifications/${bobNote.id}`).set(bearer(alice))).status, 404);
  assert.equal((await request(app).delete('/api/notifications/abc').set(bearer(alice))).status, 400);
});