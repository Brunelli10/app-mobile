import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = 'super-secret-clinic-key';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, matricula, semestre } = req.body;

    if (!name || !email || !password || !matricula || !semestre) {
      return res.status(400).json({ error: 'Preencha todos os campos, incluindo matrícula e semestre.' });
    }

    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Cria o usuário e o perfil de Estagiário na mesma transação
    const user = await prisma.usuario.create({
      data: { 
        nome: name, 
        email, 
        senhaHash: hashedPassword, 
        perfil: 'ESTAGIARIO', 
        status: 'PENDENTE',
        Estagiario: {
          create: {
            matricula,
            semestre: parseInt(semestre),
            ativo: false // Aguardando aprovação do Gestor
          }
        }
      }
    });

    res.status(201).json({ message: 'Conta de estagiário criada! Aguarde a aprovação do Gestor.', user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const validPassword = await bcrypt.compare(password, user.senhaHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // ROOT sempre pode logar — é o superusuário do sistema
    // Contas PENDENTES bloqueadas até aprovação de estagiário/gestor
    if (user.perfil !== 'ROOT' && user.status === 'PENDENTE') {
      return res.status(403).json({
        error: 'Conta pendente de aprovação. Aguarde um responsável da clínica aprovar seu acesso.',
        statusConta: 'PENDENTE'
      });
    }

    if (user.status === 'BLOQUEADO') {
      return res.status(403).json({ error: 'Conta bloqueada. Entre em contato com o gestor da clínica.' });
    }

    const token = jwt.sign(
      { id: user.id, perfil: user.perfil, status: user.status },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil, status: user.status }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Conta não encontrada.' });
    }

    // Para MVP: Gera senha temporária alfanumérica de 6 dígitos
    const tempPassword = Math.random().toString(36).slice(-6).toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.usuario.update({
      where: { id: user.id },
      data: { senhaHash: hashedPassword }
    });

    res.json({ message: 'Senha redefinida com sucesso.', novaSenha: tempPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

