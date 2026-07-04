import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Cria uma notificação para um usuário específico */
export async function criarNotificacao(
  usuarioId: number,
  tipo: string,
  titulo: string,
  mensagem: string
): Promise<void> {
  try {
    await prisma.notificacao.create({
      data: { usuarioId, tipo, titulo, mensagem }
    });
  } catch (e) {
    console.error('[NOTIFICACAO] Erro ao criar notificação:', e);
  }
}

/** Cria uma notificação para todos os GESTOR e ROOT ativos */
export async function notificarGestores(
  tipo: string,
  titulo: string,
  mensagem: string
): Promise<void> {
  try {
    const gestores = await prisma.usuario.findMany({
      where: { perfil: { in: ['GESTOR', 'ROOT'] }, status: 'ATIVO' },
      select: { id: true }
    });
    if (gestores.length === 0) return;
    await prisma.notificacao.createMany({
      data: gestores.map(g => ({ usuarioId: g.id, tipo, titulo, mensagem }))
    });
  } catch (e) {
    console.error('[NOTIFICACAO] Erro ao notificar gestores:', e);
  }
}

/** Cria uma notificação para o estagiário responsável pelo agendamento */
export async function notificarEstagiario(
  estagiarioId: number,
  tipo: string,
  titulo: string,
  mensagem: string
): Promise<void> {
  try {
    const estagiario = await prisma.estagiario.findUnique({
      where: { id: estagiarioId },
      select: { usuarioId: true }
    });
    if (!estagiario) return;
    await criarNotificacao(estagiario.usuarioId, tipo, titulo, mensagem);
  } catch (e) {
    console.error('[NOTIFICACAO] Erro ao notificar estagiário:', e);
  }
}

/** Cria uma notificação para todos os pacientes de um agendamento */
export async function notificarPacientesDoAgendamento(
  agendamentoId: number,
  tipo: string,
  titulo: string,
  mensagem: string
): Promise<void> {
  try {
    const aps = await prisma.agendamentoPaciente.findMany({
      where: { agendamentoId },
      include: { paciente: { select: { usuarioId: true } } }
    });
    const usuarioIds = aps
      .map(ap => ap.paciente.usuarioId)
      .filter((id): id is number => id !== null);
    if (usuarioIds.length === 0) return;
    await prisma.notificacao.createMany({
      data: usuarioIds.map(uid => ({ usuarioId: uid, tipo, titulo, mensagem }))
    });
  } catch (e) {
    console.error('[NOTIFICACAO] Erro ao notificar pacientes:', e);
  }
}
