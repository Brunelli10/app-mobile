import { Router } from 'express';
import { updateStatusSessao } from '../controllers/sessoes.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Aplica a confirmação (presença/ausência/notas) na sessão
router.patch('/:id/status', authMiddleware, updateStatusSessao);

export default router;
