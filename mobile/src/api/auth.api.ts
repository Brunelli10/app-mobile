import { api } from './apiClient';

export interface UserInfo {
  id: number;
  nome: string;
  email: string;
  perfil: 'ROOT' | 'GESTOR' | 'ESTAGIARIO' | 'SUPERVISOR' | 'PACIENTE';
  status: 'PENDENTE' | 'ATIVO' | 'BLOQUEADO';
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: number;
    email: string;
  };
}

export interface ForgotPasswordResponse {
  message: string;
  novaSenha?: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },
  register: async (payload: Record<string, any>): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/auth/register', payload);
    return response.data;
  },
  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    const response = await api.post<ForgotPasswordResponse>('/auth/esqueci-senha', { email });
    return response.data;
  }
};
