import prisma from '../utils/prisma.js';
import { logAction } from '../utils/audit.js';
import fs from 'node:fs/promises';
import { parsePagination, parseSort, buildPagination, toId } from '../utils/query.js';
import { emitAttendance } from '../socket/emit.js';
import { notify } from '../utils/notifications.js';

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
const ATTENDANCE_SORT_FIELDS = ['id', 'status'];

const include = {
  student: { select: { id: true, fullName: true } },
  document: true,
};

const STATUS_LABELS = {
  PRESENT: 'присутній',
  ABSENT: 'відсутній',
  LATE: 'запізнення',
  EXCUSED: 'поважна причина',
};

const notifyStudent = (req, record, title) =>
  notify(req.app.get('io'), record.studentId, {
    type: 'ATTENDANCE',
    priority: record.status === 'ABSENT' ? 'HIGH' : 'NORMAL',
    title,
    body: `Статус: ${STATUS_LABELS[record.status]}`,
    data: { attendanceId: record.id, lessonId: record.lessonId },
  });

export const getAll = async (req, res) => {
  const { lessonId, studentId, status, search, dateFrom, dateTo } = req.query;

  if (lessonId !== undefined && toId(lessonId) === null) {
    return res.status(400).json({ error: 'Invalid lessonId filter' });
  }
  if (studentId !== undefined && toId(studentId) === null) {
    return res.status(400).json({ error: 'Invalid studentId filter' });
  }
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status filter' });
  }

  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    return res.status(400).json({ error: 'Dates must be ISO 8601, e.g. 2026-10-30' });
  }

  // якщо передали лише дату (без часу), включаємо весь цей день
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) to.setUTCHours(23, 59, 59, 999);

  const where = {};
  if (lessonId !== undefined) where.lessonId = toId(lessonId);
  if (studentId !== undefined) where.studentId = toId(studentId);
  if (status) where.status = status;
  if (search) where.student = { fullName: { contains: search, mode: 'insensitive' } };
  if (from || to) {
    where.lesson = { date: { ...(from && { gte: from }), ...(to && { lte: to }) } };
  }

  if (req.user.role === 'STUDENT') where.studentId = req.user.userId;

  const pagination = parsePagination(req.query);
  const orderBy = parseSort(req.query, ATTENDANCE_SORT_FIELDS, 'id', 'desc');

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include,
      orderBy,
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  res.json({ data: records, pagination: buildPagination(pagination, total, records.length) });
};

export const getOne = async (req, res) => {
  const id = Number(req.params.id);
  const record = await prisma.attendance.findUnique({ where: { id }, include });
  if (!record) return res.status(404).json({ error: 'Attendance not found' });

  if (req.user.role === 'STUDENT' && record.studentId !== req.user.userId) {
    return res.status(403).json({ error: 'Недостатньо прав для перегляду цього запису' });
  }

  res.json(record);
};

export const create = async (req, res) => {
  const { lessonId, studentId, status, comment } = req.body;
  const record = await prisma.attendance.create({
    data: { lessonId, studentId, status, comment },
    include,
  });
  await logAction(req, 'ATTENDANCE_CREATED', {
    entity: 'Attendance',
    entityId: record.id,
    details: { lessonId, studentId, status: record.status },
  });

  emitAttendance(req, 'attendance:created', record);
  await notifyStudent(req, record, 'Відмічено відвідуваність');

  res.status(201).json(record);
};

export const update = async (req, res) => {
  const id = Number(req.params.id);
  const { status, comment } = req.body;
  const record = await prisma.attendance.update({
    where: { id },
    data: { status, comment },
    include,
  });
  await logAction(req, 'ATTENDANCE_UPDATED', {
    entity: 'Attendance',
    entityId: id,
    details: { status: record.status },
  });

  emitAttendance(req, 'attendance:updated', record);
  await notifyStudent(req, record, 'Відвідуваність змінено');

  res.json(record);
};

export const remove = async (req, res) => {
  const id = Number(req.params.id);
  const record = await prisma.attendance.delete({ where: { id } });
  await logAction(req, 'ATTENDANCE_DELETED', { entity: 'Attendance', entityId: id });
  emitAttendance(req, 'attendance:deleted', {
    id,
    lessonId: record.lessonId,
    studentId: record.studentId,
  });
  res.status(204).send();
};

export const attachDocument = async (req, res) => {
  // Прибирає завантажений файл, якщо запит не завершився успішно
  const cleanup = () => (req.file ? fs.unlink(req.file.path).catch(() => { }) : undefined);

  if (!req.file) {
    return res.status(400).json({ error: 'Файл не надано' });
  }

  const id = Number(req.params.id);
  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: { document: true },
  });

  if (!attendance) {
    await cleanup();
    return res.status(404).json({ error: 'Attendance not found' });
  }
  if (req.user.role === 'STUDENT' && attendance.studentId !== req.user.userId) {
    await cleanup();
    return res.status(403).json({ error: 'Можна прикріпити довідку лише до власного запису' });
  }
  if (attendance.document) {
    await cleanup();
    return res.status(409).json({ error: 'До цього запису вже прикріплено довідку' });
  }

  try {
    const document = await prisma.document.create({
      data: {
        attendance: { connect: { id } },
        file: {
          create: {
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            user: { connect: { id: req.user.userId } },
          },
        },
      },
      include: { file: true },
    });
    await logAction(req, 'DOCUMENT_ATTACHED', { entity: 'Attendance', entityId: id });
    res.status(201).json(document);
  } catch (error) {
    await cleanup();
    throw error;
  }
};