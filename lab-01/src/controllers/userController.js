const bcrypt = require('bcrypt');
const prisma = require('../utils/prisma');

// які поля віддаємо клієнту (без password)
const publicFields = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  groupId: true,
  createdAt: true,
};

exports.getAll = async (req, res) => {
  const users = await prisma.user.findMany({ select: publicFields });
  res.json(users);
};

exports.getOne = async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    select: { ...publicFields, group: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

exports.create = async (req, res) => {
  const { email, password, fullName, role, groupId } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed, fullName, role, groupId },
    select: publicFields,
  });
  res.status(201).json(user);
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const { email, password, fullName, role, groupId } = req.body;
  const data = { email, fullName, role, groupId };
  if (password) data.password = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({
    where: { id },
    data,
    select: publicFields,
  });
  res.json(user);
};

exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.user.delete({ where: { id } });
  res.status(204).send();
};