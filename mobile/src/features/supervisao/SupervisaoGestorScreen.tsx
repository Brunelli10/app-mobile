import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, FlatList } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { colors, shadows } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const FEEDBACK_FILTERS = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'SEM_FEEDBACK', label: 'Sem Feedback' },
  { key: 'COM_FEEDBACK', label: 'Com Feedback' },
];

export function SupervisaoGestorScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [filtroFeedback, setFiltroFeedback] = useState('SEM_FEEDBACK');
  const [filtroEstagiario, setFiltroEstagiario] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [sessaoSelecionada, setSessaoSelecionada] = useState<number | null>(null);

  // Buscar estagiários para dropdown
  const { data: estagiarios } = useQuery({
    queryKey: ['estagiarios-supervisao'],
    queryFn: async () => (await api.get('/sessoes/estagiarios')).data
  });

  // Buscar sessões para supervisão
  const { data: sessoes, isLoading, refetch } = useQuery({
    queryKey: ['sessoes-supervisao', filtroFeedback, filtroEstagiario],
    queryFn: async () => {
      const params: any = {};
      if (filtroFeedback !== 'TODOS') params.feedbackStatus = filtroFeedback;
      if (filtroEstagiario) params.estagiarioId = filtroEstagiario;
      return (await api.get('/sessoes/supervisao', { params })).data;
    }
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // Mutation para salvar feedback
  const feedbackMutation = useMutation({
    mutationFn: async ({ sessaoId, nota }: { sessaoId: number; nota: string }) => {
      return (await api.patch(`/sessoes/${sessaoId}/supervisor-nota`, { supervisorNota: nota })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessoes-supervisao'] });
      setFeedbackText('');
      setSessaoSelecionada(null);
      Alert.alert('Sucesso', 'Feedback de supervisão salvo!');
    },
    onError: (err: any) => {
      Alert.alert('Erro', err?.response?.data?.error || 'Erro ao salvar feedback.');
    }
  });

  const handleSaveFeedback = () => {
    if (!sessaoSelecionada || !feedbackText.trim()) {
      return Alert.alert('Atenção', 'Selecione uma sessão e escreva o feedback.');
    }
    feedbackMutation.mutate({ sessaoId: sessaoSelecionada, nota: feedbackText.trim() });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  };

  const renderSessao = ({ item }: { item: any }) => {
    const isSelected = sessaoSelecionada === item.id;
    const pacientesNomes = item.pacientes?.map((p: any) => p.nome).join(', ') || 'N/A';
    
    return (
      <TouchableOpacity
        style={[styles.sessaoCard, isSelected && styles.sessaoCardSelected]}
        onPress={() => {
          setSessaoSelecionada(isSelected ? null : item.id);
          setFeedbackText(item.supervisorNota || '');
        }}
        activeOpacity={0.8}
      >
        <View style={styles.sessaoHeader}>
          <View style={styles.sessaoInfo}>
            <Text style={styles.sessaoDate}>{formatDate(item.dataSessao)} às {item.horarioInicio}</Text>
            <Text style={styles.sessaoEstagiario}>🎓 {item.estagiario}</Text>
            <Text style={styles.sessaoPaciente}>👤 {pacientesNomes}</Text>
            <Text style={styles.sessaoSala}>🏠 {item.sala}</Text>
          </View>
          <View style={styles.sessaoRight}>
            <View style={[styles.statusBadge, item.feedbackStatus === 'COM_FEEDBACK' ? styles.badgeGreen : styles.badgeOrange]}>
              <Text style={[styles.statusText, item.feedbackStatus === 'COM_FEEDBACK' ? styles.textGreen : styles.textOrange]}>
                {item.feedbackStatus === 'COM_FEEDBACK' ? 'Revisada' : 'Pendente'}
              </Text>
            </View>
            <View style={[styles.sessaoStatusBadge, { backgroundColor: item.status === 'FALTA' ? '#FEE2E2' : item.status === 'CANCELADA' ? '#F1F5F9' : '#ECFDF5' }]}>
              <Text style={{ fontSize: 9, fontWeight: '600', color: item.status === 'FALTA' ? '#DC2626' : item.status === 'CANCELADA' ? '#64748B' : '#059669' }}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Notas do estagiário */}
        {item.notas && (
          <View style={styles.notasBox}>
            <Text style={styles.notasLabel}>📝 Evolução do estagiário:</Text>
            <Text style={styles.notasText} numberOfLines={2}>{item.notas}</Text>
          </View>
        )}

        {/* Feedback existente */}
        {item.supervisorNota && !isSelected && (
          <View style={styles.feedbackExistente}>
            <Text style={styles.feedbackExistenteLabel}>✅ Feedback registrado:</Text>
            <Text style={styles.feedbackExistenteText} numberOfLines={2}>"{item.supervisorNota}"</Text>
          </View>
        )}

        {/* Campo de feedback expandido */}
        {isSelected && (
          <View style={styles.feedbackForm}>
            <Text style={styles.feedbackFormLabel}>
              {item.supervisorNota ? 'Editar feedback:' : 'Escrever feedback de supervisão:'}
            </Text>
            <TextInput
              style={styles.feedbackInput}
              multiline
              numberOfLines={4}
              placeholder="Orientações, correções, observações clínicas..."
              value={feedbackText}
              onChangeText={setFeedbackText}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.saveBtn, (!feedbackText.trim() || feedbackMutation.isPending) && styles.saveBtnDisabled]}
              onPress={handleSaveFeedback}
              disabled={!feedbackText.trim() || feedbackMutation.isPending}
            >
              {feedbackMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
              )}
              <Text style={styles.saveBtnText}>
                {feedbackMutation.isPending ? 'Salvando...' : 'Salvar Feedback'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Supervisão Clínica</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        {/* Chips de feedback status */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {FEEDBACK_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, filtroFeedback === f.key && styles.chipActive]}
              onPress={() => setFiltroFeedback(f.key)}
            >
              <Text style={[styles.chipText, filtroFeedback === f.key && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}

          {/* Chips de estagiário */}
          <View style={styles.chipDivider} />
          <TouchableOpacity
            style={[styles.chip, !filtroEstagiario && styles.chipActive]}
            onPress={() => setFiltroEstagiario(null)}
          >
            <Text style={[styles.chipText, !filtroEstagiario && styles.chipTextActive]}>Todos Est.</Text>
          </TouchableOpacity>
          {estagiarios?.map((e: any) => (
            <TouchableOpacity
              key={e.id}
              style={[styles.chip, filtroEstagiario === e.id && styles.chipActive]}
              onPress={() => setFiltroEstagiario(e.id)}
            >
              <Text style={[styles.chipText, filtroEstagiario === e.id && styles.chipTextActive]}>
                {e.nome.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Contador */}
      <View style={styles.counterBar}>
        <Text style={styles.counterText}>
          {sessoes?.length || 0} sessão(ões) encontrada(s)
        </Text>
      </View>

      {/* Lista */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Carregando sessões...</Text>
        </View>
      ) : (
        <FlatList
          data={sessoes || []}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderSessao}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="ribbon-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Nenhuma sessão encontrada</Text>
              <Text style={styles.emptyText}>Ajuste os filtros para ver mais resultados.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  filtersContainer: { backgroundColor: '#FFF', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  chipsRow: { paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFF' },
  chipDivider: { width: 1, height: 24, backgroundColor: '#E2E8F0', marginHorizontal: 8, alignSelf: 'center' },
  counterBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F8FAFC' },
  counterText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  listContainer: { padding: 16, paddingBottom: 40 },
  sessaoCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...shadows.card,
  },
  sessaoCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  sessaoHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sessaoInfo: { flex: 1 },
  sessaoDate: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  sessaoEstagiario: { fontSize: 12, color: '#475569', marginBottom: 2 },
  sessaoPaciente: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  sessaoSala: { fontSize: 11, color: '#94A3B8' },
  sessaoRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  badgeGreen: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  badgeOrange: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  statusText: { fontSize: 10, fontWeight: '700' },
  textGreen: { color: '#059669' },
  textOrange: { color: '#D97706' },
  sessaoStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  notasBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  notasLabel: { fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 4 },
  notasText: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  feedbackExistente: { marginTop: 10, backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: colors.primary },
  feedbackExistenteLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  feedbackExistenteText: { fontSize: 12, color: '#1E293B', fontStyle: 'italic' },
  feedbackForm: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  feedbackFormLabel: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  feedbackInput: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#1E293B', minHeight: 100, lineHeight: 20,
  },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 10, height: 42, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
  emptyText: { fontSize: 13, color: '#64748B' },
});
