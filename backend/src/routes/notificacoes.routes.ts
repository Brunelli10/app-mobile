import { Router } from 'express';
import { getNotificacoes, getNotificacoesCount, marcarComoLida, marcarTodasLidas } from '../controllers/notificacoes.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getNotificacoes as any);
router.get('/count', authMiddleware, getNotificacoesCount as any);
router.put('/lidas/todas', authMiddleware, marcarTodasLidas as any);
router.put('/:id/lida', authMiddleware, marcarComoLida as any);

export default router;
