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

router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, controller.getOne);
router.post('/', authenticate, authorize('ADMIN'), validate(nameSchema), controller.create);
router.put('/:id', authenticate, authorize('ADMIN'), validate(nameSchema), controller.update);
router.delete('/:id', authenticate, authorize('ADMIN'), controller.remove);

export default router;