import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';

const prisma = new PrismaClient();

// ─── Calcular Idade a partir da data de nascimento ───────────────────────────
const calcularIdade = (dataNascimento: Date): number => {
  const hoje = new Date();
  let idade = hoje.getFullYear() - dataNascimento.getFullYear();
  const mesAtual = hoje.getMonth() - dataNascimento.getMonth();
  if (mesAtual < 0 || (mesAtual === 0 && hoje.getDate() < dataNascimento.getDate())) {
    idade--;
  }
  return idade;
};

// ─── GET /pacientes ───────────────────────────────────────────────────────────
export const getPacientes = async (req: Request, res: Response) => {
  try {
    const pacientes = await prisma.paciente.findMany({
      where: { ativo: true },
    });
    res.json(pacientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
};

// ─── GET /pacientes/:id/perfil ────────────────────────────────────────────────
export const getPacientePerfil = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const paciente = await prisma.paciente.findUnique({
      where: { id: parseInt(id as string) },
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

    if (!paciente) return res.status(404).json({ error: 'Paciente não encontrado.' });

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

    res.json({
      ...paciente,
      sessoes,
      agendamentosAtivos,
      stats: {
        totalSessoes,
        presencas,
        faltas,
        taxaPresenca: totalSessoes > 0 ? Math.round((presencas / totalSessoes) * 100) : 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar perfil do paciente' });
  }
};

// ─── POST /pacientes/convite ──────────────────────────────────────────────────
export const convitePaciente = async (req: Request, res: Response) => {
  try {
    const { nome, email } = req.body;
    
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios para o convite.' });
    }

    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Já existe uma conta com este e-mail.' });
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

    res.status(201).json({ 
      message: 'Acesso gerado com sucesso!', 
      senhaProvisoria, 
      email,
      usuarioId: user.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao gerar convite para paciente.' });
  }
};

// ─── POST /pacientes ──────────────────────────────────────────────────────────
export const createPaciente = async (req: Request, res: Response) => {
  try {
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
    } = req.body;

    if (!nome || !dataNascimento || !cpf || !telefone || !tipoAtendimento) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, dataNascimento, cpf, telefone, tipoAtendimento.' });
    }

    // Validações de formato e limites lógicos
    if (!cpfValidator.isValid(cpf)) {
      return res.status(400).json({ error: 'O CPF do paciente é inválido.' });
    }
    if (!/^\d{10,11}$/.test(telefone)) {
      return res.status(400).json({ error: 'Telefone do paciente deve ter 10 ou 11 dígitos numéricos.' });
    }

    const nascimento = new Date(dataNascimento);
    if (isNaN(nascimento.getTime())) {
      return res.status(400).json({ error: 'Data de nascimento inválida.' });
    }
    if (nascimento > new Date()) {
      return res.status(400).json({ error: 'Data de nascimento não pode ser no futuro.' });
    }

    const idade = calcularIdade(nascimento);
    const isMenorDeIdade = idade < 18;

    // Regra de Negócio: Menor de idade PRECISA de responsável
    if (isMenorDeIdade && (!responsavelNome || !responsavelTelefone)) {
      return res.status(422).json({
        error: `Paciente é menor de idade (${idade} anos). Nome e Telefone do Responsável são obrigatórios.`,
        menorDeIdade: true
      });
    }

    if (responsavelCpf && !cpfValidator.isValid(responsavelCpf)) {
      return res.status(400).json({ error: 'O CPF do responsável é inválido.' });
    }
    if (responsavelTelefone && !/^\d{10,11}$/.test(responsavelTelefone)) {
      return res.status(400).json({ error: 'Telefone do responsável deve ter 10 ou 11 dígitos numéricos.' });
    }

    // Regra de Negócio: CASAL exige parceiro(a)
    if (tipoAtendimento === 'CASAL') {
      if (!parceiroNome || !parceiroCpf || !parceiroTelefone) {
        return res.status(422).json({ error: 'Para atendimento de casal, Nome, CPF e Telefone do Cônjuge/Parceiro são obrigatórios.' });
      }
      if (!cpfValidator.isValid(parceiroCpf)) {
        return res.status(400).json({ error: 'O CPF do Cônjuge/Parceiro é inválido.' });
      }
      if (!/^\d{10,11}$/.test(parceiroTelefone)) {
        return res.status(400).json({ error: 'Telefone do Cônjuge/Parceiro deve ter 10 ou 11 dígitos numéricos.' });
      }
    }

    const paciente = await prisma.paciente.create({
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

    res.status(201).json(paciente);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Este CPF já está cadastrado no sistema.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar paciente' });
  }
};

// ─── PUT /pacientes/:id ──────────────────────────────────────────────────────
export const updatePaciente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
    } = req.body;

    if (!nome || !dataNascimento || !cpf || !telefone || !tipoAtendimento) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, dataNascimento, cpf, telefone, tipoAtendimento.' });
    }

    // Validações de formato e limites lógicos
    if (!cpfValidator.isValid(cpf)) {
      return res.status(400).json({ error: 'O CPF do paciente é inválido.' });
    }
    if (!/^\d{10,11}$/.test(telefone)) {
      return res.status(400).json({ error: 'Telefone do paciente deve ter 10 ou 11 dígitos numéricos.' });
    }

    const nascimento = new Date(dataNascimento);
    if (isNaN(nascimento.getTime())) {
      return res.status(400).json({ error: 'Data de nascimento inválida.' });
    }
    if (nascimento > new Date()) {
      return res.status(400).json({ error: 'Data de nascimento não pode ser no futuro.' });
    }

    const idade = calcularIdade(nascimento);
    const isMenorDeIdade = idade < 18;

    // Menor de idade exige responsável
    if (isMenorDeIdade && (!responsavelNome || !responsavelTelefone)) {
      return res.status(422).json({
        error: `Paciente é menor de idade (${idade} anos). Nome e Telefone do Responsável são obrigatórios.`
      });
    }

    if (responsavelCpf && !cpfValidator.isValid(responsavelCpf)) {
      return res.status(400).json({ error: 'O CPF do responsável é inválido.' });
    }
    if (responsavelTelefone && !/^\d{10,11}$/.test(responsavelTelefone)) {
      return res.status(400).json({ error: 'Telefone do responsável deve ter 10 ou 11 dígitos numéricos.' });
    }

    // CASAL exige parceiro(a)
    if (tipoAtendimento === 'CASAL') {
      if (!parceiroNome || !parceiroCpf || !parceiroTelefone) {
        return res.status(422).json({ error: 'Para atendimento de casal, Nome, CPF e Telefone do Cônjuge/Parceiro são obrigatórios.' });
      }
      if (!cpfValidator.isValid(parceiroCpf)) {
        return res.status(400).json({ error: 'O CPF do Cônjuge/Parceiro é inválido.' });
      }
      if (!/^\d{10,11}$/.test(parceiroTelefone)) {
        return res.status(400).json({ error: 'Telefone do Cônjuge/Parceiro deve ter 10 ou 11 dígitos numéricos.' });
      }
    }

    const pacienteAtualizado = await prisma.paciente.update({
      where: { id: parseInt(id as string) },
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

    res.json(pacienteAtualizado);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Este CPF já está cadastrado no sistema.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar dados do paciente.' });
  }
};

// ─── DELETE /pacientes/:id ───────────────────────────────────────────────────
export const deletePaciente = async (req: Request, res: Response) => {
  try {
    const userPerfil = (req as any).user.perfil;
    if (userPerfil !== 'GESTOR' && userPerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas Gestores podem inativar pacientes.' });
    }

    const { id } = req.params;

    // Soft delete: set ativo = false
    await prisma.paciente.update({
      where: { id: parseInt(id as string) },
      data: { ativo: false }
    });

    res.json({ message: 'Paciente inativado com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao inativar paciente.' });
  }
};

// ─── PUT /pacientes/:id/responsavel ──────────────────────────────────────────
export const updateResponsavel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { responsavelNome, responsavelCpf, responsavelTelefone } = req.body;

    if (!responsavelNome || !responsavelTelefone) {
       return res.status(400).json({ error: 'Nome e Telefone do Responsável são obrigatórios.' });
    }

    const pacienteAtualizado = await prisma.paciente.update({
      where: { id: parseInt(id as string) },
      data: { responsavelNome, responsavelCpf, responsavelTelefone }
    });

    res.json(pacienteAtualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar dados do responsável' });
  }
};

// ─── GET /pacientes/pendentes ─────────────────────────────────────────────────
// Lista de Usuários pendentes de aprovação (visível para Estagiários e Gestores)
export const getPacientesPendentes = async (req: Request, res: Response) => {
  try {
    const pendentes = await prisma.usuario.findMany({
      where: { status: 'PENDENTE', perfil: 'PACIENTE' },
      select: { id: true, nome: true, email: true, createdAt: true }
    });
    res.json(pendentes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar pendentes' });
  }
};

// ─── PATCH /pacientes/aprovar/:usuarioId ──────────────────────────────────────
// Estagiário aprova um paciente (PENDENTE → ATIVO)
export const aprovarPaciente = async (req: Request, res: Response) => {
  try {
    const solicitantePerfi = (req as any).user.perfil;
    if (!['ESTAGIARIO', 'GESTOR', 'ROOT'].includes(solicitantePerfi)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { usuarioId } = req.params;
    const usuario = await prisma.usuario.update({
      where: { id: parseInt(usuarioId as string) },
      data: { status: 'ATIVO' }
    });

    res.json({ message: `Conta de ${usuario.nome} aprovada com sucesso!`, usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao aprovar paciente' });
  }
};

// ─── PATCH /usuarios/promover-estagiario/:usuarioId ───────────────────────────
// Somente o GESTOR ou ROOT pode promover um usuário para ESTAGIÁRIO
export const promoverParaEstagiario = async (req: Request, res: Response) => {
  try {
    const solicitantePerfil = (req as any).user.perfil;
    if (!['GESTOR', 'ROOT'].includes(solicitantePerfil)) {
      return res.status(403).json({ error: 'Apenas Gestores podem promover um usuário para Estagiário.' });
    }

    const { usuarioId } = req.params;
    const { matricula, cargaHorariaSemanal, dataInicio } = req.body;

    if (!matricula || !cargaHorariaSemanal || !dataInicio) {
      return res.status(400).json({ error: 'Matrícula, Carga Horária e Data de Início são obrigatórios.' });
    }

    // Transação: Atualiza o perfil do Usuário E cria o registro Estagiario
    const [usuarioAtualizado, novoEstagiario] = await prisma.$transaction([
      prisma.usuario.update({
        where: { id: parseInt(usuarioId as string) },
        data: { perfil: 'ESTAGIARIO', status: 'ATIVO' }
      }),
      prisma.estagiario.create({
        data: {
          usuarioId: parseInt(usuarioId as string),
          matricula,
          cargaHorariaSemanal: parseInt(cargaHorariaSemanal),
          dataInicio: new Date(dataInicio),
          ativo: true
        }
      })
    ]);

    res.json({ message: `${usuarioAtualizado.nome} agora é um Estagiário!`, estagiario: novoEstagiario });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Esta matrícula já está em uso.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao promover usuário para Estagiário' });
  }
};
