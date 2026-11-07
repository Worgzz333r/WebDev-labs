import prisma from '../utils/prisma.js';
import { parsePagination, parseSort, buildPagination, toId } from '../utils/query.js';

const AUDIT_SORT_FIELDS = ['id', 'createdAt', 'action'];

export const getAll = async (req, res) => {
  const { userId, action, entity, dateFrom, dateTo } = req.query;

  if (userId !== undefined && toId(userId) === null) {
    return res.status(400).json({ error: 'Invalid userId filter' });
  }

  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    return res.status(400).json({ error: 'Dates must be ISO 8601, e.g. 2026-10-30' });
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) to.setUTCHours(23, 59, 59, 999);

  const where = {};
  if (userId !== undefined) where.userId = toId(userId);
  if (action) where.action = String(action).toUpperCase();
  if (entity) where.entity = String(entity);
  if (from || to) where.createdAt = { ...(from && { gte: from }), ...(to && { lte: to }) };

  const pagination = parsePagination(req.query);
  const orderBy = parseSort(req.query, AUDIT_SORT_FIELDS, 'createdAt', 'desc');

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.limit,
      include: { user: { select: { id: true, fullName: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ data: logs, pagination: buildPagination(pagination, total, logs.length) });
};