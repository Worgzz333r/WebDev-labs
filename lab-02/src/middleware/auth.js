import { verifyAccessToken } from '../utils/jwt.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен аутентифікації відсутній' });
  }

  try {
    req.user = verifyAccessToken(authHeader.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Недійсний або прострочений токен' });
  }
}