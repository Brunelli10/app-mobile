import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { notificarGestores, notificarEstagiario, notificarPacientesDoAgendamento } from '../utils/notificacoes.helper';

const prisma = new PrismaClient();

export const createAgendamento = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userPerfil = (req as any).user.perfil;
    const { salaId, horarioInicio, weeksCount, pacienteId, dataInicio, skipConflicts, estagiarioId } = req.body;
    
    if (!salaId || !horarioInicio || !weeksCount || !pacienteId || !dataInicio) {
       return res.status(400).json({ error: 'Dados incompletos para o agendamento.' });
    }

    let estagiarioToUse;

    if (userPerfil === 'GESTOR' || userPerfil === 'ROOT') {
      if (!estagiarioId) {
        return res.status(400).json({ error: 'Gestores devem selecionar um estagiário para o agendamento.' });
      }
      estagiarioToUse = await prisma.estagiario.findUnique({ where: { id: parseInt(estagiarioId) } });
      if (!estagiarioToUse) return res.status(404).json({ error: 'Estagiário selecionado não encontrado.' });
    } else {
      estagiarioToUse = await prisma.estagiario.findUnique({
        where: { usuarioId: userId }
      });
      if (!estagiarioToUse) {
         return res.status(403).json({ error: 'Perfil de Estagiário não encontrado.' });
      }
    }

    // Pega a data selecionada no Calendário pelo Frontend
    const dataSessaoInicial = new Date(`${dataInicio}T00:00:00`); 

    const numSemanas = parseInt(weeksCount) || 1;
    const idsSala = parseInt(salaId);
    const idPaciente = parseInt(pacienteId);

    // ─── Validação contra as Configurações da Clínica ─────────────────────────
    const config = await prisma.configuracao.findFirst();
    if (config) {
      const allowedDays: number[] = JSON.parse(config.diasFuncionamento);
      const start = config.horarioInicio;
      const end = config.horarioFim;

      const dayOfWeek = dataSessaoInicial.getDay();
      if (!allowedDays.includes(dayOfWeek)) {
        const diasNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        return res.status(400).json({ error: `A clínica não funciona aos ${diasNomes[dayOfWeek]}s.` });
      }

      const startHour = parseInt(horarioInicio.split(':')[0]);
      const endHourStr = `${startHour + 1}`.padStart(2, '0') + ':00';

      if (horarioInicio < start || endHourStr > end) {
        return res.status(400).json({ error: `Horário fora do funcionamento da clínica (${start} às ${end}).` });
      }
    }
    
    const conflicts: { date: string; reason: string }[] = [];
    const availableWeeks: Date[] = [];

    // Motor Tripla Checagem
    for (let i = 0; i < numSemanas; i++) {
        const checkDate = new Date(dataSessaoInicial);
        checkDate.setDate(dataSessaoInicial.getDate() + (i * 7));
        const dateStr = checkDate.toLocaleDateString('pt-BR');
        
        let hasConflict = false;
        let reason = '';

        // 1. Checagem de Sala (Espaço Físico)
        const conflitoSala = await prisma.sessao.findFirst({
           where: {
              dataSessao: checkDate,
              salaId: idsSala,
              horarioInicio: horarioInicio,
              status: { not: 'CANCELADA' }
           }
        });

        if (conflitoSala) {
           hasConflict = true;
           reason = `Sala ocupada no dia ${dateStr}.`;
        }

        // 2. Checagem de Estagiário (Presença Única)
        if (!hasConflict) {
          const conflitoEstagiario = await prisma.sessao.findFirst({
             where: {
                dataSessao: checkDate,
                horarioInicio: horarioInicio,
                status: { not: 'CANCELADA' },
                agendamento: {
                   estagiarioId: estagiarioToUse.id
                }
             }
          });

          if (conflitoEstagiario) {
             hasConflict = true;
             reason = `O estagiário selecionado já possui um atendimento no dia ${dateStr} às ${horarioInicio}.`;
          }
        }

        // 3. Checagem de Paciente (Sem Sobreposição)
        if (!hasConflict) {
          const conflitoPaciente = await prisma.sessao.findFirst({
             where: {
                dataSessao: checkDate,
                horarioInicio: horarioInicio,
                status: { not: 'CANCELADA' },
                agendamento: {
                   pacientes: {
                      some: { pacienteId: idPaciente }
                   }
                }
             }
          });

          if (conflitoPaciente) {
             hasConflict = true;
             reason = `O paciente já possui consulta no dia ${dateStr} às ${horarioInicio}.`;
          }
        }

        if (hasConflict) {
          conflicts.push({ date: dateStr, reason });
        } else {
          availableWeeks.push(checkDate);
        }
    }

    if (conflicts.length > 0) {
      if (!skipConflicts) {
        return res.status(409).json({
          error: 'Conflito de datas detectado no ciclo.',
          conflicts
        });
      }
      
      // Se skipConflicts for true mas não sobrou NENHUMA semana livre
      if (availableWeeks.length === 0) {
        return res.status(400).json({
          error: 'Impossível agendar: todas as datas do ciclo possuem conflitos.'
        });
      }
    }

    // Se passou na auditoria completa, cria as reservas
    const agendamento = await prisma.agendamento.create({
      data: {
        salaId: idsSala,
        estagiarioId: estagiarioToUse.id,
        horarioInicio,
        horarioFim: `${parseInt(horarioInicio.split(':')[0]) + 1}:00`,
        tipo: numSemanas > 1 ? 'N_SEMANAS' : 'UNICO',
        status: 'CONFIRMADO',
        dataEspecifica: dataSessaoInicial,
        diaSemana: dataSessaoInicial.getDay(),
        pacientes: {
           create: { pacienteId: idPaciente }
        }
      }
    });

    const sessoesData = [];

    for (let i = 0; i < availableWeeks.length; i++) {
        const proximaData = availableWeeks[i]; 
        
        sessoesData.push({
            agendamentoId: agendamento.id,
            salaId: idsSala,
            horarioInicio: horarioInicio,
            dataSessao: proximaData,
            status: 'REALIZADA', 
            registradoPorId: userId,
            notas: `[Semana ${i+1}/${availableWeeks.length}]`
        });
    }

    // Gravação Atômica e Batch
    await prisma.sessao.createMany({ data: sessoesData });

    res.status(201).json({ message: 'Agendamento salvo com sucesso!', agendamento });

    // ─── Notificações ───────────────────────────────────────────────────────────
    const sala = await prisma.sala.findUnique({ where: { id: idsSala }, select: { nome: true } });
    const estagiarioUser = await prisma.usuario.findUnique({ where: { id: estagiarioToUse.usuarioId }, select: { nome: true } });
    const dataFormatada = dataSessaoInicial.toLocaleDateString('pt-BR');
    
    // Notifica Gestores sobre a criação (se não foi ele mesmo que criou)
    if (userPerfil !== 'GESTOR' && userPerfil !== 'ROOT') {
      const msgGestor = `${estagiarioUser?.nome || 'Estagiário'} criou ${numSemanas > 1 ? `${numSemanas} sessões` : 'uma sessão'} na ${sala?.nome || 'sala'} a partir de ${dataFormatada} às ${horarioInicio}.`;
      notificarGestores('AGENDAMENTO', '📅 Novo Agendamento', msgGestor);
    }
    
    // Notifica o Estagiário (se foi o gestor que criou pra ele)
    if (userPerfil === 'GESTOR' || userPerfil === 'ROOT') {
      notificarEstagiario(estagiarioToUse.id, 'AGENDAMENTO', '📅 Novo Agendamento (Gestão)', `A coordenação criou um agendamento para você na ${sala?.nome || 'sala'} a partir de ${dataFormatada} às ${horarioInicio}.`);
    } else {
      notificarEstagiario(estagiarioToUse.id, 'AGENDAMENTO', '📅 Agendamento confirmado', `Seu agendamento na ${sala?.nome || 'sala'} foi confirmado a partir de ${dataFormatada} às ${horarioInicio}.`);
    }
  } catch (error: any) {
    console.error("ERRO DO MOTOR DE AGENDAMENTO", error);
    
    // Tratamento específico do Banco de Dados para Concorrência Milissegundo (Unique Constraint)
    if (error.code === 'P2002') {
       return res.status(409).json({ error: 'Concorrência de Banco: Outro estagiário acabou de reservar esta sala neste exato horário.' });
    }

    res.status(500).json({ error: 'Erro crítico no processamento do agendamento.' });
  }
};

export const deleteAgendamento = async (req: Request, res: Response) => {
  try {
    const userPerfil = (req as any).user.perfil;
    if (userPerfil !== 'GESTOR' && userPerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas Gestores podem cancelar agendamentos.' });
    }
    const agendamentoId = parseInt(req.params.agendamentoId as string);

    const agendamento = await prisma.agendamento.findUnique({
      where: { id: agendamentoId }
    });

    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    // Soft delete: status = 'CANCELADO'
    await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { status: 'CANCELADO' }
    });

    // E cancela todas as sessões vinculadas a este agendamento que ainda não foram concluídas/realizadas
    await prisma.sessao.updateMany({
      where: { 
        agendamentoId: agendamentoId,
        status: { notIn: ['CONCLUIDA', 'FALTA'] }
      },
      data: { status: 'CANCELADA', notas: 'Cancelado pelo Gestor da Clínica.' }
    });

    res.json({ message: 'Agendamento cancelado com sucesso.' });

    // ─── Notificações ───────────────────────────────────────────────────────────
    const agFull = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: { estagiario: true, sala: { select: { nome: true } } }
    });
    if (agFull) {
      const dataRef = agFull.dataEspecifica ? agFull.dataEspecifica.toLocaleDateString('pt-BR') : '';
      notificarGestores('CANCELAMENTO', '⚠️ Agendamento Cancelado', `Agendamento da ${agFull.sala.nome} em ${dataRef} foi cancelado.`);
      notificarEstagiario(agFull.estagiarioId, 'CANCELAMENTO', '⚠️ Agendamento Cancelado', `Seu agendamento na ${agFull.sala.nome} (${dataRef} às ${agFull.horarioInicio}) foi cancelado pelo gestor.`);
      notificarPacientesDoAgendamento(agendamentoId, 'CANCELAMENTO', '⚠️ Consulta Cancelada', `Sua consulta marcada para ${dataRef} às ${agFull.horarioInicio} foi cancelada.`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao cancelar agendamento.' });
  }
};
