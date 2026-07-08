import { Request, Response } from 'express';
import { PacientesService } from '../services/pacientes.service';

export const getPacientes = async (req: Request, res: Response) => {
  try {
    const perfil = req.user!.perfil;
    const pacientes = await PacientesService.getPacientes(perfil);
    return res.json(pacientes);
  } catch (error: any) {
    console.error(error);
    if (error.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
};

export const getPacientePerfil = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const perfil = req.user!.perfil;
    const solicitanteId = req.user!.id;
    const result = await PacientesService.getPacientePerfil(parseInt(id as string), perfil, solicitanteId);
    return res.json(result);
  } catch (error: any) {
    console.error(error);
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    if (error.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro ao buscar perfil do paciente' });
  }
};

export const convitePaciente = async (req: Request, res: Response) => {
  try {
    const { nome, email } = req.body;
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios para o convite.' });
    }

    const result = await PacientesService.convitePaciente({ nome, email });
    return res.status(201).json({
      message: 'Acesso gerado com sucesso!',
      ...result
    });
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Já existe uma conta com este e-mail.') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro ao gerar convite para paciente.' });
  }
};

export const createPaciente = async (req: Request, res: Response) => {
  try {
    const { nome, dataNascimento, cpf, telefone, tipoAtendimento } = req.body;
    if (!nome || !dataNascimento || !cpf || !telefone || !tipoAtendimento) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, dataNascimento, cpf, telefone, tipoAtendimento.' });
    }

    const perfil = req.user!.perfil;
    const paciente = await PacientesService.createPaciente(req.body, perfil);
    return res.status(201).json(paciente);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Este CPF já está cadastrado no sistema.' });
    }
    console.error(error);
    if (error.statusCode === 422 || error.statusCode === 400) {
      return res.status(error.statusCode).json({ error: error.message, menorDeIdade: error.menorDeIdade });
    }
    const badRequestMsgs = [
      'O CPF do paciente é inválido.',
      'Telefone do paciente deve ter 10 ou 11 dígitos numéricos.',
      'Data de nascimento inválida.',
      'Data de nascimento não pode ser no futuro.',
      'O CPF do responsável é inválido.',
      'Telefone do responsável deve ter 10 ou 11 dígitos numéricos.',
      'O CPF do Cônjuge/Parceiro é inválido.',
      'Telefone do Cônjuge/Parceiro deve ter 10 ou 11 dígitos numéricos.'
    ];
    if (badRequestMsgs.includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro ao criar paciente' });
  }
};

export const updatePaciente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, dataNascimento, cpf, telefone, tipoAtendimento } = req.body;

    if (!nome || !dataNascimento || !cpf || !telefone || !tipoAtendimento) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, dataNascimento, cpf, telefone, tipoAtendimento.' });
    }

    const perfil = req.user!.perfil;
    const pacienteAtualizado = await PacientesService.updatePaciente(parseInt(id as string), req.body, perfil);
    return res.json(pacienteAtualizado);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Este CPF já está cadastrado no sistema.' });
    }
    console.error(error);
    if (error.statusCode === 422 || error.statusCode === 400) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const badRequestMsgs = [
      'O CPF do paciente é inválido.',
      'Telefone do paciente deve ter 10 ou 11 dígitos numéricos.',
      'Data de nascimento inválida.',
      'Data de nascimento não pode ser no futuro.',
      'O CPF do responsável é inválido.',
      'Telefone do responsável deve ter 10 ou 11 dígitos numéricos.',
      'O CPF do Cônjuge/Parceiro é inválido.',
      'Telefone do Cônjuge/Parceiro deve ter 10 ou 11 dígitos numéricos.'
    ];
    if (badRequestMsgs.includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro ao atualizar dados do paciente.' });
  }
};

export const deletePaciente = async (req: Request, res: Response) => {
  try {
    const userPerfil = req.user!.perfil;
    if (userPerfil !== 'GESTOR' && userPerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas Gestores podem inativar pacientes.' });
    }

    const { id } = req.params;
    await PacientesService.deletePaciente(parseInt(id as string));
    return res.json({ message: 'Paciente inativado com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao inativar paciente.' });
  }
};

export const updateResponsavel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { responsavelNome, responsavelCpf, responsavelTelefone } = req.body;

    if (!responsavelNome || !responsavelTelefone) {
       return res.status(400).json({ error: 'Nome e Telefone do Responsável são obrigatórios.' });
    }

    const pacienteAtualizado = await PacientesService.updateResponsavel(parseInt(id as string), {
      responsavelNome,
      responsavelCpf,
      responsavelTelefone
    });

    return res.json(pacienteAtualizado);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar dados do responsável' });
  }
};

export const getPacientesPendentes = async (req: Request, res: Response) => {
  try {
    const pendentes = await PacientesService.getPacientesPendentes();
    return res.json(pendentes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar pendentes' });
  }
};

export const aprovarPaciente = async (req: Request, res: Response) => {
  try {
    const solicitantePerfil = req.user!.perfil;
    if (!['ESTAGIARIO', 'GESTOR', 'ROOT'].includes(solicitantePerfil)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { usuarioId } = req.params;
    const usuario = await PacientesService.aprovarPaciente(parseInt(usuarioId as string));

    return res.json({ message: `Conta de ${usuario.nome} aprovada com sucesso!`, usuario });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao aprovar paciente' });
  }
};

export const promoverParaEstagiario = async (req: Request, res: Response) => {
  try {
    const solicitantePerfil = req.user!.perfil;
    if (!['GESTOR', 'ROOT'].includes(solicitantePerfil)) {
      return res.status(403).json({ error: 'Apenas Gestores podem promover um usuário para Estagiário.' });
    }

    const { usuarioId } = req.params;
    const { matricula, cargaHorariaSemanal, dataInicio } = req.body;

    if (!matricula || !cargaHorariaSemanal || !dataInicio) {
      return res.status(400).json({ error: 'Matrícula, Carga Horária e Data de Início são obrigatórios.' });
    }

    const result = await PacientesService.promoverParaEstagiario(parseInt(usuarioId as string), {
      matricula,
      cargaHorariaSemanal,
      dataInicio
    });

    return res.json({ 
      message: `${result.usuario.nome} agora é um Estagiário!`, 
      estagiario: result.estagiario 
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Esta matrícula já está em uso.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao promover usuário para Estagiário' });
  }
};
