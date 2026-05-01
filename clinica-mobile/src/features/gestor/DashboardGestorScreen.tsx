import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  ActivityIndicator, TouchableOpacity, Modal, TextInput,
  Alert, Dimensions
} from 'react-native';
import { colors } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useAuthStore } from '../../store/useAuthStore';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 56; // margem 28 de cada lado

const CHART_CONFIG = {
  backgroundGradientFrom: '#FFF',
  backgroundGradientTo: '#FFF',
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: () => '#64748B',
  barPercentage: 0.55,
  fillShadowGradientOpacity: 0.9,
  decimalPlaces: 0,
  propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary }
};

export function DashboardGestorScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [promoverModal, setPromoverModal] = useState(false);
  const [usuarioIdSelecionado, setUsuarioIdSelecionado] = useState<number | null>(null);
  const [matricula, setMatricula] = useState('');
  const [cargaHoraria, setCargaHoraria] = useState('20');
  const [dataInicio, setDataInicio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [chartTab, setChartTab] = useState<'semana' | 'estagiarios'>('semana');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-metricas'],
    queryFn: async () => (await api.get('/dashboard/metricas')).data
  });

  const { data: pendentes } = useQuery({
    queryKey: ['usuarios-pendentes-gestor'],
    queryFn: async () => (await api.get('/pacientes/pendentes')).data
  });

  const handlePromover = async () => {
    if (!usuarioIdSelecionado || !matricula || !dataInicio) {
      return Alert.alert('Atenção', 'Preencha a matrícula e a data de início.');
    }
    setIsSaving(true);
    try {
      await api.patch(`/pacientes/promover-estagiario/${usuarioIdSelecionado}`, {
        matricula, cargaHorariaSemanal: cargaHoraria, dataInicio
      });
      queryClient.invalidateQueries({ queryKey: ['usuarios-pendentes-gestor'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metricas'] });
      setPromoverModal(false);
      setMatricula(''); setDataInicio(''); setUsuarioIdSelecionado(null);
      Alert.alert('✅ Promovido!', 'O usuário agora é um Estagiário da clínica.');
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Erro ao promover.');
    } finally {
      setIsSaving(false);
    }
  };

  const metricas = data?.metricas;
  const sessoesHoje = data?.sessoesHoje || [];
  const ranking = data?.rankingEstagiarios || [];
  const sessoesPorSemana = data?.sessoesPorSemana || [];
  const sessoesPorDia = data?.sessoesPorDia || [];

  // Preparar dados para o LineChart (evolução semanal)
  const lineData = {
    labels: sessoesPorSemana.map((s: any) => s.semana),
    datasets: [
      {
        data: sessoesPorSemana.map((s: any) => s.total || 0),
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 2
      },
      {
        data: sessoesPorSemana.map((s: any) => s.concluidas || 0),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 2
      }
    ],
    legend: ['Total', 'Concluídas']
  };

  // Preparar dados para BarChart (por estagiário)
  const hasRanking = ranking.length > 0;
  const barData = {
    labels: ranking.map((e: any) => e.nome),
    datasets: [{ data: ranking.map((e: any) => e.totalSessoes || 0) }]
  };

  // Card de métrica
  const MetricCard = ({ icon, label, value, color, sub }: { icon: any; label: string; value: any; color: string; sub?: string }) => (
    <View style={[styles.metricCard, { borderTopColor: color }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {sub && <Text style={styles.metricSub}>{sub}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ─── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSub}>
            {user?.perfil === 'ROOT' ? '👑 Administrador Root' : '📊 Visão Gerencial'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* ─── Alerta de Pendentes ───────────────────── */}
          {pendentes?.length > 0 && (
            <TouchableOpacity
              style={styles.alertBanner}
              onPress={() =>
                Alert.alert('Contas Pendentes', 'Selecione para promover a Estagiário:', [
                  ...pendentes.map((p: any) => ({
                    text: `🎓 Promover ${p.nome.split(' ')[0]}`,
                    onPress: () => { setUsuarioIdSelecionado(p.id); setPromoverModal(true); }
                  })),
                  { text: 'Fechar', style: 'cancel' }
                ])
              }
            >
              <View style={styles.alertDot} />
              <Text style={styles.alertText}>{pendentes.length} conta(s) aguardando aprovação</Text>
              <Ionicons name="chevron-forward" size={16} color="#EA580C" />
            </TouchableOpacity>
          )}

          {/* ─── Grid de Métricas ──────────────────────── */}
          <Text style={styles.sectionTitle}>Resumo da Semana</Text>
          <View style={styles.metricsGrid}>
            <MetricCard icon="people" label="Pacientes" value={metricas?.totalPacientes ?? '—'} color="#6366F1" />
            <MetricCard icon="school" label="Estagiários" value={metricas?.totalEstagiarios ?? '—'} color="#10B981" />
            <MetricCard icon="business" label="Salas" value={metricas?.totalSalas ?? '—'} color={colors.primary} />
          </View>
          <View style={styles.metricsGrid}>
            <MetricCard icon="time" label="Sessões" value={metricas?.sessoesNaSemana ?? '—'} color="#F59E0B" sub="na semana" />
            <MetricCard icon="close-circle" label="Faltas" value={metricas?.faltasNaSemana ?? '—'} color="#EF4444" sub="na semana" />
            <MetricCard icon="trending-up" label="Presença" value={`${metricas?.taxaPresenca ?? '—'}%`} color="#10B981" sub="da semana" />
          </View>

          {/* ─── Gráficos ─────────────────────────────── */}
          <Text style={styles.sectionTitle}>Análise Visual</Text>

          {/* Tabs de gráfico */}
          <View style={styles.chartTabs}>
            <TouchableOpacity
              style={[styles.chartTab, chartTab === 'semana' && styles.chartTabActive]}
              onPress={() => setChartTab('semana')}
            >
              <Ionicons name="trending-up" size={14} color={chartTab === 'semana' ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.chartTabText, chartTab === 'semana' && styles.chartTabTextActive]}>Evolução Semanal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartTab, chartTab === 'estagiarios' && styles.chartTabActive]}
              onPress={() => setChartTab('estagiarios')}
            >
              <Ionicons name="bar-chart" size={14} color={chartTab === 'estagiarios' ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.chartTabText, chartTab === 'estagiarios' && styles.chartTabTextActive]}>Por Estagiário</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chartCard}>
            {chartTab === 'semana' ? (
              <>
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.legendLabel}>Total</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.legendLabel}>Concluídas</Text>
                  </View>
                </View>
                {sessoesPorSemana.length > 0 && lineData.datasets[0].data.some((v: number) => v > 0) ? (
                  <LineChart
                    data={lineData}
                    width={CHART_W}
                    height={200}
                    chartConfig={CHART_CONFIG}
                    bezier
                    withInnerLines={false}
                    withOuterLines={false}
                    style={{ borderRadius: 14, marginLeft: -8 }}
                  />
                ) : (
                  <View style={styles.chartEmpty}>
                    <Ionicons name="bar-chart-outline" size={40} color="#CBD5E1" />
                    <Text style={styles.chartEmptyText}>Nenhuma sessão nas últimas 6 semanas</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {hasRanking && ranking.some((e: any) => e.totalSessoes > 0) ? (
                  <BarChart
                    data={barData}
                    width={CHART_W}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      ...CHART_CONFIG,
                      color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`
                    }}
                    style={{ borderRadius: 14, marginLeft: -8 }}
                    showValuesOnTopOfBars
                    withInnerLines={false}
                  />
                ) : (
                  <View style={styles.chartEmpty}>
                    <Ionicons name="people-outline" size={40} color="#CBD5E1" />
                    <Text style={styles.chartEmptyText}>Nenhum dado de estagiários disponível</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* ─── Sessões de Hoje ────────────────────────── */}
          <Text style={styles.sectionTitle}>Sessões de Hoje</Text>
          {sessoesHoje.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={44} color="#CBD5E1" />
              <Text style={styles.emptyText}>Nenhuma sessão hoje</Text>
            </View>
          ) : (
            sessoesHoje.map((s: any) => {
              const cfg = s.status === 'CONCLUIDA'
                ? { cor: '#10B981', bg: '#DCFCE7' }
                : s.status === 'FALTA'
                ? { cor: '#EF4444', bg: '#FEE2E2' }
                : { cor: colors.primary, bg: '#EFF6FF' };
              return (
                <View key={s.id} style={styles.sessaoCard}>
                  <View style={styles.sessaoHorario}>
                    <Text style={styles.sessaoHorarioText}>{s.horario}</Text>
                  </View>
                  <View style={styles.sessaoInfo}>
                    <Text style={styles.sessaoEstagiario}>{s.estagiario}</Text>
                    <Text style={styles.sessaoSala}>{s.sala} · {s.pacientes.join(', ')}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusText, { color: cfg.cor }]}>{s.status}</Text>
                  </View>
                </View>
              );
            })
          )}

          {/* ─── Ranking de Estagiários ─────────────────── */}
          <Text style={styles.sectionTitle}>Ranking de Estagiários</Text>
          {ranking.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhum estagiário com sessões ainda</Text>
            </View>
          ) : (
            ranking.map((e: any, i: number) => {
              const medalhas = ['🥇', '🥈', '🥉'];
              const taxaPresenca = e.totalSessoes > 0 ? Math.round((e.concluidas / e.totalSessoes) * 100) : 0;
              return (
                <View key={i} style={styles.rankingCard}>
                  <Text style={styles.medalha}>{medalhas[i] || `${i + 1}º`}</Text>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankNome}>{e.nome}</Text>
                    <View style={styles.rankStats}>
                      <Text style={styles.rankStat}>{e.totalSessoes} sessões</Text>
                      <Text style={[styles.rankStat, { color: '#10B981' }]}>✓ {e.concluidas}</Text>
                      <Text style={[styles.rankStat, { color: '#EF4444' }]}>✗ {e.faltas}</Text>
                    </View>
                  </View>
                  {/* Barra de presença */}
                  <View style={styles.presencaBar}>
                    <View style={[styles.presencaFill, { width: `${taxaPresenca}%` as any }]} />
                    <Text style={styles.presencaText}>{taxaPresenca}%</Text>
                  </View>
                </View>
              );
            })
          )}

        </ScrollView>
      )}

      {/* ─── Modal Promover ────────────────────────────── */}
      <Modal visible={promoverModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎓 Promover para Estagiário</Text>
              <TouchableOpacity onPress={() => setPromoverModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Matrícula *</Text>
            <TextInput style={styles.input} placeholder="Ex: MAT2024001" value={matricula} onChangeText={setMatricula} />
            <Text style={styles.inputLabel}>Carga Horária Semanal (horas) *</Text>
            <TextInput style={styles.input} placeholder="20" keyboardType="numeric" value={cargaHoraria} onChangeText={setCargaHoraria} />
            <Text style={styles.inputLabel}>Data de Início * (AAAA-MM-DD)</Text>
            <TextInput style={styles.input} placeholder="2024-03-01" value={dataInicio} onChangeText={setDataInicio} />
            <TouchableOpacity style={styles.submitBtn} onPress={handlePromover} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Confirmar Promoção</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F5F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EAEEF3' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.primaryDark },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  refreshBtn: { width: 40, height: 40, backgroundColor: '#EFF6FF', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, paddingBottom: 100 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14, gap: 10, marginBottom: 20, borderWidth: 1, borderColor: '#FED7AA' },
  alertDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EA580C' },
  alertText: { flex: 1, color: '#EA580C', fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.primaryDark, marginBottom: 12, marginTop: 6 },
  metricsGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  metricCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 14, alignItems: 'center', elevation: 2, borderTopWidth: 3 },
  metricIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  metricValue: { fontSize: 22, fontWeight: '800', color: colors.textHeader },
  metricLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  metricSub: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  chartTabs: { flexDirection: 'row', backgroundColor: '#EAEEF3', borderRadius: 14, padding: 3, marginBottom: 12 },
  chartTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 11, gap: 6 },
  chartTabActive: { backgroundColor: colors.primary },
  chartTabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chartTabTextActive: { color: '#FFF' },
  chartCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 20, elevation: 2 },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  chartEmpty: { alignItems: 'center', paddingVertical: 32 },
  chartEmptyText: { color: colors.textSecondary, marginTop: 8, fontSize: 13 },
  emptyBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 20 },
  emptyText: { color: colors.textSecondary, marginTop: 8, fontSize: 14 },
  sessaoCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, elevation: 1, gap: 10 },
  sessaoHorario: { backgroundColor: '#EFF6FF', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', minWidth: 56 },
  sessaoHorarioText: { fontSize: 14, fontWeight: '800', color: colors.primary },
  sessaoInfo: { flex: 1 },
  sessaoEstagiario: { fontSize: 14, fontWeight: '700', color: colors.textHeader },
  sessaoSala: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  rankingCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  medalha: { fontSize: 24 },
  rankInfo: { flex: 1 },
  rankNome: { fontSize: 15, fontWeight: '700', color: colors.textHeader },
  rankStats: { flexDirection: 'row', gap: 10, marginTop: 3 },
  rankStat: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  presencaBar: { width: 56, height: 40, justifyContent: 'center', alignItems: 'center' },
  presencaFill: { position: 'absolute', left: 0, top: 0, height: '100%', backgroundColor: '#DCFCE7', borderRadius: 8 },
  presencaText: { fontSize: 12, fontWeight: '800', color: '#10B981', zIndex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textHeader },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EAEEF3', borderRadius: 12, padding: 14, fontSize: 16, color: colors.textHeader },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 24 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
