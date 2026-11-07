import { hashPassword } from '../utils/password.js';
import prisma from '../utils/prisma.js';
import { logAction } from '../utils/audit.js';
import { parsePagination, parseSort, buildPagination, toId } from '../utils/query.js';
import { invalidate } from '../utils/cache.js';

const USER_SORT_FIELDS = ['id', 'fullName', 'email', 'createdAt'];
const ROLES = ['ADMIN', 'TEACHER', 'STUDENT'];

// які поля віддаємо клієнту (без password)
const publicFields = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  groupId: true,
  createdAt: true,
};

export const getAll = async (req, res) => {
  const { search, role, groupId } = req.query;

  const where = {};
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (ROLES.includes(role)) where.role = role;
  if (toId(groupId)) where.groupId = toId(groupId);

  const pagination = parsePagination(req.query);
  const orderBy = parseSort(req.query, USER_SORT_FIELDS, 'id', 'asc');

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.limit,
      select: publicFields,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ data: users, pagination: buildPagination(pagination, total, users.length) });
};

export const getOne = async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    select: { ...publicFields, group: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

export const create = async (req, res) => {
  const { email, password, fullName, role, groupId } = req.body;
  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, password: hashed, fullName, role, groupId },
    select: publicFields,
  });
  invalidate('groups:');
  res.status(201).json(user);
};

export const update = async (req, res) => {
  const id = Number(req.params.id);
  const { email, password, fullName, role, groupId } = req.body;
  const data = { email, fullName, role, groupId };
  if (password) data.password = await hashPassword(password);
  const user = await prisma.user.update({
    where: { id },
    data,
    select: publicFields,
  });

  // Зміна пароля або ролі адміном: відкликаємо refresh токени, щоб старі сесії не зберегли доступ.
  // Вже виданий access токен діє до завершення терміну (за замовчуванням 15 хвилин).
  if (password || role) {
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await logAction(req, 'USER_SESSIONS_REVOKED', {
      entity: 'User',
      entityId: id,
      details: { passwordChanged: Boolean(password), role: role ?? null },
    });
  }
  invalidate('groups:');
  res.json(user);
};

export const remove = async (req, res) => {
  const id = Number(req.params.id);
  await prisma.user.delete({ where: { id } });
  invalidate('groups:');
  res.status(204).send();
};