import { Server } from 'socket.io';
import prisma from '../utils/prisma.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { registerRoomHandlers } from './handlers/roomHandlers.js';
import { registerPresenceHandlers } from './handlers/presenceHandlers.js';
import { broadcastPresence, isOnline } from './presence.js';
import { registerEventHandlers } from './handlers/eventHandlers.js';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Автентифікація: клієнт передає JWT у auth.token
  io.use(async (socket, next) => {
    try {
      socket.user = verifyAccessToken(socket.handshake.auth?.token);
      // Користувача могли видалити, поки токен ще дійсний
      const dbUser = await prisma.user.findUnique({
        where: { id: socket.user.userId },
        select: { groupId: true },
      });
      if (!dbUser) return next(new Error('unauthorized'));
      socket.data.userId = socket.user.userId;
      socket.data.groupId = dbUser.groupId;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId, groupId } = socket.data;

    // Персональна кімната для сповіщень, кімната групи, кімната персоналу
    socket.join(`user:${userId}`);
    if (groupId) socket.join(`group:${groupId}`);
    if (socket.user.role !== 'STUDENT') socket.join('staff');

    // Токен має термін дії: коли він спливає, повідомляємо клієнта й розриваємо з'єднання,
    // клієнт оновлює токен (refresh) і підключається з новим auth.token
    const msLeft = socket.user.exp * 1000 - Date.now();
    const expiryTimer = setTimeout(() => {
      socket.emit('auth:expired');
      socket.disconnect(true);
    }, Math.min(Math.max(msLeft, 0), 2 ** 31 - 1)); // setTimeout не приймає більше ~24 днів
    socket.on('disconnect', () => clearTimeout(expiryTimer));

    registerRoomHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerEventHandlers(io, socket);

    // Перше з'єднання користувача = він щойно став онлайн
    const sockets = await io.in(`user:${userId}`).fetchSockets();
    if (sockets.length === 1) broadcastPresence(io, socket, true);

    // 'disconnect' спрацьовує вже після виходу з кімнат: нуль з'єднань = став офлайн
    socket.on('disconnect', async () => {
      if (!(await isOnline(io, userId))) broadcastPresence(io, socket, false);
    });
  });

  return io;
}