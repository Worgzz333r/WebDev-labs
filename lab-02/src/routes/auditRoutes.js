import express from 'express';
import * as controller from '../controllers/auditController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

/**
 * @openapi
 * /api/audit-logs:
 *   get:
 *     tags: [Audit]
 *     summary: Журнал дій користувачів з фільтрами та пагінацією (ADMIN)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: userId
 *         schema: { type: integer }
 *         description: Дії конкретного користувача
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *         description: Тип дії (LOGIN_SUCCESS, LOGIN_FAILED, FILE_UPLOADED, ATTENDANCE_CREATED тощо)
 *         example: LOGIN_FAILED
 *       - in: query
 *         name: entity
 *         schema: { type: string }
 *         description: Сутність (User, File, Attendance)
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *         example: '2026-11-01'
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *         example: '2026-11-30'
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [id, createdAt, action], default: createdAt }
 *       - $ref: '#/components/parameters/Order'
 *     responses:
 *       200:
 *         description: Сторінка записів журналу
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer, example: 1 }
 *                       action: { type: string, example: LOGIN_SUCCESS }
 *                       entity: { type: string, nullable: true, example: Attendance }
 *                       entityId: { type: integer, nullable: true }
 *                       userId: { type: integer, nullable: true }
 *                       ip: { type: string, nullable: true, example: '::1' }
 *                       details: { type: object, nullable: true }
 *                       createdAt: { type: string, format: date-time }
 *                       user:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id: { type: integer }
 *                           fullName: { type: string }
 *                           role: { type: string }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', authenticate, authorize('ADMIN'), controller.getAll);

export default router;