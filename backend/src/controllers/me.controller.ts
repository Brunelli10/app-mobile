import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';


/** GET /api/me — retorna dados do usuário logado */
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nome: true, email: true, perfil: true, status: true, fotoPerfil: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar dados.' });
  }
};

/** PATCH /api/me — atualiza nome e/ou email */
export const updateMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { nome, email } = req.body;

    if (!nome && !email) {
      return res.status(400).json({ error: 'Informe ao menos um campo para atualizar.' });
    }

    if (email) {
      const existing = await prisma.usuario.findFirst({
        where: { email, id: { not: userId } }
      });
      if (existing) {
        return res.status(400).json({ error: 'Este e-mail já está em uso por outra conta.' });
      }
    }

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: {
        ...(nome ? { nome } : {}),
        ...(email ? { email } : {})
      },
      select: { id: true, nome: true, email: true, perfil: true, status: true }
    });

    res.json({ message: 'Perfil atualizado com sucesso!', user: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
};

/** PATCH /api/me/senha — troca de senha */
export const updateSenha = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter ao menos 6 caracteres.' });
    }

    const user = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const senhaValida = await bcrypt.compare(senhaAtual, user.senhaHash);
    if (!senhaValida) {
      return res.status(400).json({ error: 'Senha atual incorreta.' });
    }

    const novaHash = await bcrypt.hash(novaSenha, 10);
    await prisma.usuario.update({
      where: { id: userId },
      data: { senhaHash: novaHash }
    });

    res.json({ message: 'Senha alterada com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
};
