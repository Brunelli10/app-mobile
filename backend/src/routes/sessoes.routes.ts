import { Router } from 'express';
import {
  updateStatusSessao,
  updateNotasSessao,
  updateSubstitutoSessao,
  updateSupervisorNotaSessao,
  getEstagiarios
} from '../controllers/sessoes.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/estagiarios', authMiddleware, getEstagiarios as any);
router.patch('/:id/status', authMiddleware, updateStatusSessao as any);
router.patch('/:id/notas', authMiddleware, updateNotasSessao as any);
router.patch('/:id/substituto', authMiddleware, updateSubstitutoSessao as any);
router.patch('/:id/supervisor-nota', authMiddleware, updateSupervisorNotaSessao as any);

export default router;
