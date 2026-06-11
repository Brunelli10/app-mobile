import { Router } from 'express';
import { getSalas, createSala, getDisponibilidadeSala, deleteSala } from '../controllers/salas.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/error.middleware';
import { criarSalaSchema } from '../middleware/validation.schemas';

const router = Router();

router.get('/', authMiddleware, getSalas as any);
router.post('/', authMiddleware, validate(criarSalaSchema), createSala as any);
router.get('/:salaId/disponibilidade', authMiddleware, getDisponibilidadeSala as any);
router.delete('/:salaId', authMiddleware, deleteSala as any);

export default router;
