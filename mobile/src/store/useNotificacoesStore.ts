import { create } from 'zustand';

interface NotificacoesState {
  naoLidas: number;
  setNaoLidas: (count: number) => void;
}

export const useNotificacoesStore = create<NotificacoesState>((set) => ({
  naoLidas: 0,
  setNaoLidas: (count) => set({ naoLidas: count })
}));
