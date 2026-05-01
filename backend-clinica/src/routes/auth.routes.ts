import { Router } from 'express';
import { login, register } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register as any);
router.post('/login', login as any);

export default router;
