import { Router } from 'express';
import { getMe, updateMe, updateSenha } from '../controllers/me.controller';
import { getMinhaGrade, updateMinhaGrade } from '../controllers/grade-horarios.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getMe as any);
router.patch('/', authMiddleware, updateMe as any);
router.patch('/senha', authMiddleware, updateSenha as any);

// Grade de Horários do estagiário logado
router.get('/grade-horarios', authMiddleware, getMinhaGrade as any);
router.put('/grade-horarios', authMiddleware, updateMinhaGrade as any);

export default router;
