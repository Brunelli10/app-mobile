import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// ─── Middleware de Validação com Zod ─────────────────────────────────────────
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      return res.status(400).json({
        error: `Validação falhou: ${firstError.path.join('.')} — ${firstError.message}`,
        detalhes: result.error.issues.map((e: any) => ({
          campo: e.path.join('.'),
          mensagem: e.message
        }))
      });
    }
    req.body = result.data;
    next();
  };
};

// ─── Middleware Global de Erros ───────────────────────────────────────────────
export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ [GlobalError]:', err);

  // Erros do Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Conflito: este registro já existe no sistema (chave duplicada).' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro não encontrado no banco de dados.' });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Referência inválida: o ID relacionado não existe.' });
  }

  // Erros de Validação do Zod
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Dados inválidos', detalhes: err.issues });
  }

  // Erro genérico
  return res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor. Tente novamente.',
  });
};
