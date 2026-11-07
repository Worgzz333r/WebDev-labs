import express from 'express';
import * as controller from '../controllers/fileController.js';
import { authenticate } from '../middleware/auth.js';
import { upload, MAX_FILES } from '../middleware/upload.js';

const router = express.Router();

router.param('id', (req, res, next, value) => {
  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
});

/**
 * @openapi
 * /api/files/upload:
 *   post:
 *     tags: [Files]
 *     summary: Завантажити файл (jpeg, png, gif, pdf)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Файл завантажено, повертається { message, file }
 *       400:
 *         description: Файл не надано, непідтримуваний тип або завеликий розмір
 *       401:
 *         description: Не авторизовано
 */
router.post('/upload', authenticate, upload.single('file'), controller.uploadFile);

/**
 * @openapi
 * /api/files/upload-multiple:
 *   post:
 *     tags: [Files]
 *     summary: Завантажити кілька файлів одним запитом (до MAX_FILES, за замовчуванням 5)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Файли завантажено, повертається { message, files }
 *       400:
 *         description: Файли не надано, непідтримуваний тип, завеликий файл або забагато файлів
 *       401:
 *         description: Не авторизовано
 */
router.post('/upload-multiple', authenticate, upload.array('files', MAX_FILES), controller.uploadFiles);

/**
 * @openapi
 * /api/files/{id}:
 *   get:
 *     tags: [Files]
 *     summary: Отримати файл (власник, TEACHER, ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Вміст файлу
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Некоректний id
 *       401:
 *         description: Не авторизовано
 *       403:
 *         description: Недостатньо прав
 *       404:
 *         description: Файл не знайдено
 */
router.get('/:id', authenticate, controller.getFile);

/**
 * @openapi
 * /api/files/{id}:
 *   put:
 *     tags: [Files]
 *     summary: Оновити файл - замінити вміст і/або змінити ім'я (власник або ADMIN)
 *     description: Потрібна хоча б одна зміна - поле file або originalName. Старий файл на диску видаляється.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary, description: Новий вміст (jpeg, png, gif, pdf) }
 *               originalName: { type: string, maxLength: 255, example: dovidka.pdf }
 *     responses:
 *       200:
 *         description: Файл оновлено, повертається { message, file }
 *       400:
 *         description: Немає змін, некоректне ім'я, непідтримуваний тип або завеликий файл
 *       401:
 *         description: Не авторизовано
 *       403:
 *         description: Недостатньо прав (лише власник або ADMIN)
 *       404:
 *         description: Файл не знайдено
 */
router.put('/:id', authenticate, upload.single('file'), controller.updateFile);

/**
 * @openapi
 * /api/files/{id}:
 *   delete:
 *     tags: [Files]
 *     summary: Видалити файл (власник або ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Файл видалено, повертається { message }
 *       400:
 *         description: Некоректний id
 *       401:
 *         description: Не авторизовано
 *       403:
 *         description: Недостатньо прав
 *       404:
 *         description: Файл не знайдено
 */
router.delete('/:id', authenticate, controller.deleteFile);

export default router;