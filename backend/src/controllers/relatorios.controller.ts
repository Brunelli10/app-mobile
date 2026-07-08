import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';


export const getRelatorioSessoes = async (req: Request, res: Response) => {
  try {
    const solicitantePerfil = req.user!.perfil;
    if (solicitantePerfil !== 'GESTOR' && solicitantePerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas gestores podem emitir relatórios.' });
    }

    const { dataInicio, dataFim, status, salaId, estagiarioId } = req.query;

    const whereClause: any = {};

    if (dataInicio || dataFim) {
      whereClause.dataSessao = {};
      if (dataInicio) {
        whereClause.dataSessao.gte = new Date(`${dataInicio}T00:00:00`);
      }
      if (dataFim) {
        whereClause.dataSessao.lte = new Date(`${dataFim}T23:59:59`);
      }
    }

    if (status) {
      whereClause.status = status as string;
    }

    if (salaId) {
      whereClause.salaId = parseInt(salaId as string);
    }

    if (estagiarioId) {
      whereClause.agendamento = { estagiarioId: parseInt(estagiarioId as string) };
    }

    const sessoes = await prisma.sessao.findMany({
      where: whereClause,
      include: {
        agendamento: {
          include: {
            sala: true,
            estagiario: { include: { usuario: { select: { nome: true } } } },
            pacientes: { include: { paciente: true } }
          }
        }
      },
      orderBy: { dataSessao: 'asc' }
    });

    const formatLocalDate = (date: Date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formatted = sessoes.map(s => ({
      id: s.id,
      data: formatLocalDate(s.dataSessao),
      horario: s.horarioInicio,
      sala: s.agendamento.sala.nome,
      estagiario: s.agendamento.estagiario.usuario.nome,
      pacientes: s.agendamento.pacientes.map(p => p.paciente.nome).join(', '),
      status: s.status,
      notas: s.notas || ''
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Erro ao gerar relatório de sessões:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de sessões.' });
  }
};

export const getRelatorioEstagiarios = async (req: Request, res: Response) => {
  try {
    const solicitantePerfil = req.user!.perfil;
    if (solicitantePerfil !== 'GESTOR' && solicitantePerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas gestores podem emitir relatórios.' });
    }

    const { dataInicio, dataFim } = req.query;

    const estagiarios = await prisma.estagiario.findMany({
      include: {
        usuario: { select: { nome: true } }
      }
    });

    const sessoesWhere: any = {};
    if (dataInicio || dataFim) {
      sessoesWhere.dataSessao = {};
      if (dataInicio) {
        sessoesWhere.dataSessao.gte = new Date(`${dataInicio}T00:00:00`);
      }
      if (dataFim) {
        sessoesWhere.dataSessao.lte = new Date(`${dataFim}T23:59:59`);
      }
    }

    const report = [];

    for (const est of estagiarios) {
      // Buscar sessões associadas a este estagiário
      const sessoes = await prisma.sessao.findMany({
        where: {
          ...sessoesWhere,
          agendamento: {
            estagiarioId: est.id,
            status: { not: 'CANCELADO' }
          }
        }
      });

      const totalSessao = sessoes.length;
      const realizadas = sessoes.filter(s => s.status === 'CONCLUIDA' || s.status === 'REALIZADA').length;
      const faltas = sessoes.filter(s => s.status === 'FALTA').length;
      const canceladas = sessoes.filter(s => s.status === 'CANCELADA').length;

      const presencasCalculadas = realizadas + faltas;
      const taxaPresenca = presencasCalculadas > 0 ? Math.round((realizadas / presencasCalculadas) * 100) : 100;

      report.push({
        nome: est.usuario.nome,
        matricula: est.matricula,
        cargaHorariaSemanal: est.cargaHorariaSemanal,
        totalSessao,
        realizadas,
        faltas,
        canceladas,
        taxaPresenca: `${taxaPresenca}%`,
        ativo: est.ativo ? 'Sim' : 'Não'
      });
    }

    res.json(report);
  } catch (error) {
    console.error('Erro ao gerar relatório de estagiários:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de estagiários.' });
  }
};

export const getRelatorioPacientes = async (req: Request, res: Response) => {
  try {
    const solicitantePerfil = req.user!.perfil;
    if (solicitantePerfil !== 'GESTOR' && solicitantePerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas gestores podem emitir relatórios.' });
    }

    const { tipoAtendimento, status } = req.query;

    const whereClause: any = {};

    if (tipoAtendimento) {
      whereClause.tipoAtendimento = tipoAtendimento as string;
    }

    if (status) {
      whereClause.ativo = status === 'ATIVO';
    }

    const pacientes = await prisma.paciente.findMany({
      where: whereClause,
      orderBy: { nome: 'asc' }
    });

    const formatted = pacientes.map(p => ({
      nome: p.nome,
      dataNascimento: p.dataNascimento.toISOString().split('T')[0],
      cpf: p.cpf,
      telefone: p.telefone,
      tipoAtendimento: p.tipoAtendimento,
      status: p.ativo ? 'Ativo' : 'Inativo',
      responsavel: p.responsavelNome 
        ? `${p.responsavelNome} (${p.responsavelTelefone || ''})`
        : 'N/A'
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Erro ao gerar relatório de pacientes:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de pacientes.' });
  }
};


// ─── Relatório de Supervisão ──────────────────────────────────────────────────
export const getRelatorioSupervisao = async (req: Request, res: Response) => {
  try {
    const solicitantePerfil = req.user!.perfil;
    if (solicitantePerfil !== 'GESTOR' && solicitantePerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas gestores podem emitir relatórios.' });
    }

    const { dataInicio, dataFim, tipo } = req.query;
    // tipo: 'sem_feedback' | 'feedbacks_por_estagiario' | 'presenca_estagiario'

    const whereDate: any = {};
    if (dataInicio || dataFim) {
      whereDate.dataSessao = {};
      if (dataInicio) whereDate.dataSessao.gte = new Date(`${dataInicio}T00:00:00`);
      if (dataFim) whereDate.dataSessao.lte = new Date(`${dataFim}T23:59:59`);
    }

    if (tipo === 'sem_feedback') {
      // Sessões sem feedback do supervisor
      const sessoes = await prisma.sessao.findMany({
        where: {
          ...whereDate,
          supervisorNota: null,
          status: { in: ['REALIZADA', 'CONCLUIDA'] }
        },
        include: {
          agendamento: {
            include: {
              estagiario: { include: { usuario: { select: { nome: true } } } },
              sala: { select: { nome: true } },
              pacientes: { include: { paciente: { select: { nome: true } } } }
            }
          }
        },
        orderBy: { dataSessao: 'desc' },
        take: 200
      });

      const formatted = sessoes.map(s => ({
        id: s.id,
        data: s.dataSessao.toISOString().split('T')[0],
        horario: s.horarioInicio,
        estagiario: s.agendamento.estagiario.usuario.nome,
        sala: s.agendamento.sala.nome,
        pacientes: s.agendamento.pacientes.map(p => p.paciente.nome).join(', '),
        status: s.status,
        notas: s.notas || ''
      }));

      return res.json(formatted);
    }

    if (tipo === 'feedbacks_por_estagiario') {
      // Contagem de feedbacks dados por estagiário
      const estagiarios = await prisma.estagiario.findMany({
        where: { ativo: true },
        include: { usuario: { select: { nome: true } } }
      });

      const report = [];
      for (const est of estagiarios) {
        const totalSessoes = await prisma.sessao.count({
          where: { ...whereDate, agendamento: { estagiarioId: est.id } }
        });
        const comFeedback = await prisma.sessao.count({
          where: { ...whereDate, agendamento: { estagiarioId: est.id }, supervisorNota: { not: null } }
        });
        const semFeedback = totalSessoes - comFeedback;
        const percentual = totalSessoes > 0 ? Math.round((comFeedback / totalSessoes) * 100) : 0;

        report.push({
          estagiario: est.usuario.nome,
          matricula: est.matricula,
          totalSessoes,
          comFeedback,
          semFeedback,
          percentualRevisado: `${percentual}%`
        });
      }

      return res.json(report.sort((a, b) => b.semFeedback - a.semFeedback));
    }

    if (tipo === 'presenca_estagiario') {
      // Presença e faltas por estagiário no período
      const estagiarios = await prisma.estagiario.findMany({
        where: { ativo: true },
        include: { usuario: { select: { nome: true } } }
      });

      const report = [];
      for (const est of estagiarios) {
        const sessoes = await prisma.sessao.findMany({
          where: { ...whereDate, agendamento: { estagiarioId: est.id } }
        });

        const realizadas = sessoes.filter(s => s.status === 'CONCLUIDA' || s.status === 'REALIZADA').length;
        const faltas = sessoes.filter(s => s.status === 'FALTA').length;
        const canceladas = sessoes.filter(s => s.status === 'CANCELADA').length;
        const total = sessoes.length;
        const taxaPresenca = (realizadas + faltas) > 0 ? Math.round((realizadas / (realizadas + faltas)) * 100) : 100;

        report.push({
          estagiario: est.usuario.nome,
          matricula: est.matricula,
          total,
          realizadas,
          faltas,
          canceladas,
          taxaPresenca: `${taxaPresenca}%`
        });
      }

      return res.json(report.sort((a, b) => a.taxaPresenca.localeCompare(b.taxaPresenca)));
    }

    return res.status(400).json({ error: 'Parâmetro "tipo" é obrigatório. Valores: sem_feedback, feedbacks_por_estagiario, presenca_estagiario.' });
  } catch (error) {
    console.error('Erro ao gerar relatório de supervisão:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de supervisão.' });
  }
};
