import prisma from './prisma.js';

// Створює сповіщення в БД і надсилає його в персональну кімнату користувача
export async function notify(io, userId, { type, priority = 'NORMAL', title, body, data }) {
  const notification = await prisma.notification.create({
    data: { userId, type, priority, title, body, data },
  });
  io?.to(`user:${userId}`).emit('notification', notification);
  return notification;
}