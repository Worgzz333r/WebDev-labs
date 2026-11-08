import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import request from 'supertest';
import { io as connect } from 'socket.io-client';
import app from '../src/app.js';
import prisma from '../src/utils/prisma.js';
import { initSocket } from '../src/socket/index.js';
import { generateAccessToken } from '../src/utils/jwt.js';

const TAG = 'rt-test';
const httpServer = createServer(app);
const io = await initSocket(httpServer);
app.set('io', io);
httpServer.listen(0);
await once(httpServer, 'listening');
const url = `http://localhost:${httpServer.address().port}`;

const clients = [];
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
// чекаємо подію, але не більше 3 с, щоб тест не зависав
const waitFor = (socket, event) => once(socket, event, { signal: AbortSignal.timeout(3000) });
const open = async (userId, role) => {
    const socket = connect(url, { auth: { token: generateAccessToken(userId, role) } });
    clients.push(socket);
    await once(socket, 'connect');
    return socket;
};

let teacher;
let student;
let other;
let lesson;
let group;
let subject;

async function cleanup() {
    await prisma.lesson.deleteMany({ where: { topic: TAG } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `${TAG}-` } } });
    await prisma.group.deleteMany({ where: { name: { startsWith: TAG } } });
    await prisma.subject.deleteMany({ where: { name: { startsWith: TAG } } });
}

before(async () => {
    await cleanup();
    group = await prisma.group.create({ data: { name: `${TAG}-group` } });
    subject = await prisma.subject.create({ data: { name: `${TAG}-subject` } });
    const mk = (name, role, groupId) =>
        prisma.user.create({
            data: { email: `${TAG}-${name}@example.com`, password: 'x', fullName: name, role, groupId },
        });
    teacher = await mk('teacher', 'TEACHER');
    student = await mk('student', 'STUDENT', group.id);
    other = await mk('other', 'STUDENT', group.id);
    lesson = await prisma.lesson.create({
        data: { date: new Date(), topic: TAG, subjectId: subject.id, groupId: group.id, teacherId: teacher.id },
    });
});

after(async () => {
    clients.forEach((c) => c.close());
    io.close();
    await cleanup();
    await prisma.$disconnect();
});

test('Attendance: створення, оновлення й видалення доходять до студента й заняття', async () => {
    const teacherSocket = await open(teacher.id, 'TEACHER');
    const studentSocket = await open(student.id, 'STUDENT');
    const otherSocket = await open(other.id, 'STUDENT');

    assert.deepEqual(await teacherSocket.emitWithAck('room:join', `lesson:${lesson.id}`), { ok: true });

    let otherGot = false;
    for (const e of ['attendance:created', 'attendance:updated', 'attendance:deleted']) {
        otherSocket.on(e, () => (otherGot = true));
    }
    const token = generateAccessToken(teacher.id, 'TEACHER');

    // створення
    let forStudent = waitFor(studentSocket, 'attendance:created');
    let forLesson = waitFor(teacherSocket, 'attendance:created');
    const created = await request(app)
        .post('/api/attendance')
        .set(bearer(token))
        .send({ lessonId: lesson.id, studentId: student.id, status: 'ABSENT' });
    assert.equal(created.status, 201);
    assert.equal((await forStudent)[0].status, 'ABSENT');
    assert.equal((await forLesson)[0].id, created.body.id);

    // оновлення
    forStudent = waitFor(studentSocket, 'attendance:updated');
    const updated = await request(app)
        .put(`/api/attendance/${created.body.id}`)
        .set(bearer(token))
        .send({ status: 'PRESENT' });
    assert.equal(updated.status, 200);
    assert.equal((await forStudent)[0].status, 'PRESENT');

    // видалення
    forStudent = waitFor(studentSocket, 'attendance:deleted');
    const removed = await request(app).delete(`/api/attendance/${created.body.id}`).set(bearer(token));
    assert.equal(removed.status, 204);
    // змінено: разом з подією тепер приходить { seq }
    const [deleted, deletedMeta] = await forStudent;
    assert.deepEqual(deleted, { id: created.body.id, lessonId: lesson.id, studentId: student.id });
    assert.ok(Number.isInteger(deletedMeta.seq));

    // чужий студент нічого не отримав
    assert.equal(otherGot, false);
});

test('Lesson: події доходять до групи й викладача', async () => {
    const teacherSocket = await open(teacher.id, 'TEACHER');
    const studentSocket = await open(student.id, 'STUDENT');
    assert.deepEqual(await studentSocket.emitWithAck('room:join', `group:${group.id}`), { ok: true });

    const token = generateAccessToken(teacher.id, 'TEACHER');

    // створення
    let forGroup = waitFor(studentSocket, 'lesson:created');
    let forTeacher = waitFor(teacherSocket, 'lesson:created');
    const created = await request(app)
        .post('/api/lessons')
        .set(bearer(token))
        .send({
            date: new Date().toISOString(),
            topic: TAG,
            subjectId: subject.id,
            groupId: group.id,
            teacherId: teacher.id,
        });
    assert.equal(created.status, 201);
    assert.equal((await forGroup)[0].id, created.body.id);
    assert.equal((await forTeacher)[0].id, created.body.id);

    // оновлення
    forGroup = waitFor(studentSocket, 'lesson:updated');
    const updated = await request(app)
        .put(`/api/lessons/${created.body.id}`)
        .set(bearer(token))
        .send({ topic: TAG });
    assert.equal(updated.status, 200);
    assert.equal((await forGroup)[0].id, created.body.id);

    // видалення
    forGroup = waitFor(studentSocket, 'lesson:deleted');
    const removed = await request(app).delete(`/api/lessons/${created.body.id}`).set(bearer(token));
    assert.equal(removed.status, 204);
    // змінено: разом з подією тепер приходить { seq }
    const [deletedLesson, lessonMeta] = await forGroup;
    assert.deepEqual(deletedLesson, { id: created.body.id, groupId: group.id, teacherId: teacher.id });
    assert.ok(Number.isInteger(lessonMeta.seq));
});

test('Lesson: сповіщення отримують усі студенти групи (batch), викладач ні', async () => {
    const studentSocket = await open(student.id, 'STUDENT');
    const otherSocket = await open(other.id, 'STUDENT');
    const teacherSocket = await open(teacher.id, 'TEACHER');

    let teacherGot = false;
    teacherSocket.on('notification', () => (teacherGot = true));

    const forStudent = waitFor(studentSocket, 'notification');
    const forOther = waitFor(otherSocket, 'notification');

    const created = await request(app)
        .post('/api/lessons')
        .set(bearer(generateAccessToken(teacher.id, 'TEACHER')))
        .send({
            date: new Date().toISOString(),
            topic: TAG,
            subjectId: subject.id,
            groupId: group.id,
            teacherId: teacher.id,
        });
    assert.equal(created.status, 201);

    const [[n1], [n2]] = await Promise.all([forStudent, forOther]);
    assert.equal(n1.type, 'LESSON');
    assert.equal(n1.userId, student.id);
    assert.equal(n2.userId, other.id);
    assert.deepEqual(n1.data, { lessonId: created.body.id });

    // обидва сповіщення збережені в БД
    const stored = await prisma.notification.count({
        where: {
            userId: { in: [student.id, other.id] },
            data: { path: ['lessonId'], equals: created.body.id },
        },
    });
    assert.equal(stored, 2);
    assert.equal(teacherGot, false);
});

// Чекає подію presence:update про конкретного користувача
const presence = (socket, userId) =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('presence timeout')), 3000);
        socket.on('presence:update', function handler(e) {
            if (e.userId !== userId) return;
            clearTimeout(timer);
            socket.off('presence:update', handler);
            resolve(e);
        });
    });

test('Presence: онлайн, поки є хоча б одне з\'єднання', async () => {
    // окремий користувач, щоб сокети з попередніх тестів не заважали
    const user = await prisma.user.create({
        data: {
            email: `${TAG}-presence@example.com`,
            password: 'x',
            fullName: 'presence',
            role: 'STUDENT',
            groupId: group.id,
        },
    });
    const staff = await open(teacher.id, 'TEACHER');

    // перше з'єднання → персонал бачить, що користувач онлайн
    const wentOnline = presence(staff, user.id);
    const first = await open(user.id, 'STUDENT');
    const online = await wentOnline;
    assert.equal(online.online, true);
    assert.ok((await staff.emitWithAck('presence:list')).online.includes(user.id));

    // друге з'єднання й закриття першого: користувач усе ще онлайн, подій немає
    const extra = [];
    staff.on('presence:update', (e) => e.userId === user.id && extra.push(e));
    const second = await open(user.id, 'STUDENT');
    first.close();
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(extra.length, 0);

    // закрили останнє з'єднання → офлайн
    const wentOffline = presence(staff, user.id);
    second.close();
    assert.equal((await wentOffline).online, false);
    assert.ok(!(await staff.emitWithAck('presence:list')).online.includes(user.id));
});

test('Відновлення: після перепідключення студент отримує пропущені події', async () => {
    const token = generateAccessToken(teacher.id, 'TEACHER');
    const api = (method, path, body) => request(app)[method](path).set(bearer(token)).send(body);

    // студент онлайн, отримує першу подію й запам'ятовує seq
    const before = await open(student.id, 'STUDENT');
    const first = waitFor(before, 'attendance:created');
    const created = await api('post', '/api/attendance', {
        lessonId: lesson.id,
        studentId: student.id,
        status: 'ABSENT',
    });
    assert.equal(created.status, 201);
    const [, { seq: lastSeq }] = await first;

    // зв'язок розірвано, поки студент офлайн, стаються зміни
    before.close();
    await api('put', `/api/attendance/${created.body.id}`, { status: 'LATE' });
    await api('put', `/api/attendance/${created.body.id}`, { status: 'EXCUSED' });
    // подія для іншого студента (студент у кімнаті заняття не підписаний, його це не стосується)
    await api('post', '/api/attendance', { lessonId: lesson.id, studentId: other.id, status: 'ABSENT' });

    // перепідключення: запит пропущеного
    const after = await open(student.id, 'STUDENT');
    const res = await after.emitWithAck('events:since', lastSeq);
    assert.equal(res.ok, true);
    assert.deepEqual(
        res.events.map((e) => [e.type, e.payload.status]),
        [
            ['attendance:updated', 'LATE'],
            ['attendance:updated', 'EXCUSED'],
        ],
    );
    assert.ok(res.events[0].seq < res.events[1].seq);
    assert.equal(res.hasMore, false);
    assert.equal(res.gap, false);

    // повторний запит з останнім seq нічого нового не повертає
    const again = await after.emitWithAck('events:since', res.events.at(-1).seq);
    assert.deepEqual(again.events, []);

    // некоректний аргумент
    assert.deepEqual(await after.emitWithAck('events:since', 'abc'), { ok: false, error: 'bad_request' });
});

test('Group і Subject: події для персоналу, група також для своїх студентів', async () => {
    const staff = await open(teacher.id, 'TEACHER');
    const studentSocket = await open(student.id, 'STUDENT');
    const admin = generateAccessToken(teacher.id, 'ADMIN'); // роль у токені достатня для ендпоінтів

    // група: студент групи отримує оновлення, персонал теж
    const forStaff = waitFor(staff, 'group:updated');
    const forStudent = waitFor(studentSocket, 'group:updated');
    const renamed = await request(app)
        .put(`/api/groups/${group.id}`)
        .set(bearer(admin))
        .send({ name: `${TAG}-group-renamed` });
    assert.equal(renamed.status, 200);
    assert.equal((await forStaff)[0].name, `${TAG}-group-renamed`);
    assert.equal((await forStudent)[0].id, group.id);

    // предмет: лише персонал, студент нічого не отримує
    let studentGot = false;
    studentSocket.on('subject:created', () => (studentGot = true));
    const subjectEvent = waitFor(staff, 'subject:created');
    const createdSubject = await request(app)
        .post('/api/subjects')
        .set(bearer(admin))
        .send({ name: `${TAG}-subject-new` });
    assert.equal(createdSubject.status, 201);
    assert.equal((await subjectEvent)[0].name, `${TAG}-subject-new`);
    assert.equal(studentGot, false);
});