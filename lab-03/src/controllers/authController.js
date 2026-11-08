import { createHash } from 'node:crypto';
import prisma from '../utils/prisma.js';
import { logAction } from '../utils/audit.js';
import { generateSecret, verifyTotp, otpauthUrl } from '../utils/totp.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import { invalidate } from '../utils/cache.js';

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

  await logAction(req, 'USER_REGISTERED', { userId: user.id, entity: 'User', entityId: user.id });
  await invalidate('groups:');
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
    await logAction(req, 'LOGIN_FAILED', { userId: user?.id, details: { email } });
    return res.status(401).json({ error: 'Невірний email або пароль' });
  }

  // Двофакторна аутентифікація: пароль вірний, тепер потрібен код із застосунку
  if (user.twoFactorEnabled) {
    const { code } = req.body;

    if (!code) {
      return res.status(401).json({
        error: 'Потрібен код двофакторної аутентифікації',
        twoFactorRequired: true,
      });
    }

    if (!verifyTotp(user.twoFactorSecret, code)) {
      await logAction(req, 'LOGIN_2FA_FAILED', { userId: user.id });
      return res.status(401).json({
        error: 'Невірний код двофакторної аутентифікації',
        twoFactorRequired: true,
      });
    }
  }

  await logAction(req, 'LOGIN_SUCCESS', { userId: user.id });

  const { password: _password, twoFactorSecret: _secret, ...userWithoutPassword } = user;

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
      await logAction(req, 'REFRESH_TOKEN_REUSE', { userId: stored.userId });
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
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
    });

    await prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (stored) await logAction(req, 'LOGOUT', { userId: stored.userId });
  }

  res.status(204).end();
}

// Рівень 2: зміна пароля (потрібен access токен)
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

  if (!user || !(await comparePassword(currentPassword, user.password))) {
    await logAction(req, 'PASSWORD_CHANGE_FAILED');
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

  await logAction(req, 'PASSWORD_CHANGED');

  res.json({ message: 'Пароль змінено. Увійдіть знову на інших пристроях' });
}

// Рівень 3: двофакторна аутентифікація (TOTP)
export async function setupTwoFactor(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

  if (user.twoFactorEnabled) {
    return res.status(409).json({ error: 'Двофакторну аутентифікацію вже увімкнено' });
  }

  // Секрет зберігається, але 2FA вмикається лише після підтвердження кодом
  const secret = generateSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });

  res.json({ secret, otpauthUrl: otpauthUrl({ secret, email: user.email }) });
}

export async function enableTwoFactor(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

  if (user.twoFactorEnabled) {
    return res.status(409).json({ error: 'Двофакторну аутентифікацію вже увімкнено' });
  }
  if (!user.twoFactorSecret) {
    return res.status(400).json({ error: 'Спершу викличте /api/auth/2fa/setup' });
  }
  if (!verifyTotp(user.twoFactorSecret, req.body.code)) {
    return res.status(400).json({ error: 'Невірний код' });
  }

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  await logAction(req, 'TWO_FACTOR_ENABLED');

  res.json({ message: 'Двофакторну аутентифікацію увімкнено' });
}

export async function disableTwoFactor(req, res) {
  const { password, code } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

  if (!user.twoFactorEnabled) {
    return res.status(400).json({ error: 'Двофакторну аутентифікацію не увімкнено' });
  }

  // Для вимкнення потрібні і пароль, і код
  if (!(await comparePassword(password, user.password)) || !verifyTotp(user.twoFactorSecret, code)) {
    return res.status(400).json({ error: 'Невірний пароль або код' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  await logAction(req, 'TWO_FACTOR_DISABLED');

  res.json({ message: 'Двофакторну аутентифікацію вимкнено' });
}