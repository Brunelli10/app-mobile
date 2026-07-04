import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/apiClient';
import { useNotificacoesStore } from '../store/useNotificacoesStore';
import { useAuthStore } from '../store/useAuthStore';

export function useNotificacoesCount() {
  const setNaoLidas = useNotificacoesStore(state => state.setNaoLidas);
  const token = useAuthStore(state => state.token);

  const { data } = useQuery({
    queryKey: ['notificacoes-count'],
    queryFn: async () => {
      const res = await api.get('/notificacoes/count');
      return res.data;
    },
    enabled: !!token,
    refetchInterval: 30000 // A cada 30 segundos
  });

  useEffect(() => {
    if (data?.naoLidas !== undefined) {
      setNaoLidas(data.naoLidas);
    }
  }, [data, setNaoLidas]);
}
