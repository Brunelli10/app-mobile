import { Router } from 'express';
import { getUsuarios, updateUsuarioStatus, updateUsuarioRole } from '../controllers/usuarios.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getUsuarios as any);
router.put('/:id/status', authMiddleware, updateUsuarioStatus as any);
router.put('/:id/role', authMiddleware, updateUsuarioRole as any);

export default router;
