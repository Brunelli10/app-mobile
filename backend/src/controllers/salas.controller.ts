import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSalas = async (req: Request, res: Response) => {
  try {
    const salas = await prisma.sala.findMany({
      where: { ativa: true },
      include: {
        agendamentos: {
          include: {
            sessoes: true,
            pacientes: { include: { paciente: { select: { nome: true } } } },
            estagiario: { include: { usuario: { select: { nome: true } } } }
          }
        }
      }
    });
    
    const formattedSalas = salas.map(sala => ({
        id: sala.id,
        nome: sala.nome,
        tipo: sala.tipo,
        capacidade: sala.capacidade,
        ativa: sala.ativa,
        totalAgendamentos: sala.agendamentos.length,
        icon: sala.tipo === 'LUDICA' ? 'happy-outline' : (sala.tipo === 'GRUPO' ? 'people-outline' : 'easel-outline')
    }));

    res.json(formattedSalas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar salas' });
  }
};

export const createSala = async (req: Request, res: Response) => {
  try {
    const userPerfil = (req as any).user.perfil;
    if (userPerfil !== 'GESTOR' && userPerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas Gestores podem criar salas.' });
    }
    const { nome, tipo, capacidade } = req.body;
    if (!nome || !tipo || !capacidade) {
      return res.status(400).json({ error: 'Dados incompletos para criação de sala.' });
    }
    const newSala = await prisma.sala.create({
      data: { nome, tipo, capacidade: parseInt(capacidade), ativa: true }
    });
    res.status(201).json(newSala);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar sala' });
  }
};

// ─── GET /salas/:salaId/disponibilidade?data=AAAA-MM-DD ──────────────────────
// Retorna os slots do dia com status: LIVRE ou OCUPADO (com dados de quem ocupa)
export const getDisponibilidadeSala = async (req: Request, res: Response) => {
  try {
    const { salaId } = req.params;
    const { data } = req.query;
    
    if (!data) {
      return res.status(400).json({ error: 'Parâmetro "data" é obrigatório (AAAA-MM-DD).' });
    }

    const dataInicio = new Date(`${data}T00:00:00`);
    const dataFim = new Date(`${data}T23:59:59`);

    // Buscar todas as sessões desta sala neste dia
    const sessoesOcupadas = await prisma.sessao.findMany({
      where: {
        salaId: parseInt(salaId as string),
        dataSessao: { gte: dataInicio, lte: dataFim },
        agendamento: { status: { not: 'CANCELADO' } }
      },
      include: {
        agendamento: {
          include: {
            estagiario: { include: { usuario: { select: { nome: true } } } },
            pacientes: { include: { paciente: { select: { nome: true } } } }
          }
        }
      }
    });

    const config = await prisma.configuracao.findFirst();
    let ALL_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    if (config) {
      const allowedDays: number[] = JSON.parse(config.diasFuncionamento);
      const dayOfWeek = dataInicio.getDay();

      if (!allowedDays.includes(dayOfWeek)) {
        return res.json([]);
      }

      const start = config.horarioInicio;
      const end = config.horarioFim;

      ALL_SLOTS = ALL_SLOTS.filter(slot => {
        const hour = parseInt(slot.split(':')[0]);
        const endHourStr = `${hour + 1}`.padStart(2, '0') + ':00';
        return slot >= start && endHourStr <= end;
      });
    }

    const disponibilidade = ALL_SLOTS.map(slot => {
      const sessao = sessoesOcupadas.find(s => s.horarioInicio === slot);
      if (sessao) {
        return {
          horario: slot,
          ocupado: true,
          estagiario: sessao.agendamento.estagiario.usuario.nome,
          pacientes: sessao.agendamento.pacientes.map(p => p.paciente.nome),
          status: sessao.status,
          agendamentoId: sessao.agendamentoId,
          sessaoId: sessao.id
        };
      }
      return { horario: slot, ocupado: false };
    });

    res.json(disponibilidade);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar disponibilidade' });
  }
};

export const deleteSala = async (req: Request, res: Response) => {
  try {
    const userPerfil = (req as any).user.perfil;
    if (userPerfil !== 'GESTOR' && userPerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas Gestores podem excluir salas.' });
    }
    const { salaId } = req.params;

    // Soft delete: set ativa = false
    await prisma.sala.update({
      where: { id: parseInt(salaId as string) },
      data: { ativa: false }
    });

    res.json({ message: 'Sala excluída com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir sala.' });
  }
};
