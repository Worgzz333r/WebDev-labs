import prisma from '../utils/prisma.js';
import { parsePagination, buildPagination } from '../utils/query.js';

const TYPES = ['ATTENDANCE', 'LESSON', 'SYSTEM'];

export const getAll = async (req, res) => {
  const { unread, type } = req.query;
  if (type && !TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid type filter' });
  }

  const where = { userId: req.user.userId };
  if (unread === 'true') where.readAt = null;
  if (type) where.type = type;

  const pagination = parsePagination(req.query);

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user.userId, readAt: null } }),
  ]);

  res.json({ data, unreadCount, pagination: buildPagination(pagination, total, data.length) });
};

export const markRead = async (req, res) => {
  const id = Number(req.params.id);
  // userId в умові: чуже сповіщення не знайдеться (404)
  const { count } = await prisma.notification.updateMany({
    where: { id, userId: req.user.userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (count === 0) {
    const exists = await prisma.notification.findFirst({ where: { id, userId: req.user.userId } });
    if (!exists) return res.status(404).json({ error: 'Notification not found' });
  }
  res.json(await prisma.notification.findUnique({ where: { id } }));
};

export const markAllRead = async (req, res) => {
  const { count } = await prisma.notification.updateMany({
    where: { userId: req.user.userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ updated: count });
};

export const remove = async (req, res) => {
  const id = Number(req.params.id);
  const { count } = await prisma.notification.deleteMany({
    where: { id, userId: req.user.userId },
  });
  if (count === 0) return res.status(404).json({ error: 'Notification not found' });
  res.status(204).send();
};