import prisma from '../utils/prisma.js';

// Повертає true, якщо користувач має право підписатися на кімнату
export async function canJoin(user, room) {
  const [type, rawId] = String(room).split(':');
  const id = Number(rawId);
  if (!['lesson', 'group'].includes(type) || !Number.isInteger(id) || id <= 0) {
    return false; // user:<id> приєднується автоматично, інші назви не дозволені
  }

  if (user.role === 'ADMIN') return true;

  if (user.role === 'TEACHER') {
    const where = type === 'lesson' ? { id, teacherId: user.userId } : { groupId: id, teacherId: user.userId };
    return (await prisma.lesson.findFirst({ where, select: { id: true } })) !== null;
  }

  // STUDENT: лише своя група та заняття своєї групи
  const me = await prisma.user.findUnique({ where: { id: user.userId }, select: { groupId: true } });
  if (!me?.groupId) return false;
  if (type === 'group') return me.groupId === id;
  return (await prisma.lesson.findFirst({ where: { id, groupId: me.groupId }, select: { id: true } })) !== null;
}