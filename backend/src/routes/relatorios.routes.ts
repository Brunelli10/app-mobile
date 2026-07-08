import { Router } from 'express';
import { getRelatorioSessoes, getRelatorioEstagiarios, getRelatorioPacientes, getRelatorioSupervisao } from '../controllers/relatorios.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/sessoes', authMiddleware, getRelatorioSessoes as any);
router.get('/estagiarios', authMiddleware, getRelatorioEstagiarios as any);
router.get('/pacientes', authMiddleware, getRelatorioPacientes as any);
router.get('/supervisao', authMiddleware, getRelatorioSupervisao as any);

export default router;
