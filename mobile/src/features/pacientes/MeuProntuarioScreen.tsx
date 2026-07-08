import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { colors, shadows, spacing } from '../../config/theme';
import { useAuthStore } from '../../store/useAuthStore';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  REALIZADA: { label: 'Agendada', color: colors.primary, bg: '#EFF6FF' },
  CONCLUIDA: { label: 'Concluida', color: '#059669', bg: '#D1FAE5' },
  FALTA: { label: 'Falta', color: '#DC2626', bg: '#FEE2E2' },
  CANCELADA: { label: 'Cancelada', color: '#64748B', bg: '#F1F5F9' }
};

const formatDate = (date?: string) => {
  if (!date) return 'Data nao informada';
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

export function MeuProntuarioScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const { data: sessoes = [], isLoading, refetch } = useQuery({
    queryKey: ['meu-prontuario'],
    queryFn: async () => {
      const { data } = await api.get('/meus-agendamentos');
      return [...(data || [])].sort((a: any, b: any) => String(b.dataRaw).localeCompare(String(a.dataRaw)));
    }
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const pacienteNome = sessoes[0]?.pacientes?.[0]?.nome || user?.nome || 'Paciente';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeader} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Meu Prontuario</Text>
          <Text style={styles.headerSub}>{pacienteNome} · {sessoes.length} sessao(oes)</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="document-text-outline" size={24} color={colors.primary} />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 56 }} />
      ) : (
        <FlatList
          data={sessoes}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={56} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Nenhuma sessao registrada</Text>
              <Text style={styles.emptyText}>Seu historico clinico aparecera aqui quando houver atendimentos vinculados.</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.REALIZADA;
            return (
              <View style={[styles.card, { borderLeftColor: status.color }]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.dateText}>{formatDate(item.dataRaw)}</Text>
                    <Text style={styles.timeText}>{item.horarioInicio} - {item.horarioFim} · {item.salaNome}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                <Text style={styles.metaText}>Responsavel: {item.estagiarioNome || 'A definir'}</Text>

                <View style={styles.notesBox}>
                  <Text style={styles.notesTitle}>Notas clinicas</Text>
                  <Text style={styles.notesText}>{item.notas || 'Sem notas registradas para esta sessao.'}</Text>
                </View>

                <View style={styles.feedbackBox}>
                  <Text style={styles.notesTitle}>Feedback da supervisao</Text>
                  <Text style={styles.notesText}>{item.supervisorNota || 'Sem feedback da supervisao ate o momento.'}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, padding: spacing.xl, paddingTop: 28, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.primaryDark },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.infoLight, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderLeftWidth: 4, ...shadows.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  dateText: { fontSize: 15, fontWeight: '800', color: colors.textHeader, textTransform: 'capitalize', flexShrink: 1 },
  timeText: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '800' },
  metaText: { marginTop: 12, fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  notesBox: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC' },
  feedbackBox: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#EFF6FF' },
  notesTitle: { fontSize: 12, fontWeight: '800', color: colors.textHeader, marginBottom: 6 },
  notesText: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 36, marginTop: 72 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.textHeader, marginTop: 14 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 6 }
});
