import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, shadows } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const DIAS_NOMES = [
  { key: 1, label: 'Segunda-feira' },
  { key: 2, label: 'Terça-feira' },
  { key: 3, label: 'Quarta-feira' },
  { key: 4, label: 'Quinta-feira' },
  { key: 5, label: 'Sexta-feira' },
  { key: 6, label: 'Sábado' }
];

const PERIODOS = [
  { label: 'Manhã (08:00 – 12:00)', key: 'MANHA' },
  { label: 'Tarde (13:00 – 18:00)', key: 'TARDE' },
  { label: 'Noite (18:00 – 22:00)', key: 'NOITE' }
];

export function GradeHorariosScreen() {
  const navigation = useNavigation<any>();

  // Estado local para simular a grade salva
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([1, 2, 3, 4, 5]);
  const [periodosSelecionados, setPeriodosSelecionados] = useState<string[]>(['MANHA', 'TARDE']);

  const toggleDia = (key: number) => {
    if (diasSelecionados.includes(key)) {
      setDiasSelecionados(diasSelecionados.filter(d => d !== key));
    } else {
      setDiasSelecionados([...diasSelecionados, key]);
    }
  };

  const togglePeriodo = (key: string) => {
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

    Alert.alert(
      'Grade Salva!',
      'Sua disponibilidade semanal foi atualizada com sucesso no sistema clínico.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

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

        {/* ─── Botão Salvar ─────────────────────────────── */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.9}>
          <Ionicons name="save-outline" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>Salvar Configuração</Text>
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
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  }
});
