import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMinhaAgenda = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const userDB = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { perfil: true }
    });

    const perfil = userDB?.perfil;
    let whereClause: any = {};

    if (perfil === 'GESTOR' || perfil === 'ROOT') {
      // Gestor vê todas as sessões da clínica
      whereClause = {};
    } else if (perfil === 'ESTAGIARIO') {
      // Estagiário vê apenas as sessões que ele registrou/criou
      const estagiario = await prisma.estagiario.findUnique({ where: { usuarioId: userId } });
      if (!estagiario) return res.status(404).json({ error: 'Perfil de estagiário não encontrado.' });
      whereClause = { agendamento: { estagiarioId: estagiario.id } };
    } else if (perfil === 'PACIENTE') {
      // Paciente vê apenas as sessões em que ele é o paciente vinculado
      // A ligação é: Usuario → Paciente (via usuarioId, se existir)
      const paciente = await prisma.paciente.findFirst({
        where: { usuarioId: userId }
      });
      if (!paciente) {
        // Paciente sem vínculo direto — retorna lista vazia (conta ainda não vinculada)
        return res.json([]);
      }
      whereClause = {
        agendamento: {
          pacientes: { some: { pacienteId: paciente.id } }
        }
      };
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

    const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

    const formattedAgenda = sessoes.map(s => {
      const dateObj = new Date(s.dataSessao);
      const pacientesList = s.agendamento.pacientes.map(p => ({
        id: p.paciente.id,
        nome: p.paciente.nome,
        cpf: p.paciente.cpf,
        dataNascimento: p.paciente.dataNascimento,
        responsavelNome: p.paciente.responsavelNome
      }));

      return {
        id: s.id,
        salaNome: s.agendamento.sala.nome,
        horarioInicio: s.agendamento.horarioInicio,
        horarioFim: s.agendamento.horarioFim,
        tipo: s.agendamento.tipo,
        status: s.status,
        notas: s.notas,
        estagiarioNome: s.agendamento.estagiario?.usuario?.nome || '',
        diaExtenso: days[dateObj.getDay()],
        dia: String(dateObj.getDate()).padStart(2, '0'),
        dataRaw: dateObj.toISOString().split('T')[0],
        pacientes: pacientesList
      };
    });

    res.json(formattedAgenda);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar agenda' });
  }
};

