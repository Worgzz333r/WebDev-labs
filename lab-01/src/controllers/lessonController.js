const prisma = require('../utils/prisma');

const include = {
  subject: true,
  group: true,
  teacher: { select: { id: true, fullName: true } },
};

exports.getAll = async (req, res) => {
  const { groupId, subjectId } = req.query;
  const where = {};
  if (groupId) where.groupId = Number(groupId);
  if (subjectId) where.subjectId = Number(subjectId);
  const lessons = await prisma.lesson.findMany({
    where,
    include,
    orderBy: { date: 'desc' },
  });
  res.json(lessons);
};

exports.getOne = async (req, res) => {
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

exports.create = async (req, res) => {
  const { date, topic, subjectId, groupId, teacherId } = req.body;
  const lesson = await prisma.lesson.create({
    data: { date: new Date(date), topic, subjectId, groupId, teacherId },
    include,
  });
  res.status(201).json(lesson);
};

exports.update = async (req, res) => {
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
  res.json(lesson);
};

exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.lesson.delete({ where: { id } });
  res.status(204).send();
};