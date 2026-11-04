import express from 'express';
import * as controller from '../controllers/groupController.js';
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
 * /api/groups:
 *   get:
 *     tags: [Groups]
 *     summary: Список груп (усі авторизовані)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список груп
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Group' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/', authenticate, controller.getAll);

/**
 * @openapi
 * /api/groups/{id}:
 *   get:
 *     tags: [Groups]
 *     summary: Група зі студентами (усі авторизовані)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Група
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Group' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', authenticate, controller.getOne);

/**
 * @openapi
 * /api/groups:
 *   post:
 *     tags: [Groups]
 *     summary: Створити групу (ADMIN)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/NameInput' }
 *     responses:
 *       201:
 *         description: Групу створено
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Group' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409:
 *         description: Група з такою назвою вже існує
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', authenticate, authorize('ADMIN'), validate(nameSchema), controller.create);

/**
 * @openapi
 * /api/groups/{id}:
 *   put:
 *     tags: [Groups]
 *     summary: Оновити групу (ADMIN)
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
 *           schema: { $ref: '#/components/schemas/NameInput' }
 *     responses:
 *       200:
 *         description: Групу оновлено
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Group' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409:
 *         description: Група з такою назвою вже існує
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.put('/:id', authenticate, authorize('ADMIN'), validate(nameSchema), controller.update);

/**
 * @openapi
 * /api/groups/{id}:
 *   delete:
 *     tags: [Groups]
 *     summary: Видалити групу (ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Групу видалено, тіла відповіді немає
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/:id', authenticate, authorize('ADMIN'), controller.remove);

export default router;