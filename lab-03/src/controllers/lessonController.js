import { parsePagination, parseSort, buildPagination, toId } from '../utils/query.js';
import prisma from '../utils/prisma.js';
import { emitLesson } from '../socket/emit.js';
import { notifyMany } from '../utils/notifications.js';

const LESSON_SORT_FIELDS = ['id', 'date', 'topic'];

const include = {
  subject: true,
  group: true,
  teacher: { select: { id: true, fullName: true } },
};

const notifyGroup = async (req, lesson, title) => {
  const students = await prisma.user.findMany({
    where: { groupId: lesson.groupId, role: 'STUDENT' },
    select: { id: true },
  });
  return notifyMany(
    req.app.get('io'),
    students.map((s) => s.id),
    {
      type: 'LESSON',
      title,
      body: lesson.topic ? `Тема: ${lesson.topic}` : 'Деталі в розкладі',
      data: { lessonId: lesson.id },
    },
  );
};

export const getAll = async (req, res) => {
  const { search, subjectId, groupId, teacherId, dateFrom, dateTo } = req.query;

  for (const [name, value] of Object.entries({ subjectId, groupId, teacherId })) {
    if (value !== undefined && toId(value) === null) {
      return res.status(400).json({ error: `Invalid ${name} filter` });
    }
  }

  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    return res.status(400).json({ error: 'Dates must be ISO 8601, e.g. 2026-10-30' });
  }

  if (to && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) to.setUTCHours(23, 59, 59, 999);

  const where = {};
  if (search) where.topic = { contains: search, mode: 'insensitive' };
  if (subjectId !== undefined) where.subjectId = toId(subjectId);
  if (groupId !== undefined) where.groupId = toId(groupId);
  if (teacherId !== undefined) where.teacherId = toId(teacherId);
  if (from || to) {
    where.date = { ...(from && { gte: from }), ...(to && { lte: to }) };
  }

  const pagination = parsePagination(req.query);
  const orderBy = parseSort(req.query, LESSON_SORT_FIELDS, 'date', 'desc');

  const [lessons, total] = await Promise.all([
    prisma.lesson.findMany({
      where,
      include,
      orderBy,
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.lesson.count({ where }),
  ]);

  res.json({ data: lessons, pagination: buildPagination(pagination, total, lessons.length) });
};

export const getOne = async (req, res) => {
  const id = Number(req.params.id);
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      ...include,
      attendance: {
        include: { student: { select: { id: true, fullName: true } } },
      },
    },
  });
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  res.json(lesson);
};

export const create = async (req, res) => {
  const { date, topic, subjectId, groupId, teacherId } = req.body;
  const lesson = await prisma.lesson.create({
    data: { date: new Date(date), topic, subjectId, groupId, teacherId },
    include,
  });

  await emitLesson(req, 'lesson:created', lesson);
  await notifyGroup(req, lesson, 'Заплановано заняття');
  res.status(201).json(lesson);
};

export const update = async (req, res) => {
  const id = Number(req.params.id);
  const { date, topic, subjectId, groupId, teacherId } = req.body;
  const lesson = await prisma.lesson.update({
    where: { id },
    data: {
      date: date ? new Date(date) : undefined,
      topic,
      subjectId,
      groupId,
      teacherId,
    },
    include,
  });

  await emitLesson(req, 'lesson:updated', lesson);
  await notifyGroup(req, lesson, 'Заняття змінено');
  res.json(lesson);
};

export const remove = async (req, res) => {
  const id = Number(req.params.id);
  const lesson = await prisma.lesson.delete({ where: { id } });
  await emitLesson(req, 'lesson:deleted', {
    id,
    groupId: lesson.groupId,
    teacherId: lesson.teacherId,
  });
  
  await notifyGroup(req, lesson, 'Заняття скасовано');

  res.status(204).send();
};