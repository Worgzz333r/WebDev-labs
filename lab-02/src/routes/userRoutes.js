import express from 'express';
import * as controller from '../controllers/userController.js';
import validate from '../utils/validate.js';
import { userCreateSchema, userUpdateSchema } from '../utils/schemas.js';

const router = express.Router();

router.param('id', (req, res, next, value) => {
  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
});

router.get('/', controller.getAll);
router.get('/:id', controller.getOne);
router.post('/', validate(userCreateSchema), controller.create);
router.put('/:id', validate(userUpdateSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;