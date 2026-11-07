import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { clearCache } from '../src/utils/cache.js';

const TAG = 'cache-test';
let auth;

const cleanup = async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: `${TAG}-` } } });
  await prisma.group.deleteMany({ where: { name: { startsWith: TAG } } });
  await prisma.subject.deleteMany({ where: { name: { startsWith: TAG } } });
};

before(async () => {
  await cleanup();
  clearCache();
  const admin = await prisma.user.create({
    data: { email: `${TAG}-admin@example.com`, password: 'x', fullName: 'admin', role: 'ADMIN' },
  });
  auth = { Authorization: `Bearer ${generateAccessToken(admin.id, 'ADMIN')}` };
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

test('предмети: повторний запит із кешу, зміна скидає кеш', async () => {
  const list = () => request(app).get(`/api/subjects?search=${TAG}`).set(auth);

  const first = await list();
  assert.equal(first.status, 200);
  assert.equal(first.headers['x-cache'], 'MISS');
  assert.equal(first.body.data.length, 0);
  assert.equal((await list()).headers['x-cache'], 'HIT');

  const created = await request(app).post('/api/subjects').set(auth).send({ name: `${TAG}-subject` });
  assert.equal(created.status, 201);
  const afterCreate = await list();
  assert.equal(afterCreate.headers['x-cache'], 'MISS');
  assert.equal(afterCreate.body.data.length, 1);

  await request(app).put(`/api/subjects/${created.body.id}`).set(auth).send({ name: `${TAG}-renamed` });
  assert.equal((await list()).body.data[0].name, `${TAG}-renamed`);

  await request(app).delete(`/api/subjects/${created.body.id}`).set(auth);
  assert.equal((await list()).body.data.length, 0);
});

test('групи: лічильник студентів не застаріває при зміні користувачів', async () => {
  const list = () => request(app).get(`/api/groups?search=${TAG}`).set(auth);

  const group = await request(app).post('/api/groups').set(auth).send({ name: `${TAG}-group` });
  assert.equal(group.status, 201);

  assert.equal((await list()).body.data[0]._count.students, 0);
  assert.equal((await list()).headers['x-cache'], 'HIT');

  const user = await request(app).post('/api/users').set(auth).send({
    email: `${TAG}-student@example.com`,
    password: 'password12345',
    fullName: 'student',
    role: 'STUDENT',
    groupId: group.body.id,
  });
  assert.equal(user.status, 201);
  const withStudent = await list();
  assert.equal(withStudent.headers['x-cache'], 'MISS');
  assert.equal(withStudent.body.data[0]._count.students, 1);

  await request(app).delete(`/api/users/${user.body.id}`).set(auth);
  assert.equal((await list()).body.data[0]._count.students, 0);
});