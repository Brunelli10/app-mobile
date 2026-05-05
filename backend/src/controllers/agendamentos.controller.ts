import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createAgendamento = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { salaId, horarioInicio, weeksCount, pacienteId, dataInicio } = req.body;
    
    if (!salaId || !horarioInicio || !weeksCount || !pacienteId || !dataInicio) {
       return res.status(400).json({ error: 'Dados incompletos para o agendamento.' });
    }

    let estagiario = await prisma.estagiario.findUnique({
      where: { usuarioId: userId }
    });

    if (!estagiario) {
       return res.status(403).json({ error: 'Perfil de Estagiário não encontrado.' });
    }

    // Pega a data selecionada no Calendário pelo Frontend
    const dataSessaoInicial = new Date(`${dataInicio}T00:00:00`); 

    const numSemanas = parseInt(weeksCount) || 1;
    const idsSala = parseInt(salaId);
    const idPaciente = parseInt(pacienteId);
    
    // Motor Tripla Checagem
    for (let i = 0; i < numSemanas; i++) {
        const checkDate = new Date(dataSessaoInicial);
        checkDate.setDate(dataSessaoInicial.getDate() + (i * 7));
        
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
           return res.status(400).json({ error: `A sala já está ocupada no dia ${checkDate.toLocaleDateString()} às ${horarioInicio}.` });
        }

        // 2. Checagem de Estagiário (Presença Única)
        const conflitoEstagiario = await prisma.sessao.findFirst({
           where: {
              dataSessao: checkDate,
              horarioInicio: horarioInicio,
              status: { not: 'CANCELADA' },
              agendamento: {
                 estagiarioId: estagiario.id
              }
           }
        });

        if (conflitoEstagiario) {
           return res.status(400).json({ error: `Você já possui um atendimento em outra sala no dia ${checkDate.toLocaleDateString()} às ${horarioInicio}.` });
        }

        // 3. Checagem de Paciente (Sem Sobreposição)
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
           return res.status(400).json({ error: `O paciente já possui consulta agendada na clínica no dia ${checkDate.toLocaleDateString()} às ${horarioInicio}.` });
        }
    }

    // Se passou na auditoria completa, cria as reservas
    const agendamento = await prisma.agendamento.create({
      data: {
        salaId: idsSala,
        estagiarioId: estagiario.id,
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

    for (let i = 0; i < numSemanas; i++) {
        const proximaData = new Date(dataSessaoInicial);
        proximaData.setDate(dataSessaoInicial.getDate() + (i * 7)); 
        
        sessoesData.push({
            agendamentoId: agendamento.id,
            salaId: idsSala,
            horarioInicio: horarioInicio,
            dataSessao: proximaData,
            status: 'REALIZADA', 
            registradoPorId: userId,
            notas: `[Semana ${i+1}/${numSemanas}]`
        });
    }

    // Gravação Atômica e Batch
    await prisma.sessao.createMany({ data: sessoesData });

    res.status(201).json({ message: 'Agendamento salvo com sucesso (Sem conflitos)!', agendamento });
  } catch (error: any) {
    console.error("ERRO DO MOTOR DE AGENDAMENTO", error);
    
    // Tratamento específico do Banco de Dados para Concorrência Milissegundo (Unique Constraint)
    if (error.code === 'P2002') {
       return res.status(409).json({ error: 'Concorrência de Banco: Outro estagiário acabou de reservar esta sala neste exato horário.' });
    }

    res.status(500).json({ error: 'Erro crítico no processamento do agendamento.' });
  }
};
