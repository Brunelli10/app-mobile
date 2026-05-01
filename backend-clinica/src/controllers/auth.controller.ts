import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = 'super-secret-clinic-key';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.usuario.create({
      data: { nome: name, email, senhaHash: hashedPassword, perfil: 'PACIENTE', status: 'PENDENTE' }
    });

    res.status(201).json({ message: 'Conta criada! Aguarde a aprovação de um responsável.', user: { id: user.id, email: user.email } });
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

