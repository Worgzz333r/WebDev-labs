import express from 'express';
import * as controller from '../controllers/attendanceController.js';
import validate from '../utils/validate.js';
import { attendanceCreateSchema, attendanceUpdateSchema } from '../utils/schemas.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.param('id', (req, res, next, value) => {
  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
});

/**
 * @openapi
 * /api/attendance:
 *   get:
 *     tags: [Attendance]
 *     summary: Список відвідуваності з фільтрами та пагінацією (ADMIN, TEACHER усі; STUDENT лише свої)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: lessonId
 *         schema: { type: integer }
 *       - in: query
 *         name: studentId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PRESENT, ABSENT, LATE, EXCUSED] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Пошук за ПІБ студента
 *         example: Іван
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *         description: Початок періоду за датою заняття
 *         example: '2026-10-01'
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *         description: Кінець періоду включно
 *         example: '2026-10-31'
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [id, status], default: id }
 *       - $ref: '#/components/parameters/Order'
 *     responses:
 *       200:
 *         description: Сторінка записів відвідуваності
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Attendance' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/', authenticate, authorize('ADMIN', 'TEACHER', 'STUDENT'), controller.getAll);

/**
 * @openapi
 * /api/attendance/{id}:
 *   get:
 *     tags: [Attendance]
 *     summary: Запис відвідуваності (ADMIN, TEACHER; STUDENT лише свій)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Запис відвідуваності
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Attendance' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', authenticate, controller.getOne);

/**
 * @openapi
 * /api/attendance:
 *   post:
 *     tags: [Attendance]
 *     summary: Створити запис відвідуваності (ADMIN, TEACHER)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AttendanceCreate' }
 *     responses:
 *       201:
 *         description: Запис створено
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Attendance' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409:
 *         description: Запис для цього студента на цьому занятті вже існує
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', authenticate, authorize('ADMIN', 'TEACHER'), validate(attendanceCreateSchema), controller.create);

/**
 * @openapi
 * /api/attendance/{id}:
 *   put:
 *     tags: [Attendance]
 *     summary: Оновити статус або коментар (ADMIN, TEACHER)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AttendanceUpdate' }
 *     responses:
 *       200:
 *         description: Запис оновлено
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Attendance' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.put('/:id', authenticate, authorize('ADMIN', 'TEACHER'), validate(attendanceUpdateSchema), controller.update);

/**
 * @openapi
 * /api/attendance/{id}:
 *   delete:
 *     tags: [Attendance]
 *     summary: Видалити запис відвідуваності (ADMIN, TEACHER)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Запис видалено, тіла відповіді немає
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/:id', authenticate, authorize('ADMIN', 'TEACHER'), controller.remove);

/**
 * @openapi
 * /api/attendance/{id}/document:
 *   post:
 *     tags: [Attendance]
 *     summary: Прикріпити довідку до власного запису (STUDENT)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Довідку прикріплено, повертається документ разом з файлом
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409:
 *         description: До цього запису вже прикріплено довідку
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/:id/document', authenticate, authorize('STUDENT'), upload.single('file'), controller.attachDocument);

export default router;