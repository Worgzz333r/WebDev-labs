const express = require('express');
const controller = require('../controllers/lessonController');
const validate = require('../utils/validate');
const { lessonCreateSchema, lessonUpdateSchema } = require('../utils/schemas');

const router = express.Router();

router.param('id', (req, res, next, value) => {
  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
});

router.get('/', controller.getAll);
router.get('/:id', controller.getOne);
router.post('/', validate(lessonCreateSchema), controller.create);
router.put('/:id', validate(lessonUpdateSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;