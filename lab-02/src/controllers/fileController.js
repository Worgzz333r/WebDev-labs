import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '../utils/prisma.js';
import { logAction } from '../utils/audit.js';

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

    await logAction(req, 'FILE_UPLOADED', {
      entity: 'File',
      entityId: file.id,
      details: { originalName: file.originalName, size: file.size },
    });

    res.status(201).json({ message: 'Файл успішно завантажено', file });
  } catch (error) {
    // Якщо запис у БД не вдався, не залишаємо «осиротілий» файл на диску
    await fs.unlink(req.file.path).catch(() => {});
    throw error;
  }
};

// Рівень 3: завантаження кількох файлів одним запитом (усе або нічого)
export const uploadFiles = async (req, res) => {
  const files = req.files ?? [];
  if (files.length === 0) {
    return res.status(400).json({ error: 'Файли не надано' });
  }

  try {
    const created = await prisma.$transaction(
      files.map((f) =>
        prisma.file.create({
          data: {
            filename: f.filename,
            originalName: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
            path: f.path,
            uploadedBy: req.user.userId,
          },
        }),
      ),
    );

    await logAction(req, 'FILES_UPLOADED', {
      entity: 'File',
      details: { count: created.length, ids: created.map((x) => x.id) },
    });

    res.status(201).json({ message: `Завантажено файлів: ${created.length}`, files: created });
  } catch (error) {
    // Якщо транзакція не вдалась, прибираємо всі файли з диска
    await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
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

  await logAction(req, 'FILE_DELETED', {
    entity: 'File',
    entityId: file.id,
    details: { originalName: file.originalName },
  });

  res.json({ message: 'Файл успішно видалено' });
};