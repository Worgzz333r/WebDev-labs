const prisma = require('../utils/prisma');

// GET /api/groups
exports.getAll = async (req, res) => {
  const groups = await prisma.group.findMany({
    include: { _count: { select: { students: true } } },
  });
  res.json(groups);
};

// GET /api/groups/:id
exports.getOne = async (req, res) => {
  const id = Number(req.params.id);
  const group = await prisma.group.findUnique({
    where: { id },
    include: { students: { select: { id: true, fullName: true, email: true } } },
  });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json(group);
};

// POST /api/groups
exports.create = async (req, res) => {
  const { name } = req.body;
  const group = await prisma.group.create({ data: { name } });
  res.status(201).json(group);
};

// PUT /api/groups/:id
exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  const group = await prisma.group.update({ where: { id }, data: { name } });
  res.json(group);
};

// DELETE /api/groups/:id
exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.group.delete({ where: { id } });
  res.status(204).send();
};