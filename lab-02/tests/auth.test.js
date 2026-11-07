import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';

const user = {
  email: 'test@example.com',
  password: 'testpassword123',
  fullName: 'Test User',
};

describe('Authentication API', () => {
  before(() => prisma.user.deleteMany({ where: { email: user.email } }));

  after(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } });
    await prisma.$disconnect();
  });

  test('реєструє нового користувача', async () => {
    const res = await request(app).post('/api/auth/register').send(user);

    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, user.email);
    assert.equal(res.body.user.role, 'STUDENT');
    assert.ok(res.body.tokens.accessToken);
    assert.equal(res.body.user.password, undefined);
  });

  test('не реєструє користувача з існуючим email', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    assert.equal(res.status, 409);
  });

  test('не реєструє користувача з коротким паролем', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...user, email: 'test2@example.com', password: 'short' });
    assert.equal(res.status, 400);
  });

  test('role з тіла запиту ігнорується (немає ескалації прав)', async () => {
    const email = 'test-role@example.com';
    await prisma.user.deleteMany({ where: { email } });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...user, email, role: 'ADMIN' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'STUDENT');
    await prisma.user.deleteMany({ where: { email } });
  });

  test('входить із правильними даними', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });

    assert.equal(res.status, 200);
    assert.ok(res.body.tokens.accessToken);
    assert.ok(res.body.tokens.refreshToken);
  });

  test('не входить із хибним паролем', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrongpassword' });
    assert.equal(res.status, 401);
  });

  test('захищений маршрут: без токена 401, з токеном 200', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    const auth = { Authorization: `Bearer ${login.body.tokens.accessToken}` };

    assert.equal((await request(app).get('/api/groups')).status, 401);
    assert.equal((await request(app).get('/api/groups').set(auth)).status, 200);
  });

  test('авторизація: STUDENT не може створити групу (403)', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });

    const res = await request(app)
      .post('/api/groups')
      .set({ Authorization: `Bearer ${login.body.tokens.accessToken}` })
      .send({ name: 'Test group' });
    assert.equal(res.status, 403);
  });

  test('refresh: ротація токена та відкликання старого', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    const { refreshToken } = login.body.tokens;

    const first = await request(app).post('/api/auth/refresh').send({ refreshToken });
    assert.equal(first.status, 200);
    assert.notEqual(first.body.tokens.refreshToken, refreshToken);

    // Старий токен вже відкликано
    const reuse = await request(app).post('/api/auth/refresh').send({ refreshToken });
    assert.equal(reuse.status, 401);

    // Повторне використання відкликаного токена скасовує й нові токени користувача
    const afterReuse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: first.body.tokens.refreshToken });
    assert.equal(afterReuse.status, 401);
  });

  test('logout відкликає refresh токен', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    const { refreshToken } = login.body.tokens;

    assert.equal((await request(app).post('/api/auth/logout').send({ refreshToken })).status, 204);
    assert.equal((await request(app).post('/api/auth/refresh').send({ refreshToken })).status, 401);
  });

  test('change-password: зміна пароля та вхід з новим', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    const auth = { Authorization: `Bearer ${login.body.tokens.accessToken}` };
    const newPassword = 'newtestpassword456';

    const wrong = await request(app)
      .post('/api/auth/change-password')
      .set(auth)
      .send({ currentPassword: 'wrongpassword', newPassword });
    assert.equal(wrong.status, 400);

    const ok = await request(app)
      .post('/api/auth/change-password')
      .set(auth)
      .send({ currentPassword: user.password, newPassword });
    assert.equal(ok.status, 200);

    const relogin = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: newPassword });
    assert.equal(relogin.status, 200);

    // повертаємо старий пароль, щоб не зламати порядок тестів
    await request(app)
      .post('/api/auth/change-password')
      .set({ Authorization: `Bearer ${relogin.body.tokens.accessToken}` })
      .send({ currentPassword: newPassword, newPassword: user.password });
  });
});

describe('Files API', () => {
  let token;
  const fileUser = { email: 'files@example.com', password: 'testpassword123', fullName: 'Files' };
  const png = Buffer.from('89504e470d0a1a0a', 'hex');

  before(async () => {
    await prisma.user.deleteMany({ where: { email: fileUser.email } });
    const res = await request(app).post('/api/auth/register').send(fileUser);
    token = res.body.tokens.accessToken;
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { email: fileUser.email } });
    await prisma.$disconnect();
  });

  test('без токена 401', async () => {
    assert.equal((await request(app).post('/api/files/upload')).status, 401);
  });

  test('завантажує PNG, відхиляє .exe та завеликий файл, віддає і видаляє файл', async () => {
    const auth = { Authorization: `Bearer ${token}` };

    const ok = await request(app)
      .post('/api/files/upload')
      .set(auth)
      .attach('file', png, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(ok.status, 201);

    const bad = await request(app)
      .post('/api/files/upload')
      .set(auth)
      .attach('file', png, { filename: 'a.exe', contentType: 'application/x-msdownload' });
    assert.equal(bad.status, 400);

    const big = await request(app)
      .post('/api/files/upload')
      .set(auth)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'b.png', contentType: 'image/png' });
    assert.equal(big.status, 400);
    assert.equal(big.body.error, 'Файл занадто великий');

    // У вашому API GET /api/files/:id захищений, тому потрібен токен
    const get = await request(app).get(`/api/files/${ok.body.file.id}`).set(auth);
    assert.equal(get.status, 200);

    const del = await request(app).delete(`/api/files/${ok.body.file.id}`).set(auth);
    assert.equal(del.status, 200);
  });
});
