import prisma from '../utils/prisma.js';
import { parsePagination, parseSort, buildPagination, toId } from '../utils/query.js';

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
const ATTENDANCE_SORT_FIELDS = ['id', 'status'];

const include = {
  student: { select: { id: true, fullName: true } },
  document: true,
};

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
  res.json(record);
};

export const create = async (req, res) => {
  const { lessonId, studentId, status, comment } = req.body;
  const record = await prisma.attendance.create({
    data: { lessonId, studentId, status, comment },
    include,
  });
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
  res.json(record);
};

export const remove = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.attendance.delete({ where: { id } });
  res.status(204).send();
};