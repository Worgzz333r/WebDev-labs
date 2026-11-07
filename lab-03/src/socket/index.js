import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { canJoin } from './rooms.js';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Автентифікація: клієнт передає JWT у auth.token
  io.use((socket, next) => {
    try {
      socket.user = verifyAccessToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // Персональна кімната для сповіщень
    socket.join(`user:${socket.user.userId}`);

    socket.on('room:join', async (room, ack) => {
      try {
        if (!(await canJoin(socket.user, room))) {
          return ack?.({ ok: false, error: 'forbidden' });
        }
        socket.join(room);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false, error: 'internal' });
      }
    });

    socket.on('room:leave', (room) => socket.leave(room));
  });

  return io;
}