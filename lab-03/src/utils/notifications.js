import prisma from './prisma.js';

// Створює сповіщення в БД і надсилає його в персональну кімнату користувача
export async function notify(io, userId, { type, priority = 'NORMAL', title, body, data }) {
  const notification = await prisma.notification.create({
    data: { userId, type, priority, title, body, data },
  });
  io?.to(`user:${userId}`).emit('notification', notification);
  return notification;
}

// Batch: один запит до БД на всіх одержувачів, далі розсилка по персональних кімнатах
export async function notifyMany(io, userIds, { type, priority = 'NORMAL', title, body, data }) {
  if (userIds.length === 0) return [];
  const notifications = await prisma.notification.createManyAndReturn({
    data: userIds.map((userId) => ({ userId, type, priority, title, body, data })),
  });
  for (const n of notifications) io?.to(`user:${n.userId}`).emit('notification', n);
  return notifications;
}