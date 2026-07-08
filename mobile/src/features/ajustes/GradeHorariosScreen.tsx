import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing, shadows } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient';

const DIAS_NOMES = [
  { key: 1, label: 'Segunda-feira' },
  { key: 2, label: 'Terça-feira' },
  { key: 3, label: 'Quarta-feira' },
  { key: 4, label: 'Quinta-feira' },
  { key: 5, label: 'Sexta-feira' },
  { key: 6, label: 'Sábado' }
];

const PERIODOS = [
  { label: 'Manhã (08:00 – 12:00)', key: 'MANHA', horaInicio: '08:00', horaFim: '12:00' },
  { label: 'Tarde (13:00 – 18:00)', key: 'TARDE', horaInicio: '13:00', horaFim: '18:00' },
  { label: 'Noite (18:00 – 22:00)', key: 'NOITE', horaInicio: '18:00', horaFim: '22:00' }
];

// Converte dados da API para estado da UI
const apiToState = (disponibilidades: any[]): { dias: number[]; periodos: string[] } => {
  const dias = [...new Set(disponibilidades.map(d => d.diaSemana))];
  const periodos: string[] = [];

  // Detectar períodos a partir dos horários
  const horasSet = disponibilidades.map(d => `${d.horaInicio}-${d.horaFim}`);
  if (horasSet.some(h => h === '08:00-12:00')) periodos.push('MANHA');
  if (horasSet.some(h => h === '13:00-18:00')) periodos.push('TARDE');
  if (horasSet.some(h => h === '18:00-22:00')) periodos.push('NOITE');

  return { dias, periodos };
};

// Converte estado da UI para payload da API
const stateToApi = (dias: number[], periodos: string[]): any[] => {
  const disponibilidades: any[] = [];
  for (const dia of dias) {
    for (const periodoKey of periodos) {
      const periodo = PERIODOS.find(p => p.key === periodoKey);
      if (periodo) {
        disponibilidades.push({
          diaSemana: dia,
          horaInicio: periodo.horaInicio,
          horaFim: periodo.horaFim
        });
      }
    }
  }
  return disponibilidades;
};

export function GradeHorariosScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const [periodosSelecionados, setPeriodosSelecionados] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Buscar grade atual da API
  const { data: gradeAtual, isLoading, isError, refetch } = useQuery({
    queryKey: ['minha-grade-horarios'],
    queryFn: async () => {
      const { data } = await api.get('/me/grade-horarios');
      return data;
    }
  });

  // Inicializar estado a partir dos dados da API
  useEffect(() => {
    if (gradeAtual && Array.isArray(gradeAtual)) {
      const { dias, periodos } = apiToState(gradeAtual);
      setDiasSelecionados(dias);
      setPeriodosSelecionados(periodos);
      setHasChanges(false);
    }
  }, [gradeAtual]);

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: async (payload: any[]) => {
      const { data } = await api.put('/me/grade-horarios', { disponibilidades: payload });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minha-grade-horarios'] });
      setHasChanges(false);
      Alert.alert(
        'Grade Salva!',
        'Sua disponibilidade semanal foi atualizada com sucesso.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error || 'Erro ao salvar grade de horários.';
      Alert.alert('Erro', msg);
    }
  });

  const toggleDia = (key: number) => {
    setHasChanges(true);
    if (diasSelecionados.includes(key)) {
      setDiasSelecionados(diasSelecionados.filter(d => d !== key));
    } else {
      setDiasSelecionados([...diasSelecionados, key]);
    }
  };

  const togglePeriodo = (key: string) => {
    setHasChanges(true);
    if (periodosSelecionados.includes(key)) {
      setPeriodosSelecionados(periodosSelecionados.filter(p => p !== key));
    } else {
      setPeriodosSelecionados([...periodosSelecionados, key]);
    }
  };

  const handleSave = () => {
    if (diasSelecionados.length === 0) {
      return Alert.alert('Erro', 'Selecione ao menos um dia de atendimento.');
    }
    if (periodosSelecionados.length === 0) {
      return Alert.alert('Erro', 'Selecione ao menos um período de disponibilidade.');
    }

    const payload = stateToApi(diasSelecionados, periodosSelecionados);
    saveMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Minha Grade de Horários</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Carregando grade...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Minha Grade de Horários</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loaderContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={[styles.loaderText, { color: '#EF4444' }]}>Erro ao carregar grade.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ─── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minha Grade de Horários</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Defina quais dias da semana e períodos você estará disponível para realizar atendimentos clínicos.
        </Text>

        {/* ─── Card de Dias da Semana ──────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Dias Disponíveis</Text>
          <Text style={styles.cardHint}>Selecione os dias em que poderá atender:</Text>

          <View style={styles.daysList}>
            {DIAS_NOMES.map(dia => {
              const ativo = diasSelecionados.includes(dia.key);
              return (
                <TouchableOpacity
                  key={dia.key}
                  style={[styles.dayRow, ativo && styles.dayRowActive]}
                  onPress={() => toggleDia(dia.key)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dayLeft}>
                    <Ionicons 
                      name={ativo ? "checkbox" : "square-outline"} 
                      size={20} 
                      color={ativo ? colors.primary : '#94A3B8'} 
                    />
                    <Text style={[styles.dayLabel, ativo && styles.dayLabelActive]}>
                      {dia.label}
                    </Text>
                  </View>
                  {ativo && (
                    <View style={styles.activeDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Card de Período de Atendimento ────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏱️ Períodos Disponíveis</Text>
          <Text style={styles.cardHint}>Defina os turnos de preferência:</Text>

          <View style={styles.periodList}>
            {PERIODOS.map(periodo => {
              const ativo = periodosSelecionados.includes(periodo.key);
              return (
                <TouchableOpacity
                  key={periodo.key}
                  style={[styles.periodCard, ativo && styles.periodCardActive]}
                  onPress={() => togglePeriodo(periodo.key)}
                  activeOpacity={0.85}
                >
                  <View style={styles.periodLeft}>
                    <Ionicons 
                      name={ativo ? "time" : "time-outline"} 
                      size={20} 
                      color={ativo ? '#FFF' : '#64748B'} 
                    />
                    <Text style={[styles.periodLabel, ativo && styles.periodLabelActive]}>
                      {periodo.label}
                    </Text>
                  </View>
                  <Ionicons 
                    name={ativo ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={ativo ? '#FFF' : '#CBD5E1'} 
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Resumo ─────────────────────────────── */}
        {diasSelecionados.length > 0 && periodosSelecionados.length > 0 && (
          <View style={styles.resumeCard}>
            <Text style={styles.resumeTitle}>📊 Resumo da Grade</Text>
            <Text style={styles.resumeText}>
              {diasSelecionados.length} dia(s) × {periodosSelecionados.length} período(s) = {diasSelecionados.length * periodosSelecionados.length} bloco(s) de disponibilidade
            </Text>
          </View>
        )}

        {/* ─── Botão Salvar ─────────────────────────────── */}
        <TouchableOpacity 
          style={[styles.saveBtn, (!hasChanges || saveMutation.isPending) && styles.saveBtnDisabled]} 
          onPress={handleSave} 
          activeOpacity={0.9}
          disabled={!hasChanges || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="save-outline" size={20} color="#FFF" />
          )}
          <Text style={styles.saveBtnText}>
            {saveMutation.isPending ? 'Salvando...' : hasChanges ? 'Salvar Configuração' : 'Sem alterações'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: '#64748B',
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
  },
  daysList: {
    gap: 10,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  dayRowActive: {
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
  },
  dayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  dayLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  periodList: {
    gap: 12,
  },
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  periodCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  periodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  periodLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  periodLabelActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  resumeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  resumeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  resumeText: {
    fontSize: 13,
    color: '#1E40AF',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    ...shadows.btn,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  }
});
