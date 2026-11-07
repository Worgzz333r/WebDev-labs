import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';
import { generateTotp } from '../src/utils/totp.js';

const PASSWORD = 'testpassword123';
const PREFIX = 'lab02-test-subj-';
const png = Buffer.from('89504e470d0a1a0a', 'hex');

const users = {
  admin: { email: 'feat-admin@example.com', password: PASSWORD, fullName: 'Feat Admin' },
  student: { email: 'feat-student@example.com', password: PASSWORD, fullName: 'Feat Student' },
  tfa: { email: 'feat-2fa@example.com', password: PASSWORD, fullName: 'Feat 2FA' },
  upload: { email: 'feat-upload@example.com', password: PASSWORD, fullName: 'Feat Upload' },
  fileOwner: { email: 'feat-fowner@example.com', password: PASSWORD, fullName: 'File Owner' },
  fileOther: { email: 'feat-fother@example.com', password: PASSWORD, fullName: 'File Other' },
  fileAdmin: { email: 'feat-fadmin@example.com', password: PASSWORD, fullName: 'File Admin' },
};

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const login = (user, extra = {}) =>
  request(app).post('/api/auth/login').send({ email: user.email, password: user.password, ...extra });

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: Object.values(users).map((u) => u.email) } } });
  await prisma.subject.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

// Один відступ на весь файл: після останнього тесту прибираємо дані й закриваємо з'єднання
after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('Ролі, пагінація, пошук і сортування', () => {
  let adminToken;
  let studentToken;

  before(async () => {
    await cleanup();

    await request(app).post('/api/auth/register').send(users.admin);
    // Публічна реєстрація створює лише STUDENT, тому роль ADMIN призначаємо напряму в БД
    await prisma.user.update({ where: { email: users.admin.email }, data: { role: 'ADMIN' } });
    adminToken = (await login(users.admin)).body.tokens.accessToken;

    const student = await request(app).post('/api/auth/register').send(users.student);
    studentToken = student.body.tokens.accessToken;

    for (let i = 1; i <= 5; i += 1) {
      const res = await request(app)
        .post('/api/subjects')
        .set(bearer(adminToken))
        .send({ name: `${PREFIX}${i}` });
      assert.equal(res.status, 201);
    }
  });

  test('без токена 401', async () => {
    assert.equal((await request(app).get('/api/subjects')).status, 401);
  });

  test('STUDENT не створює предмет (403), ADMIN створює (201)', async () => {
    const denied = await request(app)
      .post('/api/subjects')
      .set(bearer(studentToken))
      .send({ name: `${PREFIX}denied` });
    assert.equal(denied.status, 403);

    const ok = await request(app)
      .post('/api/subjects')
      .set(bearer(adminToken))
      .send({ name: `${PREFIX}extra` });
    assert.equal(ok.status, 201);
  });

  test('STUDENT не бачить список користувачів (403), ADMIN бачить (200)', async () => {
    assert.equal((await request(app).get('/api/users').set(bearer(studentToken))).status, 403);
    assert.equal((await request(app).get('/api/users').set(bearer(adminToken))).status, 200);
  });

  test('пагінація: сторінки, totalPages, hasMore', async () => {
    const auth = bearer(studentToken);
    const first = await request(app)
      .get(`/api/subjects?search=${PREFIX}&limit=2&page=1&sortBy=name&order=asc`)
      .set(auth);

    assert.equal(first.status, 200);
    assert.equal(first.body.data.length, 2);
    assert.equal(first.body.pagination.limit, 2);
    assert.equal(first.body.pagination.total, 6); // 5 + extra із попереднього тесту
    assert.equal(first.body.pagination.totalPages, 3);
    assert.equal(first.body.pagination.hasMore, true);

    const last = await request(app)
      .get(`/api/subjects?search=${PREFIX}&limit=2&page=3&sortBy=name&order=asc`)
      .set(auth);
    assert.equal(last.body.data.length, 2);
    assert.equal(last.body.pagination.hasMore, false);
  });

  test('limit обмежується зверху (100), некоректні значення замінюються типовими', async () => {
    const auth = bearer(studentToken);

    const big = await request(app).get('/api/subjects?limit=100000').set(auth);
    assert.equal(big.body.pagination.limit, 100);

    const bad = await request(app).get('/api/subjects?page=abc&limit=xyz').set(auth);
    assert.equal(bad.status, 200);
    assert.equal(bad.body.pagination.page, 1);
    assert.equal(bad.body.pagination.limit, 10);
  });

  test('пошук без урахування регістру', async () => {
    const res = await request(app)
      .get(`/api/subjects?search=${PREFIX.toUpperCase()}3`)
      .set(bearer(studentToken));

    assert.equal(res.status, 200);
    assert.equal(res.body.pagination.total, 1);
    assert.equal(res.body.data[0].name, `${PREFIX}3`);
  });

  test('сортування: asc і desc, невідоме поле ігнорується', async () => {
    const auth = bearer(studentToken);
    const base = `/api/subjects?search=${PREFIX}&limit=100`;

    const asc = await request(app).get(`${base}&sortBy=name&order=asc`).set(auth);
    const desc = await request(app).get(`${base}&sortBy=name&order=desc`).set(auth);
    assert.equal(asc.body.data[0].name, `${PREFIX}1`);
    assert.equal(desc.body.data[0].name, `${PREFIX}extra`);

    const unknown = await request(app).get(`${base}&sortBy=password;DROP`).set(auth);
    assert.equal(unknown.status, 200);
  });
});

describe('Журнал дій', () => {
  let adminToken;
  let studentToken;
  let studentId;

  before(async () => {
    await cleanup();

    await request(app).post('/api/auth/register').send(users.admin);
    await prisma.user.update({ where: { email: users.admin.email }, data: { role: 'ADMIN' } });
    adminToken = (await login(users.admin)).body.tokens.accessToken;

    const student = await request(app).post('/api/auth/register').send(users.student);
    studentToken = student.body.tokens.accessToken;
    studentId = student.body.user.id;
  });

  test('невдалий вхід потрапляє в журнал, фільтри працюють', async () => {
    const failed = await login(users.student, { password: 'wrongpassword' });
    assert.equal(failed.status, 401);

    const res = await request(app)
      .get(`/api/audit-logs?action=login_failed&userId=${studentId}`)
      .set(bearer(adminToken));

    assert.equal(res.status, 200);
    assert.ok(res.body.pagination.total >= 1);
    assert.ok(res.body.data.every((row) => row.action === 'LOGIN_FAILED' && row.userId === studentId));
  });

  test('реєстрація й успішний вхід записуються в журнал', async () => {
    await login(users.student);

    const res = await request(app)
      .get(`/api/audit-logs?userId=${studentId}&limit=100`)
      .set(bearer(adminToken));
    const actions = res.body.data.map((row) => row.action);

    assert.ok(actions.includes('USER_REGISTERED'));
    assert.ok(actions.includes('LOGIN_SUCCESS'));
  });

  test('STUDENT не бачить журнал (403), без токена 401', async () => {
    assert.equal((await request(app).get('/api/audit-logs').set(bearer(studentToken))).status, 403);
    assert.equal((await request(app).get('/api/audit-logs')).status, 401);
  });

  test('некоректний userId та дата дають 400', async () => {
    const auth = bearer(adminToken);
    assert.equal((await request(app).get('/api/audit-logs?userId=abc').set(auth)).status, 400);
    assert.equal((await request(app).get('/api/audit-logs?dateFrom=not-a-date').set(auth)).status, 400);
  });
});

describe('Двофакторна аутентифікація', () => {
  let token;
  let secret;

  before(async () => {
    await cleanup();
    const res = await request(app).post('/api/auth/register').send(users.tfa);
    token = res.body.tokens.accessToken;
  });

  test('без токена 401', async () => {
    assert.equal((await request(app).post('/api/auth/2fa/setup')).status, 401);
  });

  test('enable без setup дає 400', async () => {
    const res = await request(app)
      .post('/api/auth/2fa/enable')
      .set(bearer(token))
      .send({ code: '123456' });
    assert.equal(res.status, 400);
  });

  test('setup повертає секрет, а 2FA ще не вимагається', async () => {
    const res = await request(app).post('/api/auth/2fa/setup').set(bearer(token));
    assert.equal(res.status, 200);
    assert.ok(res.body.secret);
    assert.match(res.body.otpauthUrl, /^otpauth:\/\/totp\//);
    secret = res.body.secret;

    assert.equal((await login(users.tfa)).status, 200);
  });

  test('enable: хибний код 400, формат коду 400, правильний 200', async () => {
    const auth = bearer(token);
    const wrong = await request(app).post('/api/auth/2fa/enable').set(auth).send({ code: '000000' });
    assert.equal(wrong.status, 400);

    const format = await request(app).post('/api/auth/2fa/enable').set(auth).send({ code: 'abc' });
    assert.equal(format.status, 400);

    const ok = await request(app)
      .post('/api/auth/2fa/enable')
      .set(auth)
      .send({ code: generateTotp(secret) });
    assert.equal(ok.status, 200);
  });

  test('вхід: без коду 401 twoFactorRequired, хибний код 401, правильний 200 без секрету у відповіді', async () => {
    const without = await login(users.tfa);
    assert.equal(without.status, 401);
    assert.equal(without.body.twoFactorRequired, true);

    const wrong = await login(users.tfa, { code: '000000' });
    assert.equal(wrong.status, 401);

    const ok = await login(users.tfa, { code: generateTotp(secret) });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.tokens.accessToken);
    assert.equal(ok.body.user.twoFactorSecret, undefined);
    assert.equal(ok.body.user.password, undefined);
  });

  test('вимкнення: хибний пароль 400, правильні пароль і код 200, після цього вхід без коду', async () => {
    const auth = bearer(token);
    const bad = await request(app)
      .post('/api/auth/2fa/disable')
      .set(auth)
      .send({ password: 'wrongpassword', code: generateTotp(secret) });
    assert.equal(bad.status, 400);

    const ok = await request(app)
      .post('/api/auth/2fa/disable')
      .set(auth)
      .send({ password: users.tfa.password, code: generateTotp(secret) });
    assert.equal(ok.status, 200);

    assert.equal((await login(users.tfa)).status, 200);
  });
});

describe('Завантаження кількох файлів', () => {
  let token;
  let userId;

  before(async () => {
    await cleanup();
    const res = await request(app).post('/api/auth/register').send(users.upload);
    token = res.body.tokens.accessToken;
    userId = res.body.user.id;
  });

  test('без токена 401, без файлів 400', async () => {
    assert.equal((await request(app).post('/api/files/upload-multiple')).status, 401);

    const empty = await request(app).post('/api/files/upload-multiple').set(bearer(token));
    assert.equal(empty.status, 400);
  });

  test('два PNG завантажуються (201) і видаляються', async () => {
    const auth = bearer(token);
    const res = await request(app)
      .post('/api/files/upload-multiple')
      .set(auth)
      .attach('files', png, { filename: 'a.png', contentType: 'image/png' })
      .attach('files', png, { filename: 'b.png', contentType: 'image/png' });

    assert.equal(res.status, 201);
    assert.equal(res.body.files.length, 2);

    // Прибираємо файли і з БД, і з диска
    for (const file of res.body.files) {
      assert.equal((await request(app).delete(`/api/files/${file.id}`).set(auth)).status, 200);
    }
  });

  test('якщо один із файлів недопустимий, не зберігається жоден', async () => {
    const before = await prisma.file.count({ where: { uploadedBy: userId } });

    const res = await request(app)
      .post('/api/files/upload-multiple')
      .set(bearer(token))
      .attach('files', png, { filename: 'ok.png', contentType: 'image/png' })
      .attach('files', png, { filename: 'bad.exe', contentType: 'application/x-msdownload' });

    assert.equal(res.status, 400);
    assert.equal(await prisma.file.count({ where: { uploadedBy: userId } }), before);
  });

  test('забагато файлів (понад ліміт) дає 400', async () => {
    let req = request(app).post('/api/files/upload-multiple').set(bearer(token));
    for (let i = 0; i < 6; i += 1) {
      req = req.attach('files', png, { filename: `f${i}.png`, contentType: 'image/png' });
    }
    const res = await req;
    assert.equal(res.status, 400);
  });
});

describe('Оновлення файлу', () => {
  let owner;
  let other;
  let admin;
  let fileId;

  const register = async (user) => (await request(app).post('/api/auth/register').send(user)).body.tokens.accessToken;

  before(async () => {
    await cleanup();
    owner = bearer(await register(users.fileOwner));
    other = bearer(await register(users.fileOther));
    await register(users.fileAdmin);
    await prisma.user.update({ where: { email: users.fileAdmin.email }, data: { role: 'ADMIN' } });
    admin = bearer((await login(users.fileAdmin)).body.tokens.accessToken);

    const res = await request(app)
      .post('/api/files/upload')
      .set(owner)
      .attach('file', png, { filename: 'old.png', contentType: 'image/png' });
    assert.equal(res.status, 201);
    fileId = res.body.file.id;
  });

  after(async () => {
    await request(app).delete(`/api/files/${fileId}`).set(owner);
  });

  test('без токена 401, без змін 400', async () => {
    assert.equal((await request(app).put(`/api/files/${fileId}`)).status, 401);
    assert.equal((await request(app).put(`/api/files/${fileId}`).set(owner)).status, 400);
  });

  test('чужий користувач не оновлює файл (403), неіснуючий файл 404', async () => {
    const res = await request(app).put(`/api/files/${fileId}`).set(other).field('originalName', 'hack.png');
    assert.equal(res.status, 403);
    assert.equal((await request(app).put('/api/files/999999999').set(owner).field('originalName', 'x.png')).status, 404);
  });

  test('чужа заміна вмісту (403) не залишає «осиротілих» файлів на диску', async () => {
    const before = await prisma.file.findUnique({ where: { id: fileId } });
    const res = await request(app)
      .put(`/api/files/${fileId}`)
      .set(other)
      .attach('file', png, { filename: 'evil.png', contentType: 'image/png' });
    assert.equal(res.status, 403);
    const after = await prisma.file.findUnique({ where: { id: fileId } });
    assert.equal(after.path, before.path);
  });

  test('власник перейменовує файл', async () => {
    const res = await request(app).put(`/api/files/${fileId}`).set(owner).field('originalName', '  dovidka.png  ');
    assert.equal(res.status, 200);
    assert.equal(res.body.file.originalName, 'dovidka.png');
  });

  test('власник замінює вміст: шлях змінюється, старий файл видалено з диска', async () => {
    const { existsSync } = await import('node:fs');
    const before = await prisma.file.findUnique({ where: { id: fileId } });
    assert.ok(existsSync(before.path));

    const res = await request(app)
      .put(`/api/files/${fileId}`)
      .set(owner)
      .attach('file', Buffer.concat([png, png]), { filename: 'new.png', contentType: 'image/png' });

    assert.equal(res.status, 200);
    assert.notEqual(res.body.file.path, before.path);
    assert.equal(res.body.file.size, png.length * 2);
    assert.equal(res.body.file.originalName, 'new.png');
    assert.equal(existsSync(before.path), false);
    assert.ok(existsSync(res.body.file.path));
  });

  test('заміна на недопустимий тип або завеликий файл дає 400, файл не змінюється', async () => {
    const before = await prisma.file.findUnique({ where: { id: fileId } });

    const exe = await request(app)
      .put(`/api/files/${fileId}`)
      .set(owner)
      .attach('file', png, { filename: 'a.exe', contentType: 'application/x-msdownload' });
    assert.equal(exe.status, 400);

    const big = await request(app)
      .put(`/api/files/${fileId}`)
      .set(owner)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'b.png', contentType: 'image/png' });
    assert.equal(big.status, 400);

    const after = await prisma.file.findUnique({ where: { id: fileId } });
    assert.equal(after.path, before.path);
  });

  test('ADMIN може оновити чужий файл, а зміна записується в журнал', async () => {
    const res = await request(app).put(`/api/files/${fileId}`).set(admin).field('originalName', 'by-admin.png');
    assert.equal(res.status, 200);

    const logs = await request(app).get('/api/audit-logs?action=FILE_UPDATED').set(admin);
    assert.equal(logs.status, 200);
    assert.ok(logs.body.data.some((l) => l.entityId === fileId));
  });
});

describe('Відкликання сесій при зміні ролі чи пароля адміном', () => {
  test('PUT /api/users/:id відкликає refresh токени користувача', async () => {
    await cleanup();
    await request(app).post('/api/auth/register').send(users.fileAdmin);
    await prisma.user.update({ where: { email: users.fileAdmin.email }, data: { role: 'ADMIN' } });
    const adminToken = (await login(users.fileAdmin)).body.tokens.accessToken;

    const reg = await request(app).post('/api/auth/register').send(users.fileOther);
    const { refreshToken } = reg.body.tokens;

    const res = await request(app)
      .put(`/api/users/${reg.body.user.id}`)
      .set(bearer(adminToken))
      .send({ role: 'TEACHER' });
    assert.equal(res.status, 200);

    assert.equal((await request(app).post('/api/auth/refresh').send({ refreshToken })).status, 401);
  });
});

