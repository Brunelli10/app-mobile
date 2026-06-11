import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const updateStatusSessao = async (req: Request, res: Response) => {
  try {
    const sessaoId = parseInt(req.params.id as string);
    const { status, notas } = req.body; 
    
    // Atualiza a Sessão Atual (Check-in ou Falta com Anotação Clínica)
    const sessaoAtualizada = await prisma.sessao.update({
      where: { id: sessaoId },
      data: { 
         status,
         notas 
      },
      include: {
         agendamento: {
            include: {
               // Puxa o histórico de todas sessões desse estagiário para esse ciclo
               sessoes: {
                  orderBy: { dataSessao: 'asc' }
               }
            }
         }
      }
    });

    // SISTEMA DE CANCELAMENTO AUTOMÁTICO (Regra: Faltas Sucessivas)
    if (status === 'FALTA') {
       const historico = sessaoAtualizada.agendamento.sessoes;
       
       // Qual é o índice cronológico desta sessão atual?
       const indexAtual = historico.findIndex(s => s.id === sessaoId);

       // Se não for a primeira sessão, podemos olhar para trás
       if (indexAtual > 0) {
           const sessaoAnterior = historico[indexAtual - 1];
           
           if (sessaoAnterior.status === 'FALTA') {
               // REGRA ATIVADA! Duas faltas consecutivas sem justificativa procedida.
               // Trancamos e cancelamos todas as ocorrências futuras desse paciente na sala.
               
               const idsFuturos = historico
                  .filter((s, idx) => idx > indexAtual && s.status !== 'CANCELADA' && s.status !== 'CONCLUIDA')
                  .map(s => s.id);

               if (idsFuturos.length > 0) {
                  await prisma.sessao.updateMany({
                     where: { id: { in: idsFuturos } },
                     data: { 
                       status: 'CANCELADA',
                       notas: 'Cancelamento Automático DB: Evasão/Abandono de Ciclo (>= 2 Faltas).'
                     }
                  });
               }
           }
       }
    }

    res.json({ message: 'Ação gravada com Sucesso e Auditoria Computada.', sessao: sessaoAtualizada });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro de sistema ao fechar a Sessão.' });
  }
};

// ─── PATCH /sessoes/:id/notas ────────────────────────────────────────────────
export const updateNotasSessao = async (req: Request, res: Response) => {
  try {
    const sessaoId = parseInt(req.params.id as string);
    const { notas } = req.body;
    const sessaoAtualizada = await prisma.sessao.update({
      where: { id: sessaoId },
      data: { notas }
    });
    res.json({ message: 'Notas de evolução clínica salvas com sucesso.', sessao: sessaoAtualizada });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro de sistema ao salvar anotações.' });
  }
};

// ─── PATCH /sessoes/:id/substituto ───────────────────────────────────────────
export const updateSubstitutoSessao = async (req: Request, res: Response) => {
  try {
    const sessaoId = parseInt(req.params.id as string);
    const { estagiarioSubstitutoId } = req.body;

    const sessaoAtualizada = await prisma.sessao.update({
      where: { id: sessaoId },
      data: { estagiarioSubstitutoId: estagiarioSubstitutoId ? parseInt(estagiarioSubstitutoId as string) : null }
    });
    res.json({ message: 'Estagiário substituto atualizado com sucesso.', sessao: sessaoAtualizada });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao definir estagiário substituto.' });
  }
};

// ─── PATCH /sessoes/:id/supervisor-nota ──────────────────────────────────────
export const updateSupervisorNotaSessao = async (req: Request, res: Response) => {
  try {
    const userPerfil = (req as any).user.perfil;
    if (userPerfil !== 'GESTOR' && userPerfil !== 'ROOT' && userPerfil !== 'SUPERVISOR') {
      return res.status(403).json({ error: 'Acesso Negado: Apenas supervisores ou gestores podem registrar feedbacks de supervisão.' });
    }

    const sessaoId = parseInt(req.params.id as string);
    const { supervisorNota } = req.body;

    const sessaoAtualizada = await prisma.sessao.update({
      where: { id: sessaoId },
      data: { supervisorNota }
    });
    res.json({ message: 'Feedback de supervisão salvo com sucesso.', sessao: sessaoAtualizada });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar feedback de supervisão.' });
  }
};

// ─── GET /sessoes/estagiarios ────────────────────────────────────────────────
export const getEstagiarios = async (req: Request, res: Response) => {
  try {
    const estagiarios = await prisma.estagiario.findMany({
      where: { ativo: true },
      include: {
        usuario: { select: { nome: true } }
      }
    });

    const formatted = estagiarios.map(e => ({
      id: e.id,
      nome: e.usuario.nome,
      matricula: e.matricula
    }));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar estagiários.' });
  }
};
