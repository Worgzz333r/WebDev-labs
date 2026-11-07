import express from 'express';
import * as controller from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

/**
 * @openapi
 * /api/reports/attendance-summary:
 *   get:
 *     tags: [Reports]
 *     summary: Зведення відвідуваності студентів групи (ADMIN, TEACHER)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: 'По кожному студенту: total, present, absent, late, excused, attendancePercent' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/attendance-summary', authenticate, authorize('ADMIN', 'TEACHER'), controller.attendanceSummary);

export default router;