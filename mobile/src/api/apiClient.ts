import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/useAuthStore';
import { Alert, Platform } from 'react-native';

export const api = axios.create({
  baseURL: 'http://192.168.68.156:3000/api',
  timeout: 10000, // 10 segundos de timeout
});

// ─── Interceptor de Request: Injetar Token JWT ───────────────────────────────
api.interceptors.request.use(async (config) => {
  let token = null;
  if (Platform.OS === 'web') {
    token = localStorage.getItem('clinic_jwt_token');
  } else {
    token = await SecureStore.getItemAsync('clinic_jwt_token');
  }
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Interceptor de Response: Tratar Erros Globais ───────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Sem internet ou servidor fora do ar
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        Alert.alert(
          '⏱️ Tempo Esgotado',
          'O servidor demorou para responder. Verifique sua conexão e tente novamente.'
        );
      } else {
        Alert.alert(
          '📡 Sem Conexão',
          'Não foi possível conectar ao servidor da clínica. Verifique sua rede Wi-Fi ou 4G.'
        );
      }
      return Promise.reject(error);
    }

    // Token expirado — derrubar sessão automaticamente
    if (error.response.status === 401) {
      console.warn('Token expirado, encerrando sessão.');
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // Erro de servidor (500+) — notificar de forma discreta no console
    if (error.response.status >= 500) {
      console.error('❌ Erro no servidor:', error.response.data);
    }

    // Para todos os outros erros (400, 403, 409, 422), 
    // deixar o componente tratar com o try/catch local
    return Promise.reject(error);
  }
);

