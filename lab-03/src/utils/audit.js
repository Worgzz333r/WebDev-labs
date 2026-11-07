import prisma from './prisma.js';

// Записує дію користувача в журнал. Збій логування не повинен ламати основний запит.
// У details ніколи не передавайте паролі, токени та інші секрети.
export async function logAction(req, action, { entity, entityId, userId, details } = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity: entity ?? null,
        entityId: entityId ?? null,
        userId: userId ?? req.user?.userId ?? null,
        ip: req.ip ?? null,
        details: details ?? undefined,
      },
    });
  } catch (error) {
    console.error('Не вдалося записати журнал дій:', error.message);
  }
}