import express from 'express';
import * as controller from '../controllers/fileController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.param('id', (req, res, next, value) => {
  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
});

router.post('/upload', authenticate, upload.single('file'), controller.uploadFile);
router.get('/:id', authenticate, controller.getFile);
router.delete('/:id', authenticate, controller.deleteFile);

export default router;