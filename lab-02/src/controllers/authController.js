import { createHash } from 'node:crypto';
import prisma from '../utils/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  groupId: true,
  createdAt: true,
};

// Створює пару токенів і зберігає хеш refresh токена в БД, щоб його можна було відкликати
async function issueTokens(user) {
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);
  const { exp } = verifyRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash: sha256(refreshToken),
      userId: user.id,
      expiresAt: new Date(exp * 1000),
    },
  });

  return { accessToken, refreshToken };
}

export async function register(req, res) {
  // role свідомо не береться з тіла запиту: публічна реєстрація створює лише STUDENT
  const { email, password, fullName, groupId } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: 'Користувач з таким email вже існує' });
  }

  const user = await prisma.user.create({
    data: { email, password: await hashPassword(password), fullName, groupId },
    select: publicUserSelect,
  });

  res.status(201).json({
    message: 'Користувача успішно зареєстровано',
    user,
    tokens: await issueTokens(user),
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  // Однакова відповідь для неіснуючого email і хибного пароля
  if (!user || !(await comparePassword(password, user.password))) {
    return res.status(401).json({ error: 'Невірний email або пароль' });
  }

  const { password: _password, ...userWithoutPassword } = user;

  res.json({
    message: 'Успішний вхід',
    user: userWithoutPassword,
    tokens: await issueTokens(user),
  });
}

export async function refresh(req, res) {
  const { refreshToken } = req.body;

  try {
    verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ error: 'Недійсний refresh токен' });
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(refreshToken) },
    include: { user: true },
  });

  if (!stored || stored.revokedAt) {
    // Повторне використання відкликаного токена: відкликаємо всі токени користувача
    if (stored) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return res.status(401).json({ error: 'Недійсний refresh токен' });
  }

  // Ротація: старий токен відкликаємо, видаємо нову пару
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  res.json({ tokens: await issueTokens(stored.user) });
}

export async function logout(req, res) {
  const { refreshToken } = req.body ?? {};

  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  res.status(204).end();
}

// Рівень 2: зміна пароля (потрібен access токен)
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

  if (!user || !(await comparePassword(currentPassword, user.password))) {
    return res.status(400).json({ error: 'Поточний пароль невірний' });
  }

  // Новий пароль + відкликання всіх refresh токенів: інші сесії доведеться відкрити заново
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(newPassword) },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  res.json({ message: 'Пароль змінено. Увійдіть знову на інших пристроях' });
}