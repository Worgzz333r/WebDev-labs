import express from 'express';
import * as controller from '../controllers/attendanceController.js';
import validate from '../utils/validate.js';
import { attendanceCreateSchema, attendanceUpdateSchema } from '../utils/schemas.js';

const router = express.Router();

router.param('id', (req, res, next, value) => {
  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
});

router.get('/', controller.getAll);
router.get('/:id', controller.getOne);
router.post('/', validate(attendanceCreateSchema), controller.create);
router.put('/:id', validate(attendanceUpdateSchema), controller.update);
router.delete('/:id', controller.remove);

export default router;