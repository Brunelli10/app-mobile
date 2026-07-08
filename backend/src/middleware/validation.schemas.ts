import { z } from 'zod';

// ─── Horário no formato HH:mm ─────────────────────────────────────────────────
const horarioSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Horário deve estar no formato HH:mm (ex: 08:00)');

// ─── Data no formato AAAA-MM-DD ───────────────────────────────────────────────
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD');

// ─── Agendamentos ─────────────────────────────────────────────────────────────
export const criarAgendamentoSchema = z.object({
  salaId: z.number().int().positive({ message: 'salaId deve ser um número positivo' }),
  horarioInicio: horarioSchema,
  weeksCount: z.number().int().min(1).max(10).optional().default(1),
  pacienteId: z.number().int().positive({ message: 'pacienteId deve ser um número positivo' }),
  dataInicio: dateStringSchema,
  estagiarioId: z.number().int().positive({ message: 'estagiarioId deve ser um número positivo' }).optional(),
  skipConflicts: z.boolean().optional()
});

// ─── Pacientes ────────────────────────────────────────────────────────────────
export const criarPacienteSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  cpf: z.string().length(11, 'CPF deve ter exatamente 11 dígitos (sem pontuação)').regex(/^\d+$/, 'CPF deve conter apenas números'),
  telefone: z.string().min(10, 'Telefone inválido').max(11).regex(/^\d+$/, 'Telefone deve conter apenas números'),
  dataNascimento: dateStringSchema,
  tipoAtendimento: z.enum(['ADULTO', 'CRIANCA', 'CASAL']),
  responsavelNome: z.string().optional().nullable(),
  responsavelCpf: z.string().optional().nullable(),
  responsavelTelefone: z.string().optional().nullable(),
  parceiroNome: z.string().optional().nullable(),
  parceiroCpf: z.string().optional().nullable(),
  parceiroTelefone: z.string().optional().nullable()
});

// ─── Salas ────────────────────────────────────────────────────────────────────
export const criarSalaSchema = z.object({
  nome: z.string().min(2, 'Nome da sala deve ter ao menos 2 caracteres'),
  tipo: z.enum(['INDIVIDUAL', 'GRUPO', 'LUDICA']),
  capacidade: z.number().int().min(1).max(100)
});

// ─── Sessão Status ────────────────────────────────────────────────────────────
export const updateSessaoStatusSchema = z.object({
  status: z.enum(['CONCLUIDA', 'FALTA', 'CANCELADA']),
  notas: z.string().max(2000, 'Notas muito longas (máx. 2000 caracteres)').optional()
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(4, 'Senha deve ter ao menos 4 caracteres')
});

export const registerSchema = z.object({
  nome: z.string().min(3),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres')
});

// ─── Responsável do Paciente ──────────────────────────────────────────────────
export const updateResponsavelSchema = z.object({
  responsavelNome: z.string().min(2, 'Nome do responsável deve ter ao menos 2 caracteres'),
  responsavelTelefone: z.string().min(10, 'Telefone inválido').max(11),
  responsavelCpf: z.string().optional().nullable()
});
