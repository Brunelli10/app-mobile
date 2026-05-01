import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  user: any | null;
  login: (token: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  login: async (token, userData) => {
    await SecureStore.setItemAsync('clinic_jwt_token', token);
    set({ token, user: userData });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('clinic_jwt_token');
    set({ token: null, user: null });
  },
}));
