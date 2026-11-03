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

router.get('/', authenticate, authorize('ADMIN', 'TEACHER', 'STUDENT'), controller.getAll);
router.get('/:id', authenticate, controller.getOne);
router.post('/', authenticate, authorize('ADMIN', 'TEACHER'), validate(attendanceCreateSchema), controller.create);
router.put('/:id', authenticate, authorize('ADMIN', 'TEACHER'), validate(attendanceUpdateSchema), controller.update);
router.delete('/:id', authenticate, authorize('ADMIN', 'TEACHER'), controller.remove);
router.post('/:id/document', authenticate, authorize('STUDENT'), upload.single('file'), controller.attachDocument);

export default router;