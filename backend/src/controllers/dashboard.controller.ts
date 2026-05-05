import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const perfil = (req as any).user.perfil;
    if (!['GESTOR', 'ROOT'].includes(perfil)) {
      return res.status(403).json({ error: 'Apenas Gestores têm acesso ao Dashboard.' });
    }

    const hoje = new Date();
    const inicioDaSemana = new Date(hoje);
    inicioDaSemana.setDate(hoje.getDate() - hoje.getDay()); // Domingo
    inicioDaSemana.setHours(0, 0, 0, 0);

    const fimDaSemana = new Date(inicioDaSemana);
    fimDaSemana.setDate(inicioDaSemana.getDate() + 6);
    fimDaSemana.setHours(23, 59, 59, 999);

    const [
      totalPacientes,
      totalEstagiarios,
      totalSalas,
      sessoesNaSemana,
      faltasNaSemana,
      pacientesPendentes,
      sessoesHoje
    ] = await Promise.all([
      // Total de pacientes ativos
      prisma.paciente.count({ where: { ativo: true } }),

      // Total de estagiários ativos
      prisma.estagiario.count({ where: { ativo: true } }),

      // Total de salas ativas
      prisma.sala.count({ where: { ativa: true } }),

      // Sessões confirmadas na semana atual
      prisma.sessao.count({
        where: {
          dataSessao: { gte: inicioDaSemana, lte: fimDaSemana }
        }
      }),

      // Faltas registradas na semana
      prisma.sessao.count({
        where: {
          dataSessao: { gte: inicioDaSemana, lte: fimDaSemana },
          status: 'FALTA'
        }
      }),

      // Usuários pendentes de aprovação
      prisma.usuario.count({ where: { status: 'PENDENTE' } }),

      // Sessões de hoje
      prisma.sessao.findMany({
        where: {
          dataSessao: {
            gte: new Date(hoje.setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999))
          }
        },
        include: {
          agendamento: {
            include: {
              sala: true,
              estagiario: {
                include: { usuario: { select: { nome: true } } }
              },
              pacientes: {
                include: { paciente: { select: { nome: true } } }
              }
            }
          }
        },
        orderBy: { dataSessao: 'asc' }
      })
    ]);

    // Top 5 Estagiários mais ativos (por número de sessões)
    const topEstagiarios = await prisma.estagiario.findMany({
      take: 5,
      include: {
        usuario: { select: { nome: true } },
        agendamentos: { include: { sessoes: true } }
      }
    });

    const rankingEstagiarios = topEstagiarios.map(e => ({
      nome: e.usuario.nome.split(' ')[0], // primeiro nome apenas
      totalSessoes: e.agendamentos.reduce((acc, ag) => acc + ag.sessoes.length, 0),
      concluidas: e.agendamentos.reduce((acc, ag) => acc + ag.sessoes.filter(s => s.status === 'CONCLUIDA').length, 0),
      faltas: e.agendamentos.reduce((acc, ag) => acc + ag.sessoes.filter(s => s.status === 'FALTA').length, 0),
    })).sort((a, b) => b.totalSessoes - a.totalSessoes);

    // Sessões por dia da semana (últimos 30 dias) para gráfico de barras
    const ha30Dias = new Date(hoje);
    ha30Dias.setDate(hoje.getDate() - 30);
    const sessoes30Dias = await prisma.sessao.findMany({
      where: { dataSessao: { gte: ha30Dias } },
      select: { dataSessao: true, status: true }
    });

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const sessoesPorDia = diasSemana.map((label, i) => ({
      label,
      total: sessoes30Dias.filter(s => new Date(s.dataSessao).getDay() === i).length,
      concluidas: sessoes30Dias.filter(s => new Date(s.dataSessao).getDay() === i && s.status === 'CONCLUIDA').length,
    }));

    // Evolução das últimas 6 semanas (total por semana)
    const sessoesPorSemana: { semana: string; total: number; concluidas: number }[] = [];
    for (let w = 5; w >= 0; w--) {
      const inicioSem = new Date(hoje);
      inicioSem.setDate(hoje.getDate() - hoje.getDay() - w * 7);
      inicioSem.setHours(0, 0, 0, 0);
      const fimSem = new Date(inicioSem);
      fimSem.setDate(inicioSem.getDate() + 6);
      fimSem.setHours(23, 59, 59, 999);

      const count = await prisma.sessao.count({ where: { dataSessao: { gte: inicioSem, lte: fimSem } } });
      const concluidas = await prisma.sessao.count({ where: { dataSessao: { gte: inicioSem, lte: fimSem }, status: 'CONCLUIDA' } });

      const label = `${String(inicioSem.getDate()).padStart(2,'0')}/${String(inicioSem.getMonth()+1).padStart(2,'0')}`;
      sessoesPorSemana.push({ semana: label, total: count, concluidas });
    }

    res.json({
      metricas: {
        totalPacientes,
        totalEstagiarios,
        totalSalas,
        sessoesNaSemana,
        faltasNaSemana,
        taxaPresenca: sessoesNaSemana > 0 ? Math.round(((sessoesNaSemana - faltasNaSemana) / sessoesNaSemana) * 100) : 100,
        pacientesPendentes
      },
      sessoesHoje: sessoesHoje.map(s => ({
        id: s.id,
        horario: s.agendamento.horarioInicio,
        sala: s.agendamento.sala.nome,
        estagiario: s.agendamento.estagiario.usuario.nome,
        pacientes: s.agendamento.pacientes.map(p => p.paciente.nome),
        status: s.status
      })),
      rankingEstagiarios,
      sessoesPorDia,
      sessoesPorSemana
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar métricas do dashboard' });
  }
};
