import { Router } from 'express';
import { createAgendamento } from '../controllers/agendamentos.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/error.middleware';
import { criarAgendamentoSchema } from '../middleware/validation.schemas';

const router = Router();
router.post('/', authMiddleware, validate(criarAgendamentoSchema), createAgendamento as any);

export default router;
