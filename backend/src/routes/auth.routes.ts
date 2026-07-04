import { Router } from 'express';
import { login, register, forgotPassword } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register as any);
router.post('/login', login as any);
router.post('/esqueci-senha', forgotPassword as any);

export default router;
