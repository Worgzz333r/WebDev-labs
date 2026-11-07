import prisma from '../utils/prisma.js';
import { parsePagination, parseSort, buildPagination } from '../utils/query.js';
import { emitGroup } from '../socket/emit.js';

const GROUP_SORT_FIELDS = ['id', 'name'];

// GET /api/groups
export const getAll = async (req, res) => {
  const { search } = req.query;

  const where = {};
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const pagination = parsePagination(req.query);
  const orderBy = parseSort(req.query, GROUP_SORT_FIELDS, 'name', 'asc');

  const [groups, total] = await Promise.all([
    prisma.group.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.limit,
      include: { _count: { select: { students: true } } },
    }),
    prisma.group.count({ where }),
  ]);

  res.json({ data: groups, pagination: buildPagination(pagination, total, groups.length) });
};

// GET /api/groups/:id
export const getOne = async (req, res) => {
  const id = Number(req.params.id);
  const group = await prisma.group.findUnique({
    where: { id },
    include: { students: { select: { id: true, fullName: true, email: true } } },
  });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json(group);
};

// POST /api/groups
export const create = async (req, res) => {
  const { name } = req.body;
  const group = await prisma.group.create({ data: { name } });
  await emitGroup(req, 'group:created', group);
  res.status(201).json(group);
};

// PUT /api/groups/:id
export const update = async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  const group = await prisma.group.update({ where: { id }, data: { name } });
  await emitGroup(req, 'group:updated', group);
  res.json(group);
};

// DELETE /api/groups/:id
export const remove = async (req, res) => {
  const id = Number(req.params.id);
  const group = await prisma.group.delete({ where: { id } });
  await emitGroup(req, 'group:deleted', { id, name: group.name });
  res.status(204).send();
};