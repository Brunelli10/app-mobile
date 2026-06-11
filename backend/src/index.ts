import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import salasRoutes from './routes/salas.routes';
import agendamentosRoutes from './routes/agendamentos.routes';
import agendaRoutes from './routes/agenda.routes';
import sessoesRoutes from './routes/sessoes.routes';
import pacientesRoutes from './routes/pacientes.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { globalErrorHandler } from './middleware/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[BACKEND LOG] ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/salas', salasRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/meus-agendamentos', agendaRoutes);
app.use('/api/sessoes', sessoesRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ─── Middleware Global de Erros (deve ser o último) ───────────────────────────
app.use(globalErrorHandler);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Clinica Backend rodando na porta ${PORT}`);
});
