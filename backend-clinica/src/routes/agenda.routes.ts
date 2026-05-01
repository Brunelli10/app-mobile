import { Router } from 'express';
import { getMinhaAgenda } from '../controllers/agenda.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
// Bloqueia e só retorna dados do próprio dono do Token
router.get('/', authMiddleware, getMinhaAgenda as any);

export default router;
