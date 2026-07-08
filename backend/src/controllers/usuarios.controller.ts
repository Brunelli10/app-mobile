import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { criarNotificacao, notificarGestores } from '../utils/notificacoes.helper';

const prisma = new PrismaClient();

export const getUsuarios = async (req: Request, res: Response) => {
  try {
    const solicitantePerfil = req.user!.perfil;
    if (solicitantePerfil !== 'GESTOR' && solicitantePerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas gestores podem listar os usuários.' });
    }

    const { search, status, perfil } = req.query;

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { nome: { contains: search as string } },
        { email: { contains: search as string } }
      ];
    }

    if (status) {
      whereClause.status = status as string;
    }

    if (perfil) {
      whereClause.perfil = perfil as string;
    }

    const usuarios = await prisma.usuario.findMany({
      where: whereClause,
      include: {
        estagiario: true,
        supervisor: true,
        paciente: true
      },
      orderBy: { nome: 'asc' }
    });

    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
};

export const updateUsuarioStatus = async (req: Request, res: Response) => {
  try {
    const solicitantePerfil = req.user!.perfil;
    if (solicitantePerfil !== 'GESTOR' && solicitantePerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas gestores podem alterar o status de usuários.' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['PENDENTE', 'ATIVO', 'BLOQUEADO'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Escolha PENDENTE, ATIVO ou BLOQUEADO.' });
    }

    const usuario = await prisma.usuario.update({
      where: { id: parseInt(id as string) },
      data: { status }
    });
    
    if (status === 'ATIVO') {
      criarNotificacao(usuario.id, 'APROVACAO', '🎉 Acesso Aprovado!', 'Seu cadastro foi aprovado pelo gestor. Bem-vindo(a) ao sistema!');
      notificarGestores('SISTEMA', '👤 Usuário Aprovado', `A conta de ${usuario.nome} foi ativada com sucesso.`);
    }

    res.json({ message: `Status de ${usuario.nome} atualizado para ${status}!`, usuario });
  } catch (error) {
    console.error('Erro ao atualizar status do usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar status do usuário.' });
  }
};

export const updateUsuarioRole = async (req: Request, res: Response) => {
  try {
    const solicitantePerfil = req.user!.perfil;
    if (solicitantePerfil !== 'GESTOR' && solicitantePerfil !== 'ROOT') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas gestores podem gerenciar perfis de acesso.' });
    }

    const { id } = req.params;
    const { perfil, matricula, cargaHorariaSemanal, dataInicio, crp, especialidade } = req.body;

    const usuarioId = parseInt(id as string);

    if (!perfil || !['PACIENTE', 'ESTAGIARIO', 'SUPERVISOR', 'GESTOR', 'ROOT'].includes(perfil)) {
      return res.status(400).json({ error: 'Perfil inválido.' });
    }

    // Usar uma transação para garantir atomicidade
    const result = await prisma.$transaction(async (tx) => {
      // 1. Atualizar perfil do usuário
      const updatedUser = await tx.usuario.update({
        where: { id: usuarioId },
        data: { perfil }
      });

      // 2. Tratar dependências adicionais dependendo do perfil
      if (perfil === 'ESTAGIARIO') {
        if (!matricula || !cargaHorariaSemanal || !dataInicio) {
          throw new Error('Matrícula, carga horária e data de início são obrigatórios para Estagiários.');
        }

        // Criar ou atualizar Estagiário
        await tx.estagiario.upsert({
          where: { usuarioId },
          create: {
            usuarioId,
            matricula,
            cargaHorariaSemanal: parseInt(cargaHorariaSemanal),
            dataInicio: new Date(dataInicio),
            ativo: true
          },
          update: {
            matricula,
            cargaHorariaSemanal: parseInt(cargaHorariaSemanal),
            dataInicio: new Date(dataInicio),
            ativo: true
          }
        });

        // Desativar Supervisor se houver
        await tx.supervisor.updateMany({
          where: { usuarioId },
          data: { ativo: false }
        });

      } else if (perfil === 'SUPERVISOR') {
        if (!crp || !especialidade) {
          throw new Error('CRP e especialidade são obrigatórios para Supervisores.');
        }

        // Criar ou atualizar Supervisor
        await tx.supervisor.upsert({
          where: { usuarioId },
          create: {
            usuarioId,
            crp,
            especialidade,
            ativo: true
          },
          update: {
            crp,
            especialidade,
            ativo: true
          }
        });

        // Desativar Estagiário se houver
        await tx.estagiario.updateMany({
          where: { usuarioId },
          data: { ativo: false }
        });

      } else {
        // Para GESTOR, ROOT ou PACIENTE
        // Desativar perfis de Estagiário e Supervisor para integridade de dados
        await tx.estagiario.updateMany({
          where: { usuarioId },
          data: { ativo: false }
        });

        await tx.supervisor.updateMany({
          where: { usuarioId },
          data: { ativo: false }
        });
      }

      return updatedUser;
    });

    res.json({ message: `Perfil de acesso de ${result.nome} atualizado para ${perfil}!`, usuario: result });
  } catch (error: any) {
    console.error('Erro ao atualizar perfil de acesso do usuário:', error);
    res.status(400).json({ error: error.message || 'Erro ao atualizar perfil de acesso do usuário.' });
  }
};
