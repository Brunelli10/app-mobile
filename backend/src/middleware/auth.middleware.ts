import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'super-secret-clinic-key';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido pela requisição. Usuário não Autenticado.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Injetando o decodificado (dados do usuário) para uso no Payload dos Controllers
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token Expirado ou Inválido. Acesso Vetado.' });
  }
};
