import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, matricula, semestre } = req.body;

    if (!name || !email || !password || !matricula || !semestre) {
      return res.status(400).json({ error: 'Preencha todos os campos, incluindo matrícula e semestre.' });
    }

    const registeredUser = await AuthService.register({ name, email, password, matricula, semestre });
    
    return res.status(201).json({ 
      message: 'Conta de estagiário criada! Aguarde a aprovação do Gestor.', 
      user: registeredUser 
    });
  } catch (error: any) {
    console.error(error);
    if (error.message === 'E-mail já cadastrado.') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const result = await AuthService.login({ email, password });
    return res.json(result);
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Credenciais inválidas.') {
      return res.status(401).json({ error: error.message });
    }
    if (error.statusConta === 'PENDENTE') {
      return res.status(403).json({
        error: error.message,
        statusConta: 'PENDENTE'
      });
    }
    if (error.message === 'Conta bloqueada. Entre em contato com o gestor da clínica.') {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const tempPassword = await AuthService.forgotPassword(email);
    return res.json({ message: 'Senha redefinida com sucesso.', novaSenha: tempPassword });
  } catch (error: any) {
    console.error(error);
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};
