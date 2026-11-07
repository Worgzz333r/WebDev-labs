const express = require('express');
const controller = require('../controllers/userController');
const validate = require('../utils/validate');
const { userCreateSchema, userUpdateSchema } = require('../utils/schemas');

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

module.exports = router;