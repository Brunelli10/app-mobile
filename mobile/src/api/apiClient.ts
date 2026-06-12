import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/useAuthStore';
import { Alert, Platform } from 'react-native';

import Constants from 'expo-constants';

const getBaseURL = () => {
  // ─── AMBIENTE DE DESENVOLVIMENTO (LOCAL) ──────────────────────────────────
  // Em desenvolvimento, o IP do backend varia dependendo da rede Wi-Fi/LAN conectada.
  // Para evitar ter que alterar o IP manualmente ou limpar o cache do Expo toda vez,
  // fazemos a detecção dinâmica em tempo de execução (runtime).
  if (__DEV__) {
    // 1. Detecção no Navegador Web: usa o hostname atual da aba do navegador (ex: localhost ou IP da rede local)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      return `http://${hostname}:3000/api`;
    }

    // 2. Detecção no Dispositivo Móvel (Expo Go): extrai o IP da máquina que serviu o bundle JS
    const hostUri = Constants.expoConfig?.hostUri || '';
    if (hostUri) {
      const packagerIp = hostUri.split(':')[0];
      return `http://${packagerIp}:3000/api`;
    }

    return 'http://localhost:3000/api';
  }

  // ─── AMBIENTE DE PRODUÇÃO (BUILD FINAL) ──────────────────────────────────
  // Em produção, o backend roda sob um domínio estático e seguro (SSL).
  // Configure a variável EXPO_PUBLIC_API_URL no seu pipeline de CI/CD ou arquivo .env de build.
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
};

const baseURL = getBaseURL();
console.log('[API] Dynamically resolved baseURL:', baseURL);

export const api = axios.create({
  baseURL,
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

