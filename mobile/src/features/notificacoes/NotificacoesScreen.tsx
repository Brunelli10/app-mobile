import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../config/theme';
import { api } from '../../api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificacoesStore } from '../../store/useNotificacoesStore';

const ICONS_POR_TIPO: Record<string, any> = {
  AGENDAMENTO: { icon: 'calendar-outline', bg: '#EFF6FF', color: colors.primary },
  CANCELAMENTO: { icon: 'close-circle-outline', bg: '#FEF2F2', color: '#EF4444' },
  APROVACAO: { icon: 'checkmark-circle-outline', bg: '#F0FDF4', color: '#16A34A' },
  FALTA: { icon: 'warning-outline', bg: '#FFFBEB', color: '#D97706' },
  NOTA_SUPERVISOR: { icon: 'document-text-outline', bg: '#FDF4FF', color: '#9333EA' },
  SISTEMA: { icon: 'notifications-outline', bg: '#F1F5F9', color: '#64748B' }
};

export function NotificacoesScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'TODAS' | 'NAO_LIDAS'>('TODAS');
  const setNaoLidas = useNotificacoesStore(state => state.setNaoLidas);

  const { data: notificacoes, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['notificacoes', filter],
    queryFn: async () => {
      const soNaoLidas = filter === 'NAO_LIDAS';
      const res = await api.get(`/notificacoes${soNaoLidas ? '?soNaoLidas=true' : ''}`);
      return res.data;
    }
  });

  const marcarLidaMutation = useMutation({
    mutationFn: async (id: number) => await api.put(`/notificacoes/${id}/lida`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes-count'] });
    }
  });

  const marcarTodasLidasMutation = useMutation({
    mutationFn: async () => await api.put(`/notificacoes/lidas/todas`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      setNaoLidas(0);
    }
  });

  const renderItem = ({ item }: { item: any }) => {
    const config = ICONS_POR_TIPO[item.tipo] || ICONS_POR_TIPO.SISTEMA;
    const isNova = !item.lida;

    const dataObj = new Date(item.createdAt);
    const horaF = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dataF = dataObj.toLocaleDateString('pt-BR');
    
    return (
      <TouchableOpacity 
        style={[styles.card, isNova && styles.cardNova]} 
        activeOpacity={0.7}
        onPress={() => {
          if (isNova) marcarLidaMutation.mutate(item.id);
        }}
      >
        <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.titulo, isNova && styles.textoNegrito]}>{item.titulo}</Text>
          <Text style={styles.mensagem} numberOfLines={3}>{item.mensagem}</Text>
          <Text style={styles.tempo}>{dataF} às {horaF}</Text>
        </View>
        {isNova && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        <TouchableOpacity 
          style={styles.marcarLidasBtn} 
          onPress={() => marcarTodasLidasMutation.mutate()}
          disabled={marcarTodasLidasMutation.isPending}
        >
          {marcarTodasLidasMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="checkmark-done-outline" size={22} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterPill, filter === 'TODAS' && styles.filterPillActive]}
          onPress={() => setFilter('TODAS')}
        >
          <Text style={[styles.filterPillText, filter === 'TODAS' && styles.filterPillTextActive]}>Todas</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterPill, filter === 'NAO_LIDAS' && styles.filterPillActive]}
          onPress={() => setFilter('NAO_LIDAS')}
        >
          <Text style={[styles.filterPillText, filter === 'NAO_LIDAS' && styles.filterPillTextActive]}>Não Lidas</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notificacoes}
          keyExtractor={i => i.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>Nenhuma notificação encontrada.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#FFF', elevation: 2 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.textHeader },
  marcarLidasBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  filterRow: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#FFF' },
  filterPill: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F1F5F9' },
  filterPillActive: { backgroundColor: colors.primary },
  filterPillText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  filterPillTextActive: { color: '#FFF' },
  list: { padding: 16, paddingBottom: 40 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1 },
  cardNova: { backgroundColor: '#F0F7FF', borderColor: '#DBEAFE', borderWidth: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  content: { flex: 1, justifyContent: 'center' },
  titulo: { fontSize: 14, fontWeight: '600', color: colors.textHeader, marginBottom: 4 },
  textoNegrito: { fontWeight: '800' },
  mensagem: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  tempo: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4, marginLeft: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 12, fontWeight: '500' }
});
