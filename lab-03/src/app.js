import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import groupRoutes from './routes/groupRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import userRoutes from './routes/userRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import errorHandler from './utils/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import notificationRoutes from './routes/notificationRoutes.js';
import prisma from './utils/prisma.js';
import reportRoutes from './routes/reportRoutes.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Забагато запитів з цієї IP-адреси' },
});
app.use('/api/', limiter);

// Захист від підбору паролів, refresh-токенів і кодів 2FA: рахуються лише НЕвдалі спроби (4xx),
// успішні запити ліміт не витрачають, тому звичайні користувачі його не відчують
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Забагато невдалих спроб, спробуйте пізніше' },
});
app.use(
  ['/api/auth/login', '/api/auth/refresh', '/api/auth/change-password', '/api/auth/2fa'],
  authLimiter,
);

// Перевірка стану для хостингу та моніторингу (до limiter, щоб не витрачати ліміт)
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ status: 'error', db: 'unavailable' });
  }
});

app.use(express.json());

app.use('/api/groups', groupRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});
app.use(errorHandler);

export default app;