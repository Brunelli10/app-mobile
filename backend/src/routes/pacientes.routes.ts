import { Router } from 'express';
import {
  getPacientes,
  createPaciente,
  convitePaciente,
  updateResponsavel,
  getPacientesPendentes,
  aprovarPaciente,
  promoverParaEstagiario,
  getPacientePerfil,
  updatePaciente,
  deletePaciente
} from '../controllers/pacientes.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/error.middleware';
import { criarPacienteSchema, updateResponsavelSchema } from '../middleware/validation.schemas';

const router = Router();

router.get('/', authMiddleware, getPacientes as any);
router.post('/convite', authMiddleware, convitePaciente as any);
router.post('/', authMiddleware, validate(criarPacienteSchema), createPaciente as any);
router.get('/pendentes', authMiddleware, getPacientesPendentes as any);
router.get('/:id/perfil', authMiddleware, getPacientePerfil as any);
router.put('/:id', authMiddleware, validate(criarPacienteSchema), updatePaciente as any);
router.put('/:id/responsavel', authMiddleware, validate(updateResponsavelSchema), updateResponsavel as any);
router.delete('/:id', authMiddleware, deletePaciente as any);
router.patch('/aprovar/:usuarioId', authMiddleware, aprovarPaciente as any);
router.patch('/promover-estagiario/:usuarioId', authMiddleware, promoverParaEstagiario as any);

export default router;
