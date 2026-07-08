import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getConfiguracao = async (req: Request, res: Response) => {
  try {
    let config = await prisma.configuracao.findFirst();
    if (!config) {
      config = await prisma.configuracao.create({
        data: {
          id: 1,
          horarioInicio: '08:00',
          horarioFim: '22:00',
          diasFuncionamento: '[0,1,2,3,4,5,6]' // Sunday (0) to Saturday (6)
        }
      });
    }
    res.json(config);
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração da clínica.' });
  }
};

export const updateConfiguracao = async (req: Request, res: Response) => {
  try {
    const userPerfil = req.user!.perfil;
    if (userPerfil !== 'GESTOR' && userPerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas Gestores ou Administradores podem alterar as configurações.' });
    }

    const { horarioInicio, horarioFim, diasFuncionamento } = req.body;

    if (!horarioInicio || !horarioFim || !diasFuncionamento) {
      return res.status(400).json({ error: 'Dados incompletos para atualização.' });
    }

    let config = await prisma.configuracao.findFirst();
    if (!config) {
      config = await prisma.configuracao.create({
        data: {
          id: 1,
          horarioInicio,
          horarioFim,
          diasFuncionamento
        }
      });
    } else {
      config = await prisma.configuracao.update({
        where: { id: config.id },
        data: {
          horarioInicio,
          horarioFim,
          diasFuncionamento
        }
      });
    }

    // ─── CANCELAMENTO AUTOMÁTICO DE AGENDAMENTOS CONFLITANTES ───────────────────────────
    const newAllowedDays: number[] = JSON.parse(diasFuncionamento);

    // Buscar todos os agendamentos ativos
    const activeAgendamentos = await prisma.agendamento.findMany({
      where: { status: 'CONFIRMADO' }
    });

    const affectedAgendamentos = activeAgendamentos.filter(ag => {
      const isDayInvalid = ag.diaSemana !== null && !newAllowedDays.includes(ag.diaSemana);
      const isTimeInvalid = ag.horarioInicio < horarioInicio || ag.horarioFim > horarioFim;
      return isDayInvalid || isTimeInvalid;
    });

    const affectedIds = affectedAgendamentos.map(ag => ag.id);

    let cancelledCount = 0;
    if (affectedIds.length > 0) {
      // Atualizar status dos agendamentos para CANCELADO
      await prisma.agendamento.updateMany({
        where: { id: { in: affectedIds } },
        data: { status: 'CANCELADO' }
      });

      // Cancelar as sessões futuras vinculadas
      await prisma.sessao.updateMany({
        where: {
          agendamentoId: { in: affectedIds },
          status: { notIn: ['CONCLUIDA', 'FALTA'] }
        },
        data: {
          status: 'CANCELADA',
          notas: 'Cancelada automaticamente devido a alteração do horário de funcionamento da clínica.'
        }
      });
      cancelledCount = affectedIds.length;
    }

    res.json({
      message: 'Configurações atualizadas com sucesso!',
      config,
      cancelledCount
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro ao atualizar as configurações da clínica.' });
  }
};
