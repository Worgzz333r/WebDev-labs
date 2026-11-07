import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  changePassword,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
} from '../controllers/authController.js';
import validate from '../utils/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  twoFactorCodeSchema,
  disableTwoFactorSchema,
} from '../utils/schemas.js';


const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Реєстрація (завжди створює STUDENT)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, fullName]
 *             properties:
 *               email: { type: string, example: student@example.com }
 *               password: { type: string, minLength: 8, example: password123 }
 *               fullName: { type: string, example: Іван Студент }
 *               groupId: { type: integer }
 *     responses:
 *       201:
 *         description: Користувача створено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *                 tokens: { $ref: '#/components/schemas/Tokens' }
 *       400:
 *         description: Помилка валідації
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Email уже зайнятий
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/register', validate(registerSchema), register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Вхід
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@example.com }
 *               password: { type: string, example: admin12345 }
 *               code:
 *                 type: string
 *                 example: '123456'
 *                 description: Код із застосунку-автентифікатора, обов'язковий якщо увімкнено 2FA
 *     responses:
 *       200:
 *         description: Успішний вхід
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *                 tokens: { $ref: '#/components/schemas/Tokens' }
 *       400:
 *         description: Помилка валідації
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Невірний email або пароль, або потрібен/невірний код 2FA (у відповіді twoFactorRequired true)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/login', validate(loginSchema), login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Оновлення токенів (ротація refresh токена)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Нова пара токенів, старий refresh токен відкликано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tokens: { $ref: '#/components/schemas/Tokens' }
 *       400:
 *         description: Помилка валідації
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Недійсний або відкликаний refresh токен
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/refresh', validate(refreshSchema), refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Вихід (відкликає refresh токен)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       204:
 *         description: Успішний вихід, тіла відповіді немає
 */
router.post('/logout', logout);

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Зміна пароля (відкликає всі refresh токени)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Пароль змінено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       400:
 *         description: Помилка валідації або невірний поточний пароль
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Токен відсутній або недійсний
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

/**
 * @openapi
 * /api/auth/2fa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Почати налаштування 2FA (повертає секрет і otpauth URL для QR-коду)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Секрет згенеровано, 2FA ще не ввімкнено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secret: { type: string, example: JBSWY3DPEHPK3PXP }
 *                 otpauthUrl: { type: string }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       409:
 *         description: 2FA вже ввімкнено
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/2fa/setup', authenticate, setupTwoFactor);

/**
 * @openapi
 * /api/auth/2fa/enable:
 *   post:
 *     tags: [Auth]
 *     summary: Підтвердити налаштування кодом і ввімкнути 2FA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: '123456' }
 *     responses:
 *       200:
 *         description: 2FA увімкнено
 *       400:
 *         description: Невірний код або не виконано /2fa/setup
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       409:
 *         description: 2FA вже ввімкнено
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/2fa/enable', authenticate, validate(twoFactorCodeSchema), enableTwoFactor);

/**
 * @openapi
 * /api/auth/2fa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: Вимкнути 2FA (потрібні пароль і код)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, code]
 *             properties:
 *               password: { type: string }
 *               code: { type: string, example: '123456' }
 *     responses:
 *       200:
 *         description: 2FA вимкнено
 *       400:
 *         description: Невірний пароль або код, або 2FA не ввімкнено
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post('/2fa/disable', authenticate, validate(disableTwoFactorSchema), disableTwoFactor);

export default router;