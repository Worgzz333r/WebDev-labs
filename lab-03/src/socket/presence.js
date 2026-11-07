// Онлайн = є хоча б одне з'єднання в персональній кімнаті користувача
export async function isOnline(io, userId) {
  return (await io.in(`user:${userId}`).fetchSockets()).length > 0;
}

// Персонал бачить усіх онлайн, студент лише свою групу
export async function listOnline(io, user) {
  const sockets = await io.fetchSockets();
  const staff = user.role === 'ADMIN' || user.role === 'TEACHER';
  const ids = sockets
    .filter((s) => staff || (user.groupId && s.data.groupId === user.groupId))
    .map((s) => s.data.userId);
  return [...new Set(ids)];
}

// Хто отримує сповіщення про зміну статусу: персонал і група користувача
export function broadcastPresence(io, socket, online) {
  const targets = ['staff'];
  if (socket.data.groupId) targets.push(`group:${socket.data.groupId}`);
  io.to(targets).emit('presence:update', {
    userId: socket.data.userId,
    online,
    at: new Date().toISOString(),
  });
}