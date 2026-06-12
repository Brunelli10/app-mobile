import { Router } from 'express';
import { getConfiguracao, updateConfiguracao } from '../controllers/configuracao.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getConfiguracao as any);
router.put('/', authMiddleware, updateConfiguracao as any);

export default router;
