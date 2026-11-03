import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '../utils/prisma.js';

export const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не надано' });
  }

  try {
    const file = await prisma.file.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedBy: req.user.userId,
      },
    });

    res.status(201).json({ message: 'Файл успішно завантажено', file });
  } catch (error) {
    // Якщо запис у БД не вдався, не залишаємо «осиротілий» файл на диску
    await fs.unlink(req.file.path).catch(() => {});
    throw error;
  }
};

// Повертає файл, якщо він існує і в користувача є доступ; інакше сам відповідає помилкою
async function findAccessible(req, res, { ownerOrAdminOnly = false } = {}) {
  const file = await prisma.file.findUnique({ where: { id: Number(req.params.id) } });
  if (!file) {
    res.status(404).json({ error: 'Файл не знайдено' });
    return null;
  }

  const { role, userId } = req.user;
  const isOwner = file.uploadedBy === userId;
  const allowed = ownerOrAdminOnly
    ? isOwner || role === 'ADMIN'
    : isOwner || role === 'ADMIN' || role === 'TEACHER';

  if (!allowed) {
    res.status(403).json({ error: 'Недостатньо прав для доступу до файлу' });
    return null;
  }
  return file;
}

export const getFile = async (req, res) => {
  const file = await findAccessible(req, res);
  if (!file) return;
  res.sendFile(path.resolve(file.path));
};

export const deleteFile = async (req, res) => {
  const file = await findAccessible(req, res, { ownerOrAdminOnly: true });
  if (!file) return;

  await prisma.file.delete({ where: { id: file.id } }); // Document видаляється каскадом
  await fs.unlink(file.path).catch(() => {});

  res.json({ message: 'Файл успішно видалено' });
};