import prisma from '../utils/prisma.js';

const include = {
  student: { select: { id: true, fullName: true } },
  document: true,
};

export const getAll = async (req, res) => {
  const { lessonId, studentId } = req.query;
  const where = {};
  if (lessonId) where.lessonId = Number(lessonId);
  if (studentId) where.studentId = Number(studentId);
  const records = await prisma.attendance.findMany({ where, include });
  res.json(records);
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