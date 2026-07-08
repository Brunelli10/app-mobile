import request from 'supertest';
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import authRoutes from '../routes/auth.routes';
import salasRoutes from '../routes/salas.routes';
import agendamentosRoutes from '../routes/agendamentos.routes';
import agendaRoutes from '../routes/agenda.routes';
import sessoesRoutes from '../routes/sessoes.routes';
import pacientesRoutes from '../routes/pacientes.routes';
import dashboardRoutes from '../routes/dashboard.routes';
import configuracaoRoutes from '../routes/configuracao.routes';
import usuariosRoutes from '../routes/usuarios.routes';
import relatoriosRoutes from '../routes/relatorios.routes';
import notificacoesRoutes from '../routes/notificacoes.routes';
import meRoutes from '../routes/me.routes';
import { globalErrorHandler } from '../middleware/error.middleware';
import { PrismaClient } from '@prisma/client';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/configuracao', configuracaoRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/salas', salasRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/meus-agendamentos', agendaRoutes);
app.use('/api/sessoes', sessoesRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/me', meRoutes);
app.use(globalErrorHandler);

const prisma = new PrismaClient();

describe('👥 Auditoria Arquitetural — Matriz de Acesso dos Atores', () => {
  let rootToken = '';
  let estagiarioToken = '';
  let pacienteToken = '';
  let pacienteUserId = 0;
  let targetPacienteId = 0;

  const TS = Date.now();
  const rootEmail = `root.actor.${TS}@clinica.com`;
  const estagiarioEmail = `est.actor.${TS}@clinica.com`;
  const pacienteEmail = `pac.actor.${TS}@clinica.com`;

  beforeAll(async () => {
    // 1. Criar e Logar ROOT/GESTOR
    const bcrypt = require('bcryptjs');
    const rootHash = await bcrypt.hash('senha123', 10);
    const rootUser = await prisma.usuario.create({
      data: {
        nome: 'Gestor Auditoria',
        email: rootEmail,
        senhaHash: rootHash,
        perfil: 'ROOT',
        status: 'ATIVO',
      },
    });

    const loginRootRes = await request(app)
      .post('/api/auth/login')
      .send({ email: rootEmail, password: 'senha123' });
    rootToken = loginRootRes.body.token;

    // 2. Registrar, Aprovar e Logar ESTAGIÁRIO
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Estagiario Auditoria',
        email: estagiarioEmail,
        password: 'senha123',
        matricula: `MAT-${TS}`,
        semestre: '7',
      });

    // Buscar o ID do usuário criado para poder aprovar
    const estUser = await prisma.usuario.findFirst({ where: { email: estagiarioEmail } });
    if (estUser) {
      await prisma.usuario.update({
        where: { id: estUser.id },
        data: { status: 'ATIVO' },
      });
      await prisma.estagiario.updateMany({
        where: { usuarioId: estUser.id },
        data: { ativo: true },
      });
    }

    const loginEstRes = await request(app)
      .post('/api/auth/login')
      .send({ email: estagiarioEmail, password: 'senha123' });
    estagiarioToken = loginEstRes.body.token;

    // 3. Convidar e Logar PACIENTE
    const inviteRes = await request(app)
      .post('/api/pacientes/convite')
      .set('Authorization', `Bearer ${rootToken}`)
      .send({ nome: 'Paciente Auditoria', email: pacienteEmail });

    pacienteUserId = inviteRes.body.usuarioId;

    const loginPacRes = await request(app)
      .post('/api/auth/login')
      .send({ email: pacienteEmail, password: 'clinica123' });
    pacienteToken = loginPacRes.body.token;

    // 4. Criar um registro na tabela Paciente no BD
    const targetPaciente = await prisma.paciente.create({
      data: {
        nome: 'Paciente Teste Alvo',
        dataNascimento: new Date('1990-05-15'),
        cpf: `CPF-${TS}`.slice(0, 11),
        telefone: '11999999999',
        tipoAtendimento: 'INDIVIDUAL',
        ativo: true,
      },
    });
    targetPacienteId = targetPaciente.id;
  });

  afterAll(async () => {
    // Limpar dados criados
    await prisma.paciente.deleteMany({
      where: { nome: { contains: 'Auditoria' } },
    });
    await prisma.paciente.deleteMany({
      where: { id: targetPacienteId },
    });
    await prisma.estagiario.deleteMany({
      where: { usuario: { email: estagiarioEmail } }
    });
    await prisma.usuario.deleteMany({
      where: { email: { in: [rootEmail, estagiarioEmail, pacienteEmail] } },
    });
    await prisma.$disconnect();
  });

  describe('🔑 Camada de Controle: Acesso de Gestor/Root (Acesso Total)', () => {
    test('Deve permitir listar pacientes', async () => {
      const res = await request(app)
        .get('/api/pacientes')
        .set('Authorization', `Bearer ${rootToken}`);
      expect(res.status).toBe(200);
    });

    test('Deve permitir visualizar perfil de qualquer paciente', async () => {
      const res = await request(app)
        .get(`/api/pacientes/${targetPacienteId}/perfil`)
        .set('Authorization', `Bearer ${rootToken}`);
      expect(res.status).toBe(200);
    });

    test('Deve permitir visualizar dashboard administrativo', async () => {
      const res = await request(app)
        .get('/api/dashboard/metricas')
        .set('Authorization', `Bearer ${rootToken}`);
      expect(res.status).toBe(200);
    });

    test('Deve permitir emitir relatórios', async () => {
      const res = await request(app)
        .get('/api/relatorios/sessoes')
        .set('Authorization', `Bearer ${rootToken}`);
      expect(res.status).toBe(200);
    });

    test('Deve permitir listar usuários do sistema', async () => {
      const res = await request(app)
        .get('/api/usuarios')
        .set('Authorization', `Bearer ${rootToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('🔑 Camada de Controle: Acesso de Estagiário (Acesso Parcial)', () => {
    test('Deve permitir listar pacientes para atendimento', async () => {
      const res = await request(app)
        .get('/api/pacientes')
        .set('Authorization', `Bearer ${estagiarioToken}`);
      expect(res.status).toBe(200);
    });

    test('Deve permitir visualizar perfil de paciente', async () => {
      const res = await request(app)
        .get(`/api/pacientes/${targetPacienteId}/perfil`)
        .set('Authorization', `Bearer ${estagiarioToken}`);
      expect(res.status).toBe(200);
    });

    test('NÃO deve permitir acessar dashboard administrativo', async () => {
      const res = await request(app)
        .get('/api/dashboard/metricas')
        .set('Authorization', `Bearer ${estagiarioToken}`);
      expect(res.status).toBe(403);
    });

    test('NÃO deve permitir emitir relatórios administrativos', async () => {
      const res = await request(app)
        .get('/api/relatorios/sessoes')
        .set('Authorization', `Bearer ${estagiarioToken}`);
      expect(res.status).toBe(403);
    });

    test('NÃO deve permitir listar todos os usuários do sistema', async () => {
      const res = await request(app)
        .get('/api/usuarios')
        .set('Authorization', `Bearer ${estagiarioToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('🛡️ Camada de Segurança: Restrição de Pacientes (Acesso Protegido)', () => {
    test('NÃO deve permitir listar outros pacientes (Confidencialidade)', async () => {
      const res = await request(app)
        .get('/api/pacientes')
        .set('Authorization', `Bearer ${pacienteToken}`);
      expect(res.status).toBe(403);
    });

    test('NÃO deve permitir visualizar o perfil de outros pacientes (Privacidade)', async () => {
      const res = await request(app)
        .get(`/api/pacientes/${targetPacienteId}/perfil`)
        .set('Authorization', `Bearer ${pacienteToken}`);
      expect(res.status).toBe(403);
    });

    test('NÃO deve permitir acessar dashboard administrativo', async () => {
      const res = await request(app)
        .get('/api/dashboard/metricas')
        .set('Authorization', `Bearer ${pacienteToken}`);
      expect(res.status).toBe(403);
    });

    test('NÃO deve permitir emitir relatórios', async () => {
      const res = await request(app)
        .get('/api/relatorios/sessoes')
        .set('Authorization', `Bearer ${pacienteToken}`);
      expect(res.status).toBe(403);
    });
  });
});
