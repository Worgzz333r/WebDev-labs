const express = require('express');
const controller = require('../controllers/attendanceController');
const validate = require('../utils/validate');
const { attendanceCreateSchema, attendanceUpdateSchema } = require('../utils/schemas');

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

module.exports = router;