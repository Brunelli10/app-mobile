import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

/**
 * GET /api/me/grade-horarios
 * Retorna a grade de disponibilidade do estagiário logado.
 */
export const getMinhaGrade = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const estagiario = await prisma.estagiario.findUnique({
      where: { usuarioId: userId }
    });

    if (!estagiario) {
      return res.status(403).json({ error: 'Apenas estagiários possuem grade de horários.' });
    }

    const disponibilidades = await prisma.disponibilidadeEstagiario.findMany({
      where: { estagiarioId: estagiario.id, ativo: true },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }]
    });

    res.json(disponibilidades);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar grade de horários.' });
  }
};

/**
 * PUT /api/me/grade-horarios
 * Substitui a grade de disponibilidade do estagiário logado.
 * Body: { disponibilidades: [{ diaSemana: number, horaInicio: string, horaFim: string }] }
 */
export const updateMinhaGrade = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { disponibilidades } = req.body;

    if (!Array.isArray(disponibilidades)) {
      return res.status(400).json({ error: 'Campo "disponibilidades" deve ser um array.' });
    }

    const estagiario = await prisma.estagiario.findUnique({
      where: { usuarioId: userId }
    });

    if (!estagiario) {
      return res.status(403).json({ error: 'Apenas estagiários podem gerenciar sua grade.' });
    }

    // Validação dos itens
    for (const item of disponibilidades) {
      if (item.diaSemana === undefined || !item.horaInicio || !item.horaFim) {
        return res.status(400).json({ error: 'Cada disponibilidade deve conter diaSemana, horaInicio e horaFim.' });
      }
      if (item.diaSemana < 0 || item.diaSemana > 6) {
        return res.status(400).json({ error: 'diaSemana deve ser entre 0 (Domingo) e 6 (Sábado).' });
      }
      if (!/^\d{2}:\d{2}$/.test(item.horaInicio) || !/^\d{2}:\d{2}$/.test(item.horaFim)) {
        return res.status(400).json({ error: 'horaInicio e horaFim devem estar no formato HH:mm.' });
      }
      if (item.horaInicio >= item.horaFim) {
        return res.status(400).json({ error: `horaInicio (${item.horaInicio}) deve ser anterior a horaFim (${item.horaFim}).` });
      }
    }

    // Estratégia: desativar todas as atuais e criar as novas (replace all)
    await prisma.$transaction(async (tx) => {
      // Soft-delete das antigas
      await tx.disponibilidadeEstagiario.updateMany({
        where: { estagiarioId: estagiario.id },
        data: { ativo: false }
      });

      // Criar as novas
      if (disponibilidades.length > 0) {
        await tx.disponibilidadeEstagiario.createMany({
          data: disponibilidades.map((d: any) => ({
            estagiarioId: estagiario.id,
            diaSemana: d.diaSemana,
            horaInicio: d.horaInicio,
            horaFim: d.horaFim,
            ativo: true
          })),
          skipDuplicates: true
        });
      }
    });

    // Retornar a grade atualizada
    const gradeAtualizada = await prisma.disponibilidadeEstagiario.findMany({
      where: { estagiarioId: estagiario.id, ativo: true },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }]
    });

    res.json({ message: 'Grade de horários atualizada com sucesso!', disponibilidades: gradeAtualizada });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Conflito: já existe uma disponibilidade neste dia/horário.' });
    }
    res.status(500).json({ error: 'Erro ao atualizar grade de horários.' });
  }
};

/**
 * GET /api/estagiarios/:id/grade-horarios
 * Retorna a grade de disponibilidade de um estagiário específico.
 * Acesso: GESTOR, ROOT, SUPERVISOR
 */
export const getGradeEstagiario = async (req: Request, res: Response) => {
  try {
    const userPerfil = req.user!.perfil;
    if (!['GESTOR', 'ROOT', 'SUPERVISOR'].includes(userPerfil)) {
      return res.status(403).json({ error: 'Acesso negado. Apenas gestores e supervisores podem visualizar a grade de outros estagiários.' });
    }

    const estagiarioId = parseInt(req.params.id as string);
    if (isNaN(estagiarioId)) {
      return res.status(400).json({ error: 'ID de estagiário inválido.' });
    }

    const estagiario = await prisma.estagiario.findUnique({
      where: { id: estagiarioId }
    });

    if (!estagiario) {
      return res.status(404).json({ error: 'Estagiário não encontrado.' });
    }

    const disponibilidades = await prisma.disponibilidadeEstagiario.findMany({
      where: { estagiarioId, ativo: true },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }]
    });

    res.json(disponibilidades);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar grade do estagiário.' });
  }
};
