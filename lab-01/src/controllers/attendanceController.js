const prisma = require('../utils/prisma');

const include = {
  student: { select: { id: true, fullName: true } },
  document: true,
};

exports.getAll = async (req, res) => {
  const { lessonId, studentId } = req.query;
  const where = {};
  if (lessonId) where.lessonId = Number(lessonId);
  if (studentId) where.studentId = Number(studentId);
  const records = await prisma.attendance.findMany({ where, include });
  res.json(records);
};

exports.getOne = async (req, res) => {
  const id = Number(req.params.id);
  const record = await prisma.attendance.findUnique({ where: { id }, include });
  if (!record) return res.status(404).json({ error: 'Attendance not found' });
  res.json(record);
};

exports.create = async (req, res) => {
  const { lessonId, studentId, status, comment } = req.body;
  const record = await prisma.attendance.create({
    data: { lessonId, studentId, status, comment },
    include,
  });
  res.status(201).json(record);
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const { status, comment } = req.body;
  const record = await prisma.attendance.update({
    where: { id },
    data: { status, comment },
    include,
  });
  res.json(record);
};

exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.attendance.delete({ where: { id } });
  res.status(204).send();
};