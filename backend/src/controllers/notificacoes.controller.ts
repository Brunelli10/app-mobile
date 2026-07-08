import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** GET /api/notificacoes — lista as notificações do usuário logado */
export const getNotificacoes = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { soNaoLidas } = req.query;

    const notificacoes = await prisma.notificacao.findMany({
      where: {
        usuarioId: userId,
        ...(soNaoLidas === 'true' ? { lida: false } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(notificacoes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
};

/** GET /api/notificacoes/count — contagem total e de não lidas */
export const getNotificacoesCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const [total, naoLidas] = await Promise.all([
      prisma.notificacao.count({ where: { usuarioId: userId } }),
      prisma.notificacao.count({ where: { usuarioId: userId, lida: false } })
    ]);

    res.json({ total, naoLidas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao contar notificações.' });
  }
};

/** PUT /api/notificacoes/:id/lida — marca uma notificação como lida */
export const marcarComoLida = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    await prisma.notificacao.updateMany({
      where: { id: parseInt(id), usuarioId: userId },
      data: { lida: true }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao marcar notificação.' });
  }
};

/** PUT /api/notificacoes/lidas/todas — marca todas as notificações como lidas */
export const marcarTodasLidas = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await prisma.notificacao.updateMany({
      where: { usuarioId: userId, lida: false },
      data: { lida: true }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao marcar todas como lidas.' });
  }
};
