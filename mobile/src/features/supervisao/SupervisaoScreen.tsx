import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { colors, spacing, shadows } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';

export function SupervisaoScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const { data: sessoes, isLoading, refetch } = useQuery({
    queryKey: ['meus-agendamentos'],
    queryFn: async () => (await api.get('/meus-agendamentos')).data
  });

  // Filtrar sessões que possuem feedback do supervisor
  const sessoesComFeedback = sessoes?.filter((s: any) => s.supervisorNota && s.supervisorNota.trim() !== '') || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ─── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedbacks da Supervisão</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Carregando avaliações...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionSubtitle}>
            {user?.perfil === 'ESTAGIARIO' 
              ? 'Acompanhe as orientações clínicas e correções registradas pelos seus supervisores.' 
              : 'Lista de feedbacks de sessões registradas na clínica.'}
          </Text>

          {sessoesComFeedback.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="ribbon-outline" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Nenhum feedback ainda</Text>
              <Text style={styles.emptyText}>
                {user?.perfil === 'ESTAGIARIO'
                  ? 'Os feedbacks de seus supervisores aparecerão aqui assim que forem registrados nas suas sessões.'
                  : 'Os feedbacks registrados por supervisores nas sessões aparecerão aqui.'}
              </Text>
            </View>
          ) : (
            sessoesComFeedback.map((s: any) => {
              const dataFormatada = s.data || new Date(s.dataSessao).toLocaleDateString('pt-BR');
              const pacienteNome = s.agendamento?.pacientes?.map((p: any) => p.paciente.nome).join(', ') || 'Paciente';
              
              return (
                <View key={s.id} style={styles.feedbackCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.patientInfo}>
                      <Text style={styles.patientName}>{pacienteNome}</Text>
                      <Text style={styles.sessionDate}>📅 {dataFormatada} às {s.horarioInicio || s.horario}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>Avaliado</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.feedbackContent}>
                    <View style={styles.feedbackTitleRow}>
                      <Ionicons name="ribbon" size={16} color={colors.primary} />
                      <Text style={styles.feedbackTitle}>Nota / Orientação Clínica</Text>
                    </View>
                    <Text style={styles.feedbackText}>"{s.supervisorNota}"</Text>
                  </View>

                  {s.notas && (
                    <View style={styles.internNotes}>
                      <Text style={styles.internNotesTitle}>Sua Evolução Clínica:</Text>
                      <Text style={styles.internNotesText} numberOfLines={2}>{s.notas}</Text>
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.detailsBtn}
                    onPress={() => navigation.navigate('Agenda', {
                      screen: 'SessaoDetails',
                      params: { sessao: s }
                    })}
                  >
                    <Text style={styles.detailsBtnText}>Ver detalhes da sessão</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  refreshButton: {
    padding: 4,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
    ...shadows.card,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  feedbackCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  feedbackContent: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  feedbackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  feedbackText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  internNotes: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  internNotesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  internNotesText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  }
});
