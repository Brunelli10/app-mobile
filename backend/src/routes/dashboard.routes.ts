import { Router } from 'express';
import { getDashboardMetrics } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/metricas', authMiddleware, getDashboardMetrics as any);

export default router;
