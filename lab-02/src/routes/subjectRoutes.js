import express from 'express';
import * as controller from '../controllers/subjectController.js';
import validate from '../utils/validate.js';
import { nameSchema } from '../utils/schemas.js';
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
 * /api/subjects:
 *   get:
 *     tags: [Subjects]
 *     summary: Список предметів з пошуком і пагінацією (усі авторизовані)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Пошук за назвою (без урахування регістру)
 *         example: бази
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [id, name], default: name }
 *       - $ref: '#/components/parameters/Order'
 *     responses:
 *       200:
 *         description: Сторінка предметів
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Subject' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/', authenticate, controller.getAll);

/**
 * @openapi
 * /api/subjects/{id}:
 *   get:
 *     tags: [Subjects]
 *     summary: Отримати предмет (усі авторизовані)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Предмет
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Subject' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', authenticate, controller.getOne);

/**
 * @openapi
 * /api/subjects:
 *   post:
 *     tags: [Subjects]
 *     summary: Створити предмет (ADMIN)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ['name']
 *             properties:
 *               name: { type: string, maxLength: 100, example: Бази даних }
 *     responses:
 *       201:
 *         description: Предмет створено
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Subject' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409:
 *         description: Предмет з такою назвою вже існує
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', authenticate, authorize('ADMIN'), validate(nameSchema), controller.create);

/**
 * @openapi
 * /api/subjects/{id}:
 *   put:
 *     tags: [Subjects]
 *     summary: Оновити предмет (ADMIN)
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
 *           schema:
 *             type: object
 *             required: ['name']
 *             properties:
 *               name: { type: string, maxLength: 100, example: Бази даних }
 *     responses:
 *       200:
 *         description: Предмет оновлено
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Subject' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409:
 *         description: Предмет з такою назвою вже існує
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.put('/:id', authenticate, authorize('ADMIN'), validate(nameSchema), controller.update);

/**
 * @openapi
 * /api/subjects/{id}:
 *   delete:
 *     tags: [Subjects]
 *     summary: Видалити предмет (ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Предмет видалено, тіла відповіді немає
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/:id', authenticate, authorize('ADMIN'), controller.remove);

export default router;