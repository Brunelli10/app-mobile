import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';
import { authApi } from '../../../api/auth.api';
import { useAuthStore } from '../../../store/useAuthStore';

// Mock the API client
jest.mock('../../../api/auth.api', () => ({
  authApi: {
    login: jest.fn(),
  },
}));

describe('🔑 LoginScreen — Integração/E2E Frontend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Deve renderizar os campos de entrada e botões', () => {
    render(<LoginScreen />);
    
    // Verificar títulos e inputs
    expect(screen.getByText('Bem-vindo(a)')).toBeTruthy();
    expect(screen.getByPlaceholderText('ex: email@exemplo.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('********')).toBeTruthy();
    expect(screen.getByText('ENTRAR')).toBeTruthy();
  });

  test('2. Deve exibir erro se e-mail for inválido', async () => {
    render(<LoginScreen />);

    // Digitar e-mail inválido
    const emailInput = screen.getByPlaceholderText('ex: email@exemplo.com');
    fireEvent.changeText(emailInput, 'email_invalido');

    // Clicar em Entrar
    const enterBtn = screen.getByText('ENTRAR');
    fireEvent.press(enterBtn);

    // Aguardar validação Zod
    await waitFor(() => {
      expect(screen.getByText('Digite um e-mail válido.')).toBeTruthy();
    });
  });

  test('3. Deve exibir erro se a senha for vazia', async () => {
    render(<LoginScreen />);

    // Digitar e-mail válido mas deixar senha vazia
    const emailInput = screen.getByPlaceholderText('ex: email@exemplo.com');
    fireEvent.changeText(emailInput, 'valido@exemplo.com');

    // Clicar em Entrar
    const enterBtn = screen.getByText('ENTRAR');
    fireEvent.press(enterBtn);

    // Aguardar validação Zod
    await waitFor(() => {
      expect(screen.getByText('A senha não pode ser vazia.')).toBeTruthy();
    });
  });

  test('4. Deve fazer login com sucesso e salvar dados no store', async () => {
    const mockLogin = authApi.login as jest.Mock;
    mockLogin.mockResolvedValueOnce({
      token: 'mock-jwt-token',
      user: {
        id: 1,
        nome: 'Administrador Teste',
        email: 'admin@teste.com',
        perfil: 'ROOT',
        status: 'ATIVO',
      },
    });

    render(<LoginScreen />);

    // Digitar credenciais corretas
    fireEvent.changeText(screen.getByPlaceholderText('ex: email@exemplo.com'), 'admin@teste.com');
    fireEvent.changeText(screen.getByPlaceholderText('********'), 'senha123');

    // Clicar em entrar
    fireEvent.press(screen.getByText('ENTRAR'));

    // Aguardar chamada API
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@teste.com', 'senha123');
    });

    // Validar se o useAuthStore gravou o token
    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe('mock-jwt-token');
      expect(useAuthStore.getState().user?.nome).toBe('Administrador Teste');
    });
  });

  test('5. Deve exibir erro especial se a conta do estagiário estiver PENDENTE', async () => {
    const mockLogin = authApi.login as jest.Mock;
    mockLogin.mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          error: 'Conta pendente',
          statusConta: 'PENDENTE',
        },
      },
    });

    render(<LoginScreen />);

    // Digitar e-mail de estagiário pendente
    fireEvent.changeText(screen.getByPlaceholderText('ex: email@exemplo.com'), 'estagiario@teste.com');
    fireEvent.changeText(screen.getByPlaceholderText('********'), 'senha123');

    // Clicar entrar
    fireEvent.press(screen.getByText('ENTRAR'));

    // Aguardar renderização da mensagem de pendente
    await waitFor(() => {
      expect(
        screen.getByText('Sua conta ainda está aguardando aprovação de um Gestor para acessar o sistema.')
      ).toBeTruthy();
    });
  });
});
