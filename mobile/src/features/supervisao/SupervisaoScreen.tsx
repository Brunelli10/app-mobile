import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { colors, shadows } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';

const TABS = [
  { key: 'TODOS', label: 'Todos', icon: 'list-outline' },
  { key: 'PENDENTES', label: 'Pendentes', icon: 'time-outline' },
  { key: 'REVISADAS', label: 'Revisadas', icon: 'checkmark-circle-outline' },
  { key: 'COM_ORIENTACAO', label: 'Com Orientação', icon: 'ribbon-outline' },
];

export function SupervisaoScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('TODOS');

  const { data: sessoes, isLoading, refetch } = useQuery({
    queryKey: ['meus-agendamentos'],
    queryFn: async () => (await api.get('/meus-agendamentos')).data
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // Filtrar sessões por aba
  const filteredSessoes = (sessoes || []).filter((s: any) => {
    switch (activeTab) {
      case 'PENDENTES':
        return !s.supervisorNota || s.supervisorNota.trim() === '';
      case 'REVISADAS':
        return s.supervisorNota && s.supervisorNota.trim() !== '';
      case 'COM_ORIENTACAO':
        return s.supervisorNota && s.supervisorNota.trim().length > 20;
      default:
        return true;
    }
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const renderSessao = ({ item }: { item: any }) => {
    const dataFormatada = item.data || formatDate(item.dataSessao);
    const pacienteNome = item.agendamento?.pacientes?.map((p: any) => p.paciente.nome).join(', ') || item.pacientes?.map((p: any) => p.nome).join(', ') || 'Paciente';
    const temFeedback = item.supervisorNota && item.supervisorNota.trim() !== '';

    return (
      <View style={styles.card}>
        {/* Header do card */}
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardDate}>📅 {dataFormatada} às {item.horarioInicio || item.horario}</Text>
            <Text style={styles.cardPaciente}>{pacienteNome}</Text>
            {item.agendamento?.sala?.nome && (
              <Text style={styles.cardSala}>🏠 {item.agendamento.sala.nome}</Text>
            )}
          </View>
          <View style={[styles.badge, temFeedback ? styles.badgeGreen : styles.badgeGray]}>
            <Ionicons 
              name={temFeedback ? "checkmark-circle" : "time-outline"} 
              size={12} 
              color={temFeedback ? '#059669' : '#94A3B8'} 
            />
            <Text style={[styles.badgeText, temFeedback ? styles.badgeTextGreen : styles.badgeTextGray]}>
              {temFeedback ? 'Revisada' : 'Pendente'}
            </Text>
          </View>
        </View>

        {/* Notas do estagiário (sua evolução) */}
        {item.notas && (
          <View style={styles.notasSection}>
            <Text style={styles.notasLabel}>📝 Sua evolução clínica:</Text>
            <Text style={styles.notasContent} numberOfLines={3}>{item.notas}</Text>
          </View>
        )}

        {/* Feedback do supervisor */}
        {temFeedback && (
          <View style={styles.feedbackSection}>
            <View style={styles.feedbackTitleRow}>
              <Ionicons name="ribbon" size={14} color={colors.primary} />
              <Text style={styles.feedbackTitle}>Orientação do Supervisor</Text>
            </View>
            <Text style={styles.feedbackContent}>"{item.supervisorNota}"</Text>
          </View>
        )}

        {/* Botão ver detalhes */}
        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => navigation.navigate('Agenda', {
            screen: 'SessaoDetails',
            params: { sessao: item }
          })}
        >
          <Text style={styles.detailsBtnText}>Ver sessão completa</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedbacks da Supervisão</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Descrição */}
      <View style={styles.descBox}>
        <Text style={styles.descText}>
          Acompanhe as orientações clínicas e correções registradas pelos seus supervisores.
        </Text>
      </View>

      {/* Abas/Chips */}
      <View style={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={14} 
              color={activeTab === tab.key ? '#FFF' : '#64748B'} 
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contador */}
      <View style={styles.counterBar}>
        <Text style={styles.counterText}>
          {filteredSessoes.length} sessão(ões)
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
          data={filteredSessoes}
          keyExtractor={(item: any) => item.id?.toString() || Math.random().toString()}
          renderItem={renderSessao}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="ribbon-outline" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'TODOS' ? 'Nenhuma sessão encontrada' :
                 activeTab === 'PENDENTES' ? 'Todas as sessões foram revisadas!' :
                 activeTab === 'REVISADAS' ? 'Nenhum feedback recebido ainda' :
                 'Nenhuma orientação detalhada'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'PENDENTES' 
                  ? 'Parabéns! Seu supervisor já revisou todas as sessões.' 
                  : 'Os feedbacks aparecerão aqui conforme forem registrados.'}
              </Text>
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
  descBox: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  descText: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  tabsContainer: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 6, flexWrap: 'wrap',
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFF' },
  counterBar: { paddingHorizontal: 16, paddingVertical: 6 },
  counterText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  listContainer: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardInfo: { flex: 1 },
  cardDate: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  cardPaciente: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 2 },
  cardSala: { fontSize: 11, color: '#94A3B8' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start',
  },
  badgeGreen: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  badgeGray: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextGreen: { color: '#059669' },
  badgeTextGray: { color: '#94A3B8' },
  notasSection: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginBottom: 8 },
  notasLabel: { fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 4 },
  notasContent: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  feedbackSection: {
    backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  feedbackTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  feedbackTitle: { fontSize: 12, fontWeight: '700', color: colors.primary },
  feedbackContent: { fontSize: 13, color: '#1E293B', lineHeight: 20, fontStyle: 'italic' },
  detailsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  detailsBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  emptyBox: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', marginTop: 20, ...shadows.card,
  },
  emptyIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
});
