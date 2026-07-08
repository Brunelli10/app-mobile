import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';


export interface PacienteInput {
  nome: string;
  dataNascimento: string | Date;
  cpf: string;
  telefone: string;
  tipoAtendimento: 'CRIANCA' | 'ADULTO' | 'CASAL';
  responsavelNome?: string | null;
  responsavelCpf?: string | null;
  responsavelTelefone?: string | null;
  parceiroNome?: string | null;
  parceiroCpf?: string | null;
  parceiroTelefone?: string | null;
}

// Helper to calculate age
const calcularIdade = (dataNascimento: Date): number => {
  const hoje = new Date();
  let idade = hoje.getFullYear() - dataNascimento.getFullYear();
  const mesAtual = hoje.getMonth() - dataNascimento.getMonth();
  if (mesAtual < 0 || (mesAtual === 0 && hoje.getDate() < dataNascimento.getDate())) {
    idade--;
  }
  return idade;
};

export class PacientesService {
  static async getPacientes(solicitantePerfil: string) {
    if (solicitantePerfil === 'PACIENTE') {
      const error: any = new Error('Acesso Negado: Pacientes não podem listar outros pacientes.');
      error.statusCode = 403;
      throw error;
    }
    const pacientes = await prisma.paciente.findMany({
      where: { ativo: true },
    });
    // Normaliza tipo legado INDIVIDUAL → ADULTO
    return pacientes.map(p => ({
      ...p,
      tipoAtendimento: p.tipoAtendimento === 'INDIVIDUAL' ? 'ADULTO' : p.tipoAtendimento
    }));
  }

  static async getPacientePerfil(id: number, solicitantePerfil: string, solicitanteId: number) {
    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        agendamentos: {
          include: {
            agendamento: {
              include: {
                sala: true,
                estagiario: { include: { usuario: { select: { nome: true } } } },
                sessoes: { orderBy: { dataSessao: 'desc' }, take: 20 }
              }
            }
          }
        }
      }
    });

    if (!paciente) {
      const error: any = new Error('Paciente não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    if (solicitantePerfil === 'PACIENTE' && paciente.usuarioId !== solicitanteId) {
      const error: any = new Error('Acesso Negado: Você só pode visualizar seu próprio perfil.');
      error.statusCode = 403;
      throw error;
    }

    const sessoes = paciente.agendamentos.flatMap(ap =>
      ap.agendamento.sessoes.map(s => ({
        id: s.id,
        data: s.dataSessao,
        status: s.status,
        notas: s.notas,
        sala: ap.agendamento.sala.nome,
        estagiario: ap.agendamento.estagiario.usuario.nome
      }))
    ).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    const totalSessoes = sessoes.length;
    const presencas = sessoes.filter(s => s.status === 'CONCLUIDA').length;
    const faltas = sessoes.filter(s => s.status === 'FALTA').length;

    const agendamentosAtivos = paciente.agendamentos
      .filter(ap => ap.agendamento.status === 'CONFIRMADO')
      .map(ap => ({
        id: ap.agendamento.id,
        sala: ap.agendamento.sala.nome,
        estagiario: ap.agendamento.estagiario.usuario.nome,
        horarioInicio: ap.agendamento.horarioInicio,
        horarioFim: ap.agendamento.horarioFim,
        diaSemana: ap.agendamento.diaSemana,
        dataEspecifica: ap.agendamento.dataEspecifica,
        tipo: ap.agendamento.tipo
      }));

    return {
      ...paciente,
      tipoAtendimento: paciente.tipoAtendimento === 'INDIVIDUAL' ? 'ADULTO' : paciente.tipoAtendimento,
      sessoes,
      agendamentosAtivos,
      stats: {
        totalSessoes,
        presencas,
        faltas,
        taxaPresenca: totalSessoes > 0 ? Math.round((presencas / totalSessoes) * 100) : 0
      }
    };
  }

  static async convitePaciente(data: { nome: string; email: string }) {
    const { nome, email } = data;

    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('Já existe uma conta com este e-mail.');
    }

    const senhaProvisoria = 'clinica123';
    const hashedPassword = await bcrypt.hash(senhaProvisoria, 10);

    const user = await prisma.usuario.create({
      data: { 
        nome, 
        email, 
        senhaHash: hashedPassword, 
        perfil: 'PACIENTE', 
        status: 'ATIVO' 
      }
    });

    return { 
      senhaProvisoria, 
      email,
      usuarioId: user.id
    };
  }

  static async createPaciente(payload: PacienteInput, solicitantePerfil: string) {
    if (solicitantePerfil === 'PACIENTE') {
      const error: any = new Error('Acesso Negado: Pacientes não podem criar pacientes.');
      error.statusCode = 403;
      throw error;
    }
    const {
      nome,
      dataNascimento,
      cpf,
      telefone,
      tipoAtendimento,
      responsavelNome,
      responsavelCpf,
      responsavelTelefone,
      parceiroNome,
      parceiroCpf,
      parceiroTelefone
    } = payload;

    if (!cpfValidator.isValid(cpf)) {
      throw new Error('O CPF do paciente é inválido.');
    }
    if (!/^\d{10,11}$/.test(telefone)) {
      throw new Error('Telefone do paciente deve ter 10 ou 11 dígitos numéricos.');
    }

    const nascimento = new Date(dataNascimento);
    if (isNaN(nascimento.getTime())) {
      throw new Error('Data de nascimento inválida.');
    }
    if (nascimento > new Date()) {
      throw new Error('Data de nascimento não pode ser no futuro.');
    }

    const idade = calcularIdade(nascimento);
    const isMenorDeIdade = idade < 18;

    if (isMenorDeIdade && (!responsavelNome || !responsavelTelefone)) {
      const error: any = new Error(`Paciente é menor de idade (${idade} anos). Nome e Telefone do Responsável são obrigatórios.`);
      error.menorDeIdade = true;
      error.statusCode = 422;
      throw error;
    }

    if (responsavelCpf && !cpfValidator.isValid(responsavelCpf)) {
      throw new Error('O CPF do responsável é inválido.');
    }
    if (responsavelTelefone && !/^\d{10,11}$/.test(responsavelTelefone)) {
      throw new Error('Telefone do responsável deve ter 10 ou 11 dígitos numéricos.');
    }

    if (tipoAtendimento === 'CASAL') {
      if (!parceiroNome || !parceiroCpf || !parceiroTelefone) {
        const error: any = new Error('Para atendimento de casal, Nome, CPF e Telefone do Cônjuge/Parceiro são obrigatórios.');
        error.statusCode = 422;
        throw error;
      }
      if (!cpfValidator.isValid(parceiroCpf)) {
        throw new Error('O CPF do Cônjuge/Parceiro é inválido.');
      }
      if (!/^\d{10,11}$/.test(parceiroTelefone)) {
        throw new Error('Telefone do Cônjuge/Parceiro deve ter 10 ou 11 dígitos numéricos.');
      }
    }

    return await prisma.paciente.create({
      data: {
        nome,
        dataNascimento: nascimento,
        cpf,
        telefone,
        tipoAtendimento,
        ativo: true,
        responsavelNome: responsavelNome || null,
        responsavelCpf: responsavelCpf || null,
        responsavelTelefone: responsavelTelefone || null,
        parceiroNome: tipoAtendimento === 'CASAL' ? parceiroNome : null,
        parceiroCpf: tipoAtendimento === 'CASAL' ? parceiroCpf : null,
        parceiroTelefone: tipoAtendimento === 'CASAL' ? parceiroTelefone : null
      }
    });
  }

  static async updatePaciente(id: number, payload: PacienteInput, solicitantePerfil: string) {
    if (solicitantePerfil === 'PACIENTE') {
      const error: any = new Error('Acesso Negado: Pacientes não podem atualizar pacientes.');
      error.statusCode = 403;
      throw error;
    }
    const {
      nome,
      dataNascimento,
      cpf,
      telefone,
      tipoAtendimento,
      responsavelNome,
      responsavelCpf,
      responsavelTelefone,
      parceiroNome,
      parceiroCpf,
      parceiroTelefone
    } = payload;

    if (!cpfValidator.isValid(cpf)) {
      throw new Error('O CPF do paciente é inválido.');
    }
    if (!/^\d{10,11}$/.test(telefone)) {
      throw new Error('Telefone do paciente deve ter 10 ou 11 dígitos numéricos.');
    }

    const nascimento = new Date(dataNascimento);
    if (isNaN(nascimento.getTime())) {
      throw new Error('Data de nascimento inválida.');
    }
    if (nascimento > new Date()) {
      throw new Error('Data de nascimento não pode ser no futuro.');
    }

    const idade = calcularIdade(nascimento);
    const isMenorDeIdade = idade < 18;

    if (isMenorDeIdade && (!responsavelNome || !responsavelTelefone)) {
      const error: any = new Error(`Paciente é menor de idade (${idade} anos). Nome e Telefone do Responsável são obrigatórios.`);
      error.statusCode = 422;
      throw error;
    }

    if (responsavelCpf && !cpfValidator.isValid(responsavelCpf)) {
      throw new Error('O CPF do responsável é inválido.');
    }
    if (responsavelTelefone && !/^\d{10,11}$/.test(responsavelTelefone)) {
      throw new Error('Telefone do responsável deve ter 10 ou 11 dígitos numéricos.');
    }

    if (tipoAtendimento === 'CASAL') {
      if (!parceiroNome || !parceiroCpf || !parceiroTelefone) {
        const error: any = new Error('Para atendimento de casal, Nome, CPF e Telefone do Cônjuge/Parceiro são obrigatórios.');
        error.statusCode = 422;
        throw error;
      }
      if (!cpfValidator.isValid(parceiroCpf)) {
        throw new Error('O CPF do Cônjuge/Parceiro é inválido.');
      }
      if (!/^\d{10,11}$/.test(parceiroTelefone)) {
        throw new Error('Telefone do Cônjuge/Parceiro deve ter 10 ou 11 dígitos numéricos.');
      }
    }

    return await prisma.paciente.update({
      where: { id },
      data: {
        nome,
        dataNascimento: nascimento,
        cpf,
        telefone,
        tipoAtendimento,
        responsavelNome: isMenorDeIdade ? responsavelNome : null,
        responsavelCpf: isMenorDeIdade ? (responsavelCpf || null) : null,
        responsavelTelefone: isMenorDeIdade ? responsavelTelefone : null,
        parceiroNome: tipoAtendimento === 'CASAL' ? parceiroNome : null,
        parceiroCpf: tipoAtendimento === 'CASAL' ? parceiroCpf : null,
        parceiroTelefone: tipoAtendimento === 'CASAL' ? parceiroTelefone : null
      }
    });
  }

  static async deletePaciente(id: number) {
    return await prisma.paciente.update({
      where: { id },
      data: { ativo: false }
    });
  }

  static async updateResponsavel(id: number, responsavel: { responsavelNome: string; responsavelCpf?: string; responsavelTelefone: string }) {
    const { responsavelNome, responsavelCpf, responsavelTelefone } = responsavel;
    return await prisma.paciente.update({
      where: { id },
      data: { responsavelNome, responsavelCpf, responsavelTelefone }
    });
  }

  static async getPacientesPendentes() {
    return await prisma.usuario.findMany({
      where: { status: 'PENDENTE', perfil: 'PACIENTE' },
      select: { id: true, nome: true, email: true, createdAt: true }
    });
  }

  static async aprovarPaciente(usuarioId: number) {
    return await prisma.usuario.update({
      where: { id: usuarioId },
      data: { status: 'ATIVO' }
    });
  }

  static async promoverParaEstagiario(usuarioId: number, estData: { matricula: string; cargaHorariaSemanal: string; dataInicio: string }) {
    const { matricula, cargaHorariaSemanal, dataInicio } = estData;

    return await prisma.$transaction(async (tx) => {
      const usuarioAtualizado = await tx.usuario.update({
        where: { id: usuarioId },
        data: { perfil: 'ESTAGIARIO', status: 'ATIVO' }
      });

      const novoEstagiario = await tx.estagiario.create({
        data: {
          usuarioId,
          matricula,
          cargaHorariaSemanal: parseInt(cargaHorariaSemanal),
          dataInicio: new Date(dataInicio),
          ativo: true
        }
      });

      return { usuario: usuarioAtualizado, estagiario: novoEstagiario };
    });
  }
}
