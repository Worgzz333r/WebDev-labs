import express from 'express';
import * as controller from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.param('id', (req, res, next, value) => {
  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
});

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Мої сповіщення (нові першими), з пагінацією та лічильником непрочитаних
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: unread
 *         schema: { type: boolean }
 *         description: true — лише непрочитані
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [ATTENDANCE, LESSON, SYSTEM] }
 *     responses:
 *       200: { description: 'Сторінка сповіщень: data, unreadCount, pagination' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/', authenticate, controller.getAll);

/**
 * @openapi
 * /api/notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Позначити всі мої сповіщення прочитаними
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: 'Кількість оновлених: { updated }' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.patch('/read-all', authenticate, controller.markAllRead);

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Позначити моє сповіщення прочитаним
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Оновлене сповіщення }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch('/:id/read', authenticate, controller.markRead);

/**
 * @openapi
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Видалити моє сповіщення
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Видалено }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/:id', authenticate, controller.remove);

export default router;