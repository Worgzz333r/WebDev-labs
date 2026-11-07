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
const io = initSocket(httpServer);
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
    assert.deepEqual(await forStudent, [
        { id: created.body.id, lessonId: lesson.id, studentId: student.id },
    ]);

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
    assert.deepEqual(await forGroup, [
        { id: created.body.id, groupId: group.id, teacherId: teacher.id },
    ]);
});