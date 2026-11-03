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

router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, controller.getOne);
router.post('/', authenticate, authorize('ADMIN', 'TEACHER'), validate(lessonCreateSchema), controller.create);
router.put('/:id', authenticate, authorize('ADMIN', 'TEACHER'), validate(lessonUpdateSchema), controller.update);
router.delete('/:id', authenticate, authorize('ADMIN', 'TEACHER'), controller.remove);

export default router;