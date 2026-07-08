export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        perfil: 'ROOT' | 'GESTOR' | 'ESTAGIARIO' | 'SUPERVISOR' | 'PACIENTE';
        status: 'PENDENTE' | 'ATIVO' | 'BLOQUEADO';
      };
    }
  }
}
