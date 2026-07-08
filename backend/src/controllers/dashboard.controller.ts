import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const perfil = req.user!.perfil;
    if (!['GESTOR', 'ROOT'].includes(perfil)) {
      return res.status(403).json({ error: 'Apenas Gestores têm acesso ao Dashboard.' });
    }

    // 1. Extrair filtros da query
    const estagiarioId = req.query.estagiarioId ? Number(req.query.estagiarioId) : undefined;
    const ano = req.query.ano ? Number(req.query.ano) : undefined;
    const mes = req.query.mes ? Number(req.query.mes) : undefined;
    const semana = req.query.semana ? Number(req.query.semana) : undefined;
    const hojeFiltro = req.query.hoje === 'true';

    const hoje = new Date();

    // 2. Determinar intervalo de datas do filtro temporal
    let start: Date | undefined;
    let end: Date | undefined;

    if (hojeFiltro) {
      start = new Date(hoje);
      start.setHours(0, 0, 0, 0);
      end = new Date(hoje);
      end.setHours(23, 59, 59, 999);
    } else if (ano) {
      if (mes) {
        const monthNum = mes - 1; // 0-indexed in JS
        if (semana) {
          // Divisão das semanas do mês (7 dias por semana):
          // Semana 1: dias 1-7
          // Semana 2: dias 8-14
          // Semana 3: dias 15-21
          // Semana 4: dias 22-28
          // Semana 5: dia 29 em diante
          const startDay = (semana - 1) * 7 + 1;
          let endDay = semana * 7;
          if (semana === 5) {
            endDay = new Date(ano, monthNum + 1, 0).getDate();
          }
          start = new Date(ano, monthNum, startDay, 0, 0, 0, 0);
          end = new Date(ano, monthNum, endDay, 23, 59, 59, 999);
        } else {
          // Mês inteiro
          start = new Date(ano, monthNum, 1, 0, 0, 0, 0);
          end = new Date(ano, monthNum + 1, 0, 23, 59, 59, 999);
        }
      } else {
        // Ano inteiro
        start = new Date(ano, 0, 1, 0, 0, 0, 0);
        end = new Date(ano, 11, 31, 23, 59, 59, 999);
      }
    }

    // 3. Montar filtros do Prisma para Sessao
    const whereData = start && end ? {
      dataSessao: {
        gte: start,
        lte: end
      }
    } : {};

    const whereEstagiario = estagiarioId ? {
      OR: [
        { agendamento: { estagiarioId } },
        { estagiarioSubstitutoId: estagiarioId }
      ]
    } : {};

    const sessaoWhere = {
      ...whereData,
      ...whereEstagiario
    };

    // 4. Executar consultas operacionais (constantes na clínica)
    const [
      totalPacientes,
      totalEstagiarios,
      totalSalas,
      pacientesPendentes,
      sessoesHojeLista
    ] = await Promise.all([
      prisma.paciente.count({ where: { ativo: true } }),
      prisma.estagiario.count({ where: { ativo: true } }),
      prisma.sala.count({ where: { ativa: true } }),
      prisma.usuario.count({ where: { status: 'PENDENTE' } }),
      prisma.sessao.findMany({
        where: {
          dataSessao: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999))
          }
        },
        include: {
          agendamento: {
            include: {
              sala: true,
              estagiario: { include: { usuario: { select: { nome: true } } } },
              pacientes: { include: { paciente: { select: { nome: true } } } }
            }
          }
        },
        orderBy: { dataSessao: 'asc' }
      })
    ]);

    // 5. Executar contagens analíticas filtradas por período e estagiário
    const [
      totalSessoes,
      concluidas,
      faltas,
      canceladas,
      pendentes
    ] = await Promise.all([
      prisma.sessao.count({ where: sessaoWhere }),
      prisma.sessao.count({ where: { ...sessaoWhere, status: 'CONCLUIDA' } }),
      prisma.sessao.count({ where: { ...sessaoWhere, status: 'FALTA' } }),
      prisma.sessao.count({ where: { ...sessaoWhere, status: 'CANCELADA' } }),
      prisma.sessao.count({ where: { ...sessaoWhere, status: 'REALIZADA' } })
    ]);

    const totalValidas = concluidas + faltas;
    const taxaPresenca = totalValidas > 0 ? Math.round((concluidas / totalValidas) * 100) : 100;

    // 6. Ranking dinâmico de estagiários filtrado por período
    const sessoesPeriodoRanking = await prisma.sessao.findMany({
      where: whereData, // filtrado apenas pelo tempo selecionado para ver a performance comparativa
      include: {
        agendamento: {
          select: {
            estagiarioId: true
          }
        }
      }
    });

    const mapRanking = new Map<number, { total: number; concluidas: number; faltas: number; canceladas: number }>();
    sessoesPeriodoRanking.forEach(s => {
      const internId = s.estagiarioSubstitutoId || s.agendamento.estagiarioId;
      if (!internId) return;
      if (!mapRanking.has(internId)) {
        mapRanking.set(internId, { total: 0, concluidas: 0, faltas: 0, canceladas: 0 });
      }
      const st = mapRanking.get(internId)!;
      st.total++;
      if (s.status === 'CONCLUIDA') st.concluidas++;
      else if (s.status === 'FALTA') st.faltas++;
      else if (s.status === 'CANCELADA') st.canceladas++;
    });

    const activeEstagiarios = await prisma.estagiario.findMany({
      where: { ativo: true },
      include: {
        usuario: { select: { nome: true } }
      }
    });

    const rankingEstagiarios = activeEstagiarios.map(e => {
      const st = mapRanking.get(e.id) || { total: 0, concluidas: 0, faltas: 0, canceladas: 0 };
      return {
        id: e.id,
        nome: e.usuario.nome,
        totalSessoes: st.total,
        concluidas: st.concluidas,
        faltas: st.faltas,
        canceladas: st.canceladas,
        taxaPresenca: (st.concluidas + st.faltas) > 0 
          ? Math.round((st.concluidas / (st.concluidas + st.faltas)) * 100) 
          : 100
      };
    }).sort((a, b) => b.totalSessoes - a.totalSessoes);

    // 7. Geração de gráfico dinâmico (chartData) com base na granularidade
    let chartData: { label: string; total: number; concluidas: number }[] = [];

    // Carregar sessões do período filtrado para agrupar em memória
    const sessoesPeriodoGrafico = await prisma.sessao.findMany({
      where: sessaoWhere,
      select: { dataSessao: true, horarioInicio: true, status: true }
    });

    if (hojeFiltro) {
      // Agrupamento por hora
      const slots = [
        { label: '08h', start: 8, end: 9 },
        { label: '10h', start: 10, end: 11 },
        { label: '12h', start: 12, end: 13 },
        { label: '14h', start: 14, end: 15 },
        { label: '16h', start: 16, end: 17 },
        { label: '18h', start: 18, end: 19 },
        { label: '20h', start: 20, end: 21 },
      ];
      chartData = slots.map(slot => {
        const matching = sessoesPeriodoGrafico.filter(s => {
          const hour = parseInt(s.horarioInicio.split(':')[0]);
          return !isNaN(hour) && hour >= slot.start && hour <= slot.end;
        });
        return {
          label: slot.label,
          total: matching.length,
          concluidas: matching.filter(s => s.status === 'CONCLUIDA').length
        };
      });
    } else if (ano && mes && semana) {
      // Agrupamento dia a dia para a semana do mês
      const startDay = (semana - 1) * 7 + 1;
      const monthNum = mes - 1;
      const endDay = semana === 5 
        ? new Date(ano, monthNum + 1, 0).getDate() 
        : semana * 7;

      for (let d = startDay; d <= endDay; d++) {
        const dateLabel = `${String(d).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
        const matching = sessoesPeriodoGrafico.filter(s => new Date(s.dataSessao).getDate() === d);
        chartData.push({
          label: dateLabel,
          total: matching.length,
          concluidas: matching.filter(s => s.status === 'CONCLUIDA').length
        });
      }
    } else if (ano && mes) {
      // Agrupamento semana a semana para o mês
      for (let w = 1; w <= 5; w++) {
        const startDay = (w - 1) * 7 + 1;
        let endDay = w * 7;
        if (w === 5) {
          endDay = new Date(ano, mes, 0).getDate();
        }
        const startW = new Date(ano, mes - 1, startDay, 0, 0, 0, 0);
        const endW = new Date(ano, mes - 1, endDay, 23, 59, 59, 999);

        const matching = sessoesPeriodoGrafico.filter(s => {
          const sDate = new Date(s.dataSessao);
          return sDate >= startW && sDate <= endW;
        });

        chartData.push({
          label: `Sem ${w}`,
          total: matching.length,
          concluidas: matching.filter(s => s.status === 'CONCLUIDA').length
        });
      }
    } else if (ano) {
      // Agrupamento mês a mês para o ano
      const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      for (let m = 0; m < 12; m++) {
        const startM = new Date(ano, m, 1, 0, 0, 0, 0);
        const endM = new Date(ano, m + 1, 0, 23, 59, 59, 999);

        const matching = sessoesPeriodoGrafico.filter(s => {
          const sDate = new Date(s.dataSessao);
          return sDate >= startM && sDate <= endM;
        });

        chartData.push({
          label: mesesLabels[m],
          total: matching.length,
          concluidas: matching.filter(s => s.status === 'CONCLUIDA').length
        });
      }
    } else {
      // Sem filtro temporal (Padrão: últimas 6 semanas)
      const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const startM = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
        const endM = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

        const matching = sessoesPeriodoGrafico.filter(s => {
          const sDate = new Date(s.dataSessao);
          return sDate >= startM && sDate <= endM;
        });

        chartData.push({
          label: `${mesesLabels[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
          total: matching.length,
          concluidas: matching.filter(s => s.status === 'CONCLUIDA').length
        });
      }
    }

    // 8. Lista de estagiários ativos para popular o filtro do mobile
    const estagiariosDropdown = activeEstagiarios.map(e => ({
      id: e.id,
      nome: e.usuario.nome
    }));

    // Retornar dados completos com suporte ao legado (semana corrente)
    res.json({
      metricas: {
        totalPacientes,
        totalEstagiarios,
        totalSalas,
        pacientesPendentes,
        sessoesNaSemana: totalSessoes,
        faltasNaSemana: faltas,
        taxaPresenca
      },
      sessoesHoje: sessoesHojeLista.map(s => ({
        id: s.id,
        horario: s.agendamento.horarioInicio,
        sala: s.agendamento.sala.nome,
        estagiario: s.agendamento.estagiario.usuario.nome,
        pacientes: s.agendamento.pacientes.map(p => p.paciente.nome),
        status: s.status
      })),
      metricasAnalise: {
        total: totalSessoes,
        concluidas,
        faltas,
        canceladas,
        pendentes,
        taxaPresenca
      },
      rankingEstagiarios,
      chartData,
      estagiarios: estagiariosDropdown
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar métricas do dashboard' });
  }
};
