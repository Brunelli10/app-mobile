import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface AuthState {
  token: string | null;
  user: any | null;
  isHydrating: boolean;
  login: (token: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

const TOKEN_KEY = 'clinic_jwt_token';
const USER_KEY = 'clinic_user_data';

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isHydrating: true,

  login: async (token, userData) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
    }
    set({ token, user: userData });
  },

  logout: async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    }
    set({ token: null, user: null });
  },

  hydrate: async () => {
    try {
      let token: string | null = null;
      let userRaw: string | null = null;

      if (Platform.OS === 'web') {
        token = localStorage.getItem(TOKEN_KEY);
        userRaw = localStorage.getItem(USER_KEY);
      } else {
        token = await SecureStore.getItemAsync(TOKEN_KEY);
        userRaw = await SecureStore.getItemAsync(USER_KEY);
      }

      if (token && userRaw) {
        set({ token, user: JSON.parse(userRaw) });
      }
    } catch (e) {
      console.warn('[AuthStore] Falha ao reidratar sessão:', e);
    } finally {
      set({ isHydrating: false });
    }
  },
}));
