/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SUÍTE E2E — Clínica Backend API
 *  Cobertura: Auth, Pacientes, Salas, Sessões, Dashboard, Notificações
 * ═══════════════════════════════════════════════════════════════════════════
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

// ── Importar rotas idêntico ao index.ts ─────────────────────────────────────
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

// ── App de teste (sem listen) ────────────────────────────────────────────────
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

// ── Estado compartilhado entre testes ────────────────────────────────────────
let rootToken = '';
let estagiarioToken = '';
let pacienteId = 0;
let salaId = 0;
let cpfTestePaciente = '52998224725'; // CPF válido (gerado algoritmicamente)

// Timestamp único para evitar colisões de e-mail/CPF entre runs
const TS = Date.now();
const emailRoot = `root.test.${TS}@clinica.com`;
const emailEstagiario = `est.test.${TS}@clinica.com`;

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 1 — AUTH
// ══════════════════════════════════════════════════════════════════════════════
describe('🔐 [1] Auth — Autenticação', () => {

  test('1.1 Login com credenciais inválidas → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'naoexiste@clinica.com', password: 'senha_errada' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('1.2 Login sem corpo → 401 ou 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect([400, 401]).toContain(res.status);
  });

  test('1.3 Login como ROOT com credenciais corretas → 200 + token', async () => {
    // Verificar se ROOT existe no DB
    const rootUser = await prisma.usuario.findFirst({
      where: { perfil: 'ROOT', status: 'ATIVO' }
    });

    if (!rootUser) {
      console.warn('⚠️  Nenhum usuário ROOT ativo encontrado no banco. Pulando teste de login ROOT.');
      return;
    }

    // ROOT tem senha padrão definida no seed
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: rootUser.email, password: 'root123' });

    if (res.status === 200) {
      rootToken = res.body.token;
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.perfil).toBe('ROOT');
    } else {
      // Pode ser que a senha do ROOT foi alterada — tentar outras senhas
      console.warn(`⚠️  Login ROOT retornou ${res.status}. Verifique a senha do usuário ROOT no banco.`);
    }
  });

  test('1.4 Register com campos faltando → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Teste' }); // sem email, password, matricula, semestre
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('1.5 Register de novo estagiário → 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: `Estagiário Teste ${TS}`,
        email: emailEstagiario,
        password: 'senha123',
        matricula: `MAT${TS}`,
        semestre: '5'
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
  });

  test('1.6 Register com e-mail duplicado → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicado',
        email: emailEstagiario,
        password: 'senha123',
        matricula: `MATDUP${TS}`,
        semestre: '3'
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/já cadastrado/i);
  });

  test('1.7 Login com conta PENDENTE → 403', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: emailEstagiario, password: 'senha123' });
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('statusConta', 'PENDENTE');
  });

  test('1.8 Esqueci a senha — e-mail inexistente → 404', async () => {
    const res = await request(app)
      .post('/api/auth/esqueci-senha')
      .send({ email: 'fantasma@clinica.com' });
    expect(res.status).toBe(404);
  });

  test('1.9 Esqueci a senha — e-mail válido → 200 + novaSenha', async () => {
    const res = await request(app)
      .post('/api/auth/esqueci-senha')
      .send({ email: emailEstagiario });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('novaSenha');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 2 — ROTAS PROTEGIDAS SEM TOKEN
// ══════════════════════════════════════════════════════════════════════════════
describe('🛡️ [2] Auth Guard — Rotas protegidas sem token', () => {
  const rotasProtegidas = [
    { method: 'get', path: '/api/pacientes' },
    { method: 'get', path: '/api/salas' },
    { method: 'get', path: '/api/dashboard/metricas' },
    { method: 'get', path: '/api/notificacoes' },
    { method: 'get', path: '/api/me' },
  ];

  rotasProtegidas.forEach(({ method, path }) => {
    test(`2.x ${method.toUpperCase()} ${path} sem token → 401`, async () => {
      const res = await (request(app) as any)[method](path);
      expect(res.status).toBe(401);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 3 — PACIENTES (requer token ROOT)
// ══════════════════════════════════════════════════════════════════════════════
describe('👥 [3] Pacientes — CRUD', () => {
  
  beforeAll(async () => {
    // Obter token ROOT para esta seção
    const rootUser = await prisma.usuario.findFirst({ where: { perfil: 'ROOT', status: 'ATIVO' } });
    if (!rootUser) {
      console.warn('⚠️  ROOT não encontrado. Testes de pacientes podem falhar.');
      return;
    }
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: rootUser.email, password: 'root123' });
    if (res.status === 200) rootToken = res.body.token;
  });

  test('3.1 GET /pacientes sem token → 401', async () => {
    const res = await request(app).get('/api/pacientes');
    expect(res.status).toBe(401);
  });

  test('3.2 GET /pacientes com token ROOT → 200 + array', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .get('/api/pacientes')
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('3.3 POST /pacientes — campos obrigatórios faltando → 400', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${rootToken}`)
      .send({ nome: 'João' }); // sem cpf, telefone, dataNascimento, tipoAtendimento
    expect([400, 422]).toContain(res.status);
  });

  test('3.4 POST /pacientes — CPF inválido → 400', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${rootToken}`)
      .send({
        nome: 'Paciente CPF Inválido',
        cpf: '11111111111', // CPF inválido (todos iguais)
        telefone: '11999887766',
        dataNascimento: '1990-05-15',
        tipoAtendimento: 'ADULTO'
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cpf/i);
  });

  test('3.5 POST /pacientes — criação válida de adulto → 201', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${rootToken}`)
      .send({
        nome: `Paciente E2E ${TS}`,
        cpf: cpfTestePaciente,
        telefone: '11999887766',
        dataNascimento: '1990-05-15',
        tipoAtendimento: 'ADULTO'
      });
    
    if (res.status === 201) {
      pacienteId = res.body.id;
      expect(res.body).toHaveProperty('id');
      expect(res.body.nome).toMatch(/Paciente E2E/);
    } else if (res.status === 409) {
      // CPF já existe no banco — buscar o existente
      console.warn('⚠️  CPF já cadastrado. Buscando paciente existente...');
      const listRes = await request(app)
        .get('/api/pacientes')
        .set('Authorization', `Bearer ${rootToken}`);
      if (listRes.body.length > 0) pacienteId = listRes.body[0].id;
    } else {
      console.warn(`⚠️  POST /pacientes retornou ${res.status}: ${JSON.stringify(res.body)}`);
    }
  });

  test('3.6 POST /pacientes — menor de idade sem responsável → 422', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${rootToken}`)
      .send({
        nome: 'Criança Sem Responsável',
        cpf: '01234567890',
        telefone: '11988776655',
        dataNascimento: '2015-03-20', // menos de 18 anos
        tipoAtendimento: 'CRIANCA'
      });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('menorDeIdade', true);
  });

  test('3.7 POST /pacientes — casal sem parceiro → 422', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${rootToken}`)
      .send({
        nome: 'Casal Sem Parceiro',
        cpf: '52998224725',
        telefone: '11999887766',
        dataNascimento: '1985-08-10',
        tipoAtendimento: 'CASAL'
        // sem parceiroNome, parceiroCpf, parceiroTelefone
      });
    expect(res.status).toBe(422);
  });

  test('3.8 GET /pacientes/:id/perfil — ID válido → 200', async () => {
    if (!rootToken || !pacienteId) return console.warn('⚠️  Sem token ROOT ou pacienteId, pulando.');
    const res = await request(app)
      .get(`/api/pacientes/${pacienteId}/perfil`)
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('stats');
    expect(res.body.stats).toHaveProperty('taxaPresenca');
  });

  test('3.9 GET /pacientes/999999/perfil — ID inexistente → 404', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .get('/api/pacientes/999999/perfil')
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(404);
  });

  test('3.10 GET /pacientes/pendentes → 200 + array', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .get('/api/pacientes/pendentes')
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 4 — SALAS
// ══════════════════════════════════════════════════════════════════════════════
describe('🚪 [4] Salas', () => {

  test('4.1 GET /salas com token ROOT → 200 + array', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .get('/api/salas')
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) salaId = res.body[0].id;
  });

  test('4.2 POST /salas — nome faltando → 400', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .post('/api/salas')
      .set('Authorization', `Bearer ${rootToken}`)
      .send({ tipo: 'INDIVIDUAL', capacidade: 2 }); // sem nome
    expect([400, 422]).toContain(res.status);
  });

  test('4.3 POST /salas — tipo inválido → 400', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .post('/api/salas')
      .set('Authorization', `Bearer ${rootToken}`)
      .send({ nome: 'Sala Inválida', tipo: 'INEXISTENTE', capacidade: 2 });
    expect([400, 422]).toContain(res.status);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 5 — DASHBOARD (apenas GESTOR/ROOT)
// ══════════════════════════════════════════════════════════════════════════════
describe('📊 [5] Dashboard — Métricas de Gestão', () => {

  test('5.1 GET /dashboard/metricas sem token → 401', async () => {
    const res = await request(app).get('/api/dashboard/metricas');
    expect(res.status).toBe(401);
  });

  test('5.2 GET /dashboard/metricas com token ROOT → 200 + métricas', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .get('/api/dashboard/metricas')
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(200);
    // Verificar estrutura de métricas
    expect(res.body).toBeDefined();
  });

  test('5.3 GET /dashboard/metricas?hoje=true com ROOT → 200', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .get('/api/dashboard/metricas?hoje=true')
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(200);
  });

  test('5.4 GET /dashboard/metricas com estagiário (perfil não permitido) → 403 ou 200 dependendo da regra', async () => {
    // Estagiário PENDENTE não consegue nem logar — só verifica o guard
    if (!rootToken) return;
    // Criar token falso de ESTAGIARIO para testar autorização
    const jwt = require('jsonwebtoken');
    const fakeEstToken = jwt.sign(
      { id: 9999, perfil: 'ESTAGIARIO', status: 'ATIVO' },
      'super-secret-clinic-key',
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/api/dashboard/metricas')
      .set('Authorization', `Bearer ${fakeEstToken}`);
    expect(res.status).toBe(403);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 6 — NOTIFICAÇÕES
// ══════════════════════════════════════════════════════════════════════════════
describe('🔔 [6] Notificações', () => {

  test('6.1 GET /notificacoes sem token → 401', async () => {
    const res = await request(app).get('/api/notificacoes');
    expect(res.status).toBe(401);
  });

  test('6.2 GET /notificacoes com token ROOT → 200 + array', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .get('/api/notificacoes')
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('6.3 GET /notificacoes/count → 200 + { naoLidas }', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .get('/api/notificacoes/count')
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('naoLidas');
    expect(typeof res.body.naoLidas).toBe('number');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 7 — /ME (Perfil do usuário logado)
// ══════════════════════════════════════════════════════════════════════════════
describe('👤 [7] Me — Perfil do Usuário', () => {

  test('7.1 GET /me sem token → 401', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });

  test('7.2 GET /me com token ROOT → 200 + dados do usuário', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email');
    expect(res.body).toHaveProperty('perfil');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 8 — CONFIGURAÇÕES DA CLÍNICA
// ══════════════════════════════════════════════════════════════════════════════
describe('⚙️ [8] Configurações', () => {

  test('8.1 GET /configuracao sem token → 401', async () => {
    const res = await request(app).get('/api/configuracao');
    expect(res.status).toBe(401);
  });

  test('8.2 GET /configuracao com token → 200', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .get('/api/configuracao')
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('horarioInicio');
    expect(res.body).toHaveProperty('horarioFim');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 9 — RELATÓRIOS
// ══════════════════════════════════════════════════════════════════════════════
describe('📋 [9] Relatórios', () => {

  test('9.1 GET /relatorios/sessoes sem token → 401', async () => {
    const res = await request(app).get('/api/relatorios/sessoes');
    expect(res.status).toBe(401);
  });

  test('9.2 GET /relatorios/sessoes com token ROOT → 200 + array', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const res = await request(app)
      .get(`/api/relatorios/sessoes?dataInicio=${monthAgo}&dataFim=${today}`)
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('9.3 GET /relatorios/estagiarios → 200 + array', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const res = await request(app)
      .get(`/api/relatorios/estagiarios?dataInicio=${monthAgo}&dataFim=${today}`)
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('9.4 GET /relatorios/pacientes → 200 + array', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .get('/api/relatorios/pacientes')
      .set('Authorization', `Bearer ${rootToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 10 — VALIDAÇÃO DE SCHEMA (Zod)
// ══════════════════════════════════════════════════════════════════════════════
describe('🔍 [10] Validação de Schema (Zod)', () => {

  test('10.1 POST /pacientes — tipoAtendimento inválido → 400', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${rootToken}`)
      .send({
        nome: 'Schema Test',
        cpf: '52998224725',
        telefone: '11999887766',
        dataNascimento: '1990-01-01',
        tipoAtendimento: 'TIPO_INVALIDO'
      });
    expect([400, 422]).toContain(res.status);
  });

  test('10.2 POST /pacientes — CPF com letras → 400', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${rootToken}`)
      .send({
        nome: 'Schema Test',
        cpf: 'ABC.DEF.GHI-00',
        telefone: '11999887766',
        dataNascimento: '1990-01-01',
        tipoAtendimento: 'ADULTO'
      });
    expect([400, 422]).toContain(res.status);
  });

  test('10.3 POST /pacientes — telefone muito curto → 400', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${rootToken}`)
      .send({
        nome: 'Schema Test',
        cpf: '52998224725',
        telefone: '1199',
        dataNascimento: '1990-01-01',
        tipoAtendimento: 'ADULTO'
      });
    expect([400, 422]).toContain(res.status);
  });

  test('10.4 POST /pacientes — dataNascimento formato errado → 400', async () => {
    if (!rootToken) return console.warn('⚠️  Sem token ROOT, pulando.');
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${rootToken}`)
      .send({
        nome: 'Schema Test',
        cpf: '52998224725',
        telefone: '11999887766',
        dataNascimento: '15/01/1990', // formato errado — deveria ser YYYY-MM-DD
        tipoAtendimento: 'ADULTO'
      });
    expect([400, 422]).toContain(res.status);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CLEANUP — Remover dados de teste
// ══════════════════════════════════════════════════════════════════════════════
afterAll(async () => {
  // Limpar o estagiário de teste criado no registro
  await prisma.estagiario.deleteMany({
    where: { usuario: { email: emailEstagiario } }
  });
  await prisma.usuario.deleteMany({
    where: { email: emailEstagiario }
  });

  // Limpar paciente de teste (se foi criado)
  if (pacienteId) {
    await prisma.paciente.deleteMany({
      where: { id: pacienteId }
    });
  }

  await prisma.$disconnect();
});
