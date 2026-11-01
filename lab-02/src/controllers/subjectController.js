import prisma from '../utils/prisma.js';

export const getAll = async (req, res) => {
  const subjects = await prisma.subject.findMany({
    include: { _count: { select: { lessons: true } } },
  });
  res.json(subjects);
};

export const getOne = async (req, res) => {
  const id = Number(req.params.id);
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  res.json(subject);
};

export const create = async (req, res) => {
  const { name } = req.body;
  const subject = await prisma.subject.create({ data: { name } });
  res.status(201).json(subject);
};

export const update = async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  const subject = await prisma.subject.update({ where: { id }, data: { name } });
  res.json(subject);
};

export const remove = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.subject.delete({ where: { id } });
  res.status(204).send();
};