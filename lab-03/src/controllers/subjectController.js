import prisma from '../utils/prisma.js';
import { parsePagination, parseSort, buildPagination } from '../utils/query.js';
import { emitSubject } from '../socket/emit.js';
import { cached, invalidate } from '../utils/cache.js';

const SUBJECT_SORT_FIELDS = ['id', 'name'];

export const getAll = async (req, res) => {
  const { search } = req.query;

  const { value, hit } = await cached(`subjects:${req.originalUrl}`, async () => {
    const where = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const pagination = parsePagination(req.query);
    const orderBy = parseSort(req.query, SUBJECT_SORT_FIELDS, 'name', 'asc');

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.subject.count({ where }),
    ]);

    return { data: subjects, pagination: buildPagination(pagination, total, subjects.length) };
  });

  res.set('X-Cache', hit ? 'HIT' : 'MISS').json(value);
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
  await emitSubject(req, 'subject:created', subject);
  invalidate('subjects:');
  res.status(201).json(subject);
};

export const update = async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  const subject = await prisma.subject.update({ where: { id }, data: { name } });
  await emitSubject(req, 'subject:updated', subject);
  invalidate('subjects:');
  res.json(subject);
};

export const remove = async (req, res) => {
  const id = Number(req.params.id);
  const subject = await prisma.subject.delete({ where: { id } });
  await emitSubject(req, 'subject:deleted', { id, name: subject.name });
  invalidate('subjects:');
  res.status(204).send();
};