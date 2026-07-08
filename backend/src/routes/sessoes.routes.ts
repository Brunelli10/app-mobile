import { Router } from 'express';
import {
  updateStatusSessao,
  updateNotasSessao,
  updateSubstitutoSessao,
  updateSupervisorNotaSessao,
  getEstagiarios,
  getSessoesParaSupervisao
} from '../controllers/sessoes.controller';
import { getGradeEstagiario } from '../controllers/grade-horarios.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/supervisao', authMiddleware, getSessoesParaSupervisao as any);
router.get('/estagiarios', authMiddleware, getEstagiarios as any);
router.get('/estagiarios/:id/grade-horarios', authMiddleware, getGradeEstagiario as any);
router.patch('/:id/status', authMiddleware, updateStatusSessao as any);
router.patch('/:id/notas', authMiddleware, updateNotasSessao as any);
router.patch('/:id/substituto', authMiddleware, updateSubstitutoSessao as any);
router.patch('/:id/supervisor-nota', authMiddleware, updateSupervisorNotaSessao as any);

export default router;
