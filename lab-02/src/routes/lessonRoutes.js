import express from 'express';
import * as controller from '../controllers/lessonController.js';
import validate from '../utils/validate.js';
import { lessonCreateSchema, lessonUpdateSchema } from '../utils/schemas.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

router.param('id', (req, res, next, value) => {
  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
});

/**
 * @openapi
 * /api/lessons:
 *   get:
 *     tags: [Lessons]
 *     summary: Список занять з фільтрами, пошуком і пагінацією (усі авторизовані)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Пошук за темою заняття
 *         example: SQL
 *       - in: query
 *         name: subjectId
 *         schema: { type: integer }
 *       - in: query
 *         name: groupId
 *         schema: { type: integer }
 *       - in: query
 *         name: teacherId
 *         schema: { type: integer }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *         description: Початок періоду (ISO 8601)
 *         example: '2026-10-01'
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *         description: Кінець періоду включно (ISO 8601)
 *         example: '2026-10-31'
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [id, date, topic], default: date }
 *       - $ref: '#/components/parameters/Order'
 *     responses:
 *       200:
 *         description: Сторінка занять
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Lesson' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/', authenticate, controller.getAll);

/**
 * @openapi
 * /api/lessons/{id}:
 *   get:
 *     tags: [Lessons]
 *     summary: Заняття з відвідуваністю (усі авторизовані)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Заняття разом із записами відвідуваності
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Lesson' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', authenticate, controller.getOne);

/**
 * @openapi
 * /api/lessons:
 *   post:
 *     tags: [Lessons]
 *     summary: Створити заняття (ADMIN, TEACHER)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LessonCreate' }
 *     responses:
 *       201:
 *         description: Заняття створено
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Lesson' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post('/', authenticate, authorize('ADMIN', 'TEACHER'), validate(lessonCreateSchema), controller.create);

/**
 * @openapi
 * /api/lessons/{id}:
 *   put:
 *     tags: [Lessons]
 *     summary: Оновити заняття (ADMIN, TEACHER)
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
 *           schema: { $ref: '#/components/schemas/LessonUpdate' }
 *     responses:
 *       200:
 *         description: Заняття оновлено
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Lesson' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.put('/:id', authenticate, authorize('ADMIN', 'TEACHER'), validate(lessonUpdateSchema), controller.update);

/**
 * @openapi
 * /api/lessons/{id}:
 *   delete:
 *     tags: [Lessons]
 *     summary: Видалити заняття (ADMIN, TEACHER)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Заняття видалено, тіла відповіді немає
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/:id', authenticate, authorize('ADMIN', 'TEACHER'), controller.remove);

export default router;