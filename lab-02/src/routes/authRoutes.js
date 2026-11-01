import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  changePassword,
} from '../controllers/authController.js';
import validate from '../utils/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
} from '../utils/schemas.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', logout);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

export default router;