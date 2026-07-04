import { Router } from 'express';
import { getMe, updateMe, updateSenha } from '../controllers/me.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getMe as any);
router.patch('/', authMiddleware, updateMe as any);
router.patch('/senha', authMiddleware, updateSenha as any);

export default router;
