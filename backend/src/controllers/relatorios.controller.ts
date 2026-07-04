import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getRelatorioSessoes = async (req: Request, res: Response) => {
  try {
    const solicitantePerfil = (req as any).user.perfil;
    if (solicitantePerfil !== 'GESTOR' && solicitantePerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas gestores podem emitir relatórios.' });
    }

    const { dataInicio, dataFim, status, salaId } = req.query;

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
    const solicitantePerfil = (req as any).user.perfil;
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
    const solicitantePerfil = (req as any).user.perfil;
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
