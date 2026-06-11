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
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useAuthStore } from '../../store/useAuthStore';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 48;

const MONTHS_LIST = [
  { val: 1, label: 'Jan' },
  { val: 2, label: 'Fev' },
  { val: 3, label: 'Mar' },
  { val: 4, label: 'Abr' },
  { val: 5, label: 'Mai' },
  { val: 6, label: 'Jun' },
  { val: 7, label: 'Jul' },
  { val: 8, label: 'Ago' },
  { val: 9, label: 'Set' },
  { val: 10, label: 'Out' },
  { val: 11, label: 'Nov' },
  { val: 12, label: 'Dez' }
];

const WEEKS_LIST = [
  { val: 1, label: 'Sem 1' },
  { val: 2, label: 'Sem 2' },
  { val: 3, label: 'Sem 3' },
  { val: 4, label: 'Sem 4' },
  { val: 5, label: 'Sem 5' }
];

const YEARS_LIST = [2024, 2025, 2026, 2027];

export function DashboardGestorScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'operacoes' | 'analise'>('operacoes');

  // Estados Reais dos Filtros (Aplicados na Query)
  const [filterHoje, setFilterHoje] = useState(false);
  const [selectedEstagiario, setSelectedEstagiario] = useState<number | null>(null);
  const [selectedAno, setSelectedAno] = useState<number | null>(new Date().getFullYear());
  const [selectedMes, setSelectedMes] = useState<number | null>(null);
  const [selectedSemana, setSelectedSemana] = useState<number | null>(null);

  // Estados Temporários do Modal de Filtros
  const [filtroModalVisible, setFiltroModalVisible] = useState(false);
  const [tempFilterHoje, setTempFilterHoje] = useState(false);
  const [tempEstagiario, setTempEstagiario] = useState<number | null>(null);
  const [tempAno, setTempAno] = useState<number | null>(new Date().getFullYear());
  const [tempMes, setTempMes] = useState<number | null>(null);
  const [tempSemana, setTempSemana] = useState<number | null>(null);

  // Estados do Modal Promover Estagiário
  const [promoverModal, setPromoverModal] = useState(false);
  const [usuarioIdSelecionado, setUsuarioIdSelecionado] = useState<number | null>(null);
  const [matricula, setMatricula] = useState('');
  const [cargaHoraria, setCargaHoraria] = useState('20');
  const [dataInicio, setDataInicio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Query do Dashboard
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-metricas', filterHoje, selectedEstagiario, selectedAno, selectedMes, selectedSemana],
    queryFn: async () => {
      const params: any = {};
      if (filterHoje) {
        params.hoje = 'true';
      } else {
        if (selectedAno) params.ano = selectedAno;
        if (selectedMes) params.mes = selectedMes;
        if (selectedSemana) params.semana = selectedSemana;
      }
      if (selectedEstagiario) {
        params.estagiarioId = selectedEstagiario;
      }
      return (await api.get('/dashboard/metricas', { params })).data;
    }
  });

  // Query de Contas Pendentes de Aprovação
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

  const openFiltros = () => {
    setTempFilterHoje(filterHoje);
    setTempEstagiario(selectedEstagiario);
    setTempAno(selectedAno);
    setTempMes(selectedMes);
    setTempSemana(selectedSemana);
    setFiltroModalVisible(true);
  };

  const aplicarFiltros = () => {
    setFilterHoje(tempFilterHoje);
    setSelectedEstagiario(tempEstagiario);
    setSelectedAno(tempAno);
    setSelectedMes(tempMes);
    setSelectedSemana(tempSemana);
    setFiltroModalVisible(false);
  };

  const metricasOperacionais = data?.metricas;
  const sessoesHoje = data?.sessoesHoje || [];
  const metricasAnalise = data?.metricasAnalise || { total: 0, concluidas: 0, faltas: 0, canceladas: 0, pendentes: 0, taxaPresenca: 100 };
  const ranking = data?.rankingEstagiarios || [];
  const chartData = data?.chartData || [];
  const estagiariosDropdown = data?.estagiarios || [];

  // Configuração de dados do Donut (PieChart)
  const totalSessoes = metricasAnalise.total;
  const pieData = totalSessoes > 0 ? [
    { value: metricasAnalise.concluidas || 0, color: '#10B981' },
    { value: metricasAnalise.pendentes || 0, color: '#3B82F6' },
    { value: metricasAnalise.faltas || 0, color: '#EF4444' },
    { value: metricasAnalise.canceladas || 0, color: '#94A3B8' }
  ] : [
    { value: 1, color: '#E2E8F0' } // Placeholder cinza se não houver dados
  ];

  // Configuração do Gráfico de Barras Moderno (BarChart)
  const hasChartData = chartData.length > 0 && chartData.some((c: any) => c.total > 0);
  const barData = chartData.map((c: any) => ({
    value: c.total || 0,
    label: c.label,
    frontColor: '#2563EB',
    gradientColor: '#60A5FA',
    topLabelComponent: () => (
      <Text style={{ color: '#475569', fontSize: 10, fontWeight: '800', marginBottom: 2 }}>
        {c.total}
      </Text>
    )
  }));

  const getFiltrosLabel = () => {
    if (filterHoje) return 'Dia de Hoje';
    
    let label = '';
    if (selectedAno) {
      label += `${selectedAno}`;
    } else {
      label += 'Todos os Anos';
    }
    
    if (selectedMes) {
      const mesObj = MONTHS_LIST.find(m => m.val === selectedMes);
      label += ` · ${mesObj ? mesObj.label : selectedMes}`;
    }
    
    if (selectedSemana) {
      label += ` · Sem. ${selectedSemana}`;
    }
    
    if (selectedEstagiario) {
      const est = estagiariosDropdown.find((e: any) => e.id === selectedEstagiario);
      label += ` · ${est ? est.nome.split(' ')[0] : 'Estagiário'}`;
    } else {
      label += ` · Todos Estagiários`;
    }
    
    return label;
  };

  const getInitials = (name: string) => {
    const splitted = name.split(' ');
    if (splitted.length >= 2) {
      return (splitted[0][0] + splitted[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Componente de Grade de Legendas 2x2
  const LegendGrid = () => {
    const { total, concluidas, faltas, canceladas, pendentes } = metricasAnalise;
    const getPct = (val: number) => {
      return total > 0 ? Math.round((val / total) * 100) : 0;
    };

    return (
      <View style={styles.legendGrid}>
        <View style={styles.legendGridRow}>
          <View style={styles.legendGridItem}>
            <View style={[styles.legendBullet, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>
              <Text style={styles.legendValue}>{concluidas}</Text>
              {` Concluídas (${getPct(concluidas)}%)`}
            </Text>
          </View>
          <View style={styles.legendGridItem}>
            <View style={[styles.legendBullet, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>
              <Text style={styles.legendValue}>{pendentes}</Text>
              {` Em Andamento (${getPct(pendentes)}%)`}
            </Text>
          </View>
        </View>
        <View style={styles.legendGridRow}>
          <View style={styles.legendGridItem}>
            <View style={[styles.legendBullet, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>
              <Text style={styles.legendValue}>{faltas}</Text>
              {` Faltas (${getPct(faltas)}%)`}
            </Text>
          </View>
          <View style={styles.legendGridItem}>
            <View style={[styles.legendBullet, { backgroundColor: '#94A3B8' }]} />
            <Text style={styles.legendText}>
              <Text style={styles.legendValue}>{canceladas}</Text>
              {` Canceladas (${getPct(canceladas)}%)`}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const MetricCard = ({ icon, label, value, color, sub }: { icon: any; label: string; value: any; color: string; sub?: string }) => (
    <View style={[styles.metricCard, { borderTopColor: color }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon} size={20} color={color} />
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

      {/* ─── Tabs Superiores ────────────────────────────── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'operacoes' && styles.tabButtonActive]}
          onPress={() => setActiveTab('operacoes')}
        >
          <Ionicons name="business" size={16} color={activeTab === 'operacoes' ? '#FFF' : '#64748B'} />
          <Text style={[styles.tabButtonText, activeTab === 'operacoes' && styles.tabButtonTextActive]}>Operações</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'analise' && styles.tabButtonActive]}
          onPress={() => setActiveTab('analise')}
        >
          <Ionicons name="analytics" size={16} color={activeTab === 'analise' ? '#FFF' : '#64748B'} />
          <Text style={[styles.tabButtonText, activeTab === 'analise' && styles.tabButtonTextActive]}>Análise de Sessões</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* ─── TAB 1: OPERAÇÕES DA CLÍNICA ────────────────── */}
          {activeTab === 'operacoes' && (
            <View>
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

              <Text style={styles.sectionTitle}>Resumo da Semana</Text>
              <View style={styles.metricsGrid}>
                <MetricCard icon="people" label="Pacientes" value={metricasOperacionais?.totalPacientes ?? '—'} color="#6366F1" />
                <MetricCard icon="school" label="Estagiários" value={metricasOperacionais?.totalEstagiarios ?? '—'} color="#10B981" />
                <MetricCard icon="business" label="Salas" value={metricasOperacionais?.totalSalas ?? '—'} color={colors.primary} />
              </View>
              <View style={[styles.metricsGrid, { marginBottom: 20 }]}>
                <MetricCard icon="calendar" label="Sessões" value={metricasOperacionais?.sessoesNaSemana ?? '—'} color="#F59E0B" sub="registradas" />
                <MetricCard icon="close-circle" label="Faltas" value={metricasOperacionais?.faltasNaSemana ?? '—'} color="#EF4444" sub="no período" />
                <MetricCard icon="trending-up" label="Presença" value={`${metricasOperacionais?.taxaPresenca ?? '—'}%`} color="#10B981" sub="média" />
              </View>

              <Text style={styles.sectionTitle}>Sessões de Hoje</Text>
              {sessoesHoje.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="calendar-outline" size={32} color="#94A3B8" />
                  <Text style={styles.emptyText}>Nenhuma sessão hoje</Text>
                </View>
              ) : (
                sessoesHoje.map((s: any) => {
                  const cfg = s.status === 'CONCLUIDA'
                    ? { cor: '#10B981', bg: '#DCFCE7', label: 'Concluída' }
                    : s.status === 'FALTA'
                    ? { cor: '#EF4444', bg: '#FEE2E2', label: 'Falta' }
                    : s.status === 'CANCELADA'
                    ? { cor: '#94A3B8', bg: '#F1F5F9', label: 'Cancelada' }
                    : { cor: '#2563EB', bg: '#EFF6FF', label: 'Agendada' };
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
                        <Text style={[styles.statusText, { color: cfg.cor }]}>{cfg.label}</Text>
                      </View>
                    </View>
                  );
                })
              )}

              <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Leaderboard de Estagiários</Text>
              {ranking.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>Sem registros no leaderboard</Text>
                </View>
              ) : (
                <View style={styles.leaderboardContainer}>
                  {ranking.map((e: any, i: number) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    const colorScale = ['#FEF08A', '#E2E8F0', '#FFEDD5'];
                    const presence = e.taxaPresenca;
                    return (
                      <View key={e.id} style={styles.leaderboardRow}>
                        <View style={styles.rankBadge}>
                          {medals[i] ? (
                            <Text style={styles.rankMedal}>{medals[i]}</Text>
                          ) : (
                            <Text style={styles.rankNumber}>{i + 1}º</Text>
                          )}
                        </View>
                        <View style={[styles.avatarCircle, { backgroundColor: i < 3 ? colorScale[i] : '#F1F5F9' }]}>
                          <Text style={[styles.avatarText, { color: i === 0 ? '#854D0E' : '#475569' }]}>
                            {getInitials(e.nome)}
                          </Text>
                        </View>
                        <View style={styles.leaderboardInfo}>
                          <Text style={styles.leaderboardName} numberOfLines={1}>{e.nome}</Text>
                          <Text style={styles.leaderboardSub}>
                            {e.totalSessoes} sessoes · <Text style={{ color: '#10B981' }}>✓{e.concluidas}</Text> · <Text style={{ color: '#EF4444' }}>✗{e.faltas}</Text>
                          </Text>
                        </View>
                        <View style={styles.leaderboardRate}>
                          <Text style={[styles.rateValue, { color: presence >= 80 ? '#10B981' : '#F59E0B' }]}>
                            {presence}%
                          </Text>
                          <Text style={styles.rateLabel}>Presença</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ─── TAB 2: ANÁLISE DE SESSÕES (TEMPORAL) ──────────── */}
          {activeTab === 'analise' && (
            <View>
              {/* Barra de Filtros Ativos e Botão Abrir */}
              <View style={styles.activeFiltersBar}>
                <View style={styles.activeFiltersTextContainer}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={styles.activeFiltersText} numberOfLines={1}>
                    {getFiltrosLabel()}
                  </Text>
                </View>
                <TouchableOpacity style={styles.openFilterBtn} onPress={openFiltros}>
                  <Ionicons name="funnel-outline" size={14} color="#FFF" />
                  <Text style={styles.openFilterBtnText}>Ajustar</Text>
                </TouchableOpacity>
              </View>

              {/* Destaques de Topo: Total e Presença */}
              <View style={styles.topCardsRow}>
                <View style={[styles.topCard, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                  <Text style={styles.topCardLabel}>Total Agendado</Text>
                  <Text style={[styles.topCardValue, { color: '#4F46E5' }]}>{metricasAnalise.total}</Text>
                  <Text style={styles.topCardSub}>sessões registradas</Text>
                </View>
                <View style={[styles.topCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <Text style={styles.topCardLabel}>Taxa de Presença</Text>
                  <Text style={[styles.topCardValue, { color: '#059669' }]}>{metricasAnalise.taxaPresenca}%</Text>
                  <Text style={styles.topCardSub}>aproveitamento médio</Text>
                </View>
              </View>

              {/* Gráfico Donut de Alta Performance Visual (react-native-gifted-charts) */}
              <Text style={styles.sectionTitle}>Distribuição dos Status de Agenda</Text>
              <View style={styles.donutCardContainer}>
                <View style={styles.donutChartWrapper}>
                  <PieChart
                    data={pieData}
                    donut
                    radius={55}
                    innerRadius={38}
                    innerCircleColor="#FFF"
                    centerLabelComponent={() => (
                      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1E293B' }}>
                          {metricasAnalise.taxaPresenca}%
                        </Text>
                        <Text style={{ fontSize: 7, color: '#94A3B8', fontWeight: '900', marginTop: 1 }}>
                          PRESENÇA
                        </Text>
                      </View>
                    )}
                  />
                </View>
                <LegendGrid />
              </View>

              {/* Gráfico de Evolução (Barras Modernas com Gradientes e Cantos Arredondados) */}
              <Text style={styles.sectionTitle}>Evolução das Sessões (Linha do Tempo)</Text>
              <View style={styles.chartCard}>
                {hasChartData ? (
                  <View style={{ paddingLeft: 10 }}>
                    <BarChart
                      data={barData}
                      barWidth={24}
                      spacing={16}
                      roundedTop
                      showGradient
                      gradientColor="#60A5FA"
                      noOfSections={4}
                      yAxisThickness={0}
                      xAxisThickness={1}
                      xAxisColor="#E2E8F0"
                      hideRules={true}
                      xAxisLabelTextStyle={{ fontSize: 10, color: '#64748B', fontWeight: '600' }}
                      yAxisTextStyle={{ fontSize: 10, color: '#64748B', fontWeight: '600' }}
                      width={CHART_W - 40}
                      height={160}
                    />
                  </View>
                ) : (
                  <View style={styles.chartEmpty}>
                    <Ionicons name="bar-chart-outline" size={36} color="#CBD5E1" />
                    <Text style={styles.chartEmptyText}>Nenhum agendamento no período selecionado</Text>
                  </View>
                )}
              </View>
            </View>
          )}

        </ScrollView>
      )}

      {/* ─── Bottom Sheet Modal de Filtros ───────────────── */}
      <Modal visible={filtroModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.filterBottomSheet}>
            <View style={styles.filterModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="funnel" size={18} color={colors.primary} />
                <Text style={styles.filterModalTitle}>Filtros de Análise</Text>
              </View>
              <TouchableOpacity onPress={() => setFiltroModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {/* Hoje Toggle */}
              <Text style={styles.filterModalSectionLabel}>Período Rápido</Text>
              <TouchableOpacity
                style={[styles.hojeToggle, tempFilterHoje && styles.hojeToggleActive]}
                onPress={() => {
                  setTempFilterHoje(!tempFilterHoje);
                  if (!tempFilterHoje) {
                    setTempMes(null);
                    setTempSemana(null);
                  }
                }}
              >
                <Ionicons name="time" size={16} color={tempFilterHoje ? '#FFF' : '#EA580C'} />
                <Text style={[styles.hojeToggleText, tempFilterHoje && styles.hojeToggleTextActive]}>
                  Somente o Dia de Hoje
                </Text>
              </TouchableOpacity>

              {/* Estagiários */}
              <Text style={styles.filterModalSectionLabel}>Estagiário</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                <TouchableOpacity
                  style={[styles.chip, tempEstagiario === null && styles.chipActive]}
                  onPress={() => setTempEstagiario(null)}
                >
                  <Text style={[styles.chipText, tempEstagiario === null && styles.chipTextActive]}>Todos</Text>
                </TouchableOpacity>
                {estagiariosDropdown.map((est: any) => (
                  <TouchableOpacity
                    key={est.id}
                    style={[styles.chip, tempEstagiario === est.id && styles.chipActive]}
                    onPress={() => setTempEstagiario(est.id)}
                  >
                    <Text style={[styles.chipText, tempEstagiario === est.id && styles.chipTextActive]}>
                      {est.nome.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Ano */}
              <Text style={styles.filterModalSectionLabel}>Ano</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                <TouchableOpacity
                  style={[styles.chip, tempAno === null && styles.chipActive, tempFilterHoje && styles.chipDisabled]}
                  disabled={tempFilterHoje}
                  onPress={() => {
                    setTempAno(null);
                    setTempMes(null);
                    setTempSemana(null);
                  }}
                >
                  <Text style={[styles.chipText, tempAno === null && styles.chipTextActive, tempFilterHoje && styles.chipTextDisabled]}>Todos</Text>
                </TouchableOpacity>
                {YEARS_LIST.map((yVal) => (
                  <TouchableOpacity
                    key={yVal}
                    style={[styles.chip, tempAno === yVal && styles.chipActive, tempFilterHoje && styles.chipDisabled]}
                    disabled={tempFilterHoje}
                    onPress={() => setTempAno(yVal)}
                  >
                    <Text style={[styles.chipText, tempAno === yVal && styles.chipTextActive, tempFilterHoje && styles.chipTextDisabled]}>{yVal}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Mês */}
              <Text style={styles.filterModalSectionLabel}>Mês</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                <TouchableOpacity
                  style={[styles.chip, tempMes === null && styles.chipActive, (tempFilterHoje || !tempAno) && styles.chipDisabled]}
                  disabled={tempFilterHoje || !tempAno}
                  onPress={() => {
                    setTempMes(null);
                    setTempSemana(null);
                  }}
                >
                  <Text style={[styles.chipText, tempMes === null && styles.chipTextActive, (tempFilterHoje || !tempAno) && styles.chipTextDisabled]}>Todos</Text>
                </TouchableOpacity>
                {MONTHS_LIST.map((m) => (
                  <TouchableOpacity
                    key={m.val}
                    style={[styles.chip, tempMes === m.val && styles.chipActive, (tempFilterHoje || !tempAno) && styles.chipDisabled]}
                    disabled={tempFilterHoje || !tempAno}
                    onPress={() => {
                      setTempMes(m.val);
                      setTempSemana(null);
                    }}
                  >
                    <Text style={[styles.chipText, tempMes === m.val && styles.chipTextActive, (tempFilterHoje || !tempAno) && styles.chipTextDisabled]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Semana */}
              <Text style={styles.filterModalSectionLabel}>Semana do Mês</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipsRow, { marginBottom: 20 }]}>
                <TouchableOpacity
                  style={[styles.chip, tempSemana === null && styles.chipActive, (tempFilterHoje || !tempMes) && styles.chipDisabled]}
                  disabled={tempFilterHoje || !tempMes}
                  onPress={() => setTempSemana(null)}
                >
                  <Text style={[styles.chipText, tempSemana === null && styles.chipTextActive, (tempFilterHoje || !tempMes) && styles.chipTextDisabled]}>Todos</Text>
                </TouchableOpacity>
                {WEEKS_LIST.map((w) => (
                  <TouchableOpacity
                    key={w.val}
                    style={[styles.chip, tempSemana === w.val && styles.chipActive, (tempFilterHoje || !tempMes) && styles.chipDisabled]}
                    disabled={tempFilterHoje || !tempMes}
                    onPress={() => setTempSemana(w.val)}
                  >
                    <Text style={[styles.chipText, tempSemana === w.val && styles.chipTextActive, (tempFilterHoje || !tempMes) && styles.chipTextDisabled]}>{w.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>

            <TouchableOpacity style={styles.applyFiltersBtn} onPress={aplicarFiltros}>
              <Text style={styles.applyFiltersText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Modal Promover Estagiário ─────────────────── */}
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
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#F1F5F9' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.primaryDark },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  refreshBtn: { width: 38, height: 38, backgroundColor: '#EFF6FF', borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  
  container: { padding: 20, paddingBottom: 100 },
  
  // Tabs
  tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', marginHorizontal: 20, marginTop: 14, borderRadius: 12, padding: 4 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabButtonActive: { backgroundColor: colors.primary, elevation: 1 },
  tabButtonText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  tabButtonTextActive: { color: '#FFF' },
  
  // Alert Banner
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14, gap: 10, marginBottom: 20, borderWidth: 1, borderColor: '#FED7AA' },
  alertDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EA580C' },
  alertText: { flex: 1, color: '#EA580C', fontSize: 13, fontWeight: '600' },
  
  // Seções
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.primaryDark, marginBottom: 12, marginTop: 10 },
  
  // Cards Operacionais
  metricsGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  metricCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 12, alignItems: 'center', elevation: 1, borderTopWidth: 3, borderWidth: 1, borderColor: '#F1F5F9' },
  metricIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  metricValue: { fontSize: 20, fontWeight: '800', color: colors.textHeader },
  metricLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  metricSub: { fontSize: 9, color: '#94A3B8', marginTop: 1 },

  // Sessões Hoje
  emptyBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  emptyText: { color: '#94A3B8', marginTop: 6, fontSize: 13, fontWeight: '500' },
  sessaoCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9', gap: 10 },
  sessaoHorario: { backgroundColor: '#EFF6FF', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center', minWidth: 52 },
  sessaoHorarioText: { fontSize: 13, fontWeight: '800', color: colors.primary },
  sessaoInfo: { flex: 1 },
  sessaoEstagiario: { fontSize: 14, fontWeight: '700', color: colors.textHeader },
  sessaoSala: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },

  // Leaderboard
  leaderboardContainer: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', padding: 10, marginBottom: 20 },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingHorizontal: 6 },
  rankBadge: { width: 32, alignItems: 'center', justifyContent: 'center' },
  rankMedal: { fontSize: 20 },
  rankNumber: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  avatarText: { fontSize: 14, fontWeight: '700' },
  leaderboardInfo: { flex: 1 },
  leaderboardName: { fontSize: 14, fontWeight: '700', color: colors.textHeader },
  leaderboardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  leaderboardRate: { alignItems: 'flex-end', minWidth: 60 },
  rateValue: { fontSize: 14, fontWeight: '800' },
  rateLabel: { fontSize: 10, color: '#94A3B8', marginTop: 1 },

  // Barra de Filtros Ativa
  activeFiltersBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  activeFiltersTextContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  activeFiltersText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  openFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  openFilterBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  // Destaques de Topo (Análise)
  topCardsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  topCard: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  topCardLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  topCardValue: { fontSize: 26, fontWeight: '900', marginVertical: 4 },
  topCardSub: { fontSize: 10, color: '#64748B' },

  // Distribuição Visual Donut Card (react-native-gifted-charts)
  donutCardContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20, alignItems: 'center', elevation: 1 },
  donutChartWrapper: { width: 120, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  
  // Grade de Legendas
  legendGrid: { flex: 1, gap: 8 },
  legendGridRow: { flexDirection: 'row', justifyContent: 'space-between' },
  legendGridItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBullet: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#475569', fontWeight: '500' },
  legendValue: { fontWeight: '800', color: '#1E293B' },

  // Gráfico
  chartCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 1 },
  chartEmpty: { alignItems: 'center', paddingVertical: 40 },
  chartEmptyText: { color: '#94A3B8', marginTop: 8, fontSize: 12, fontWeight: '500' },

  // Modais e Bottom Sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterBottomSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  filterModalTitle: { fontSize: 16, fontWeight: '800', color: colors.textHeader },
  filterModalSectionLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginTop: 12, marginBottom: 6 },
  hojeToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FFEDD5', borderRadius: 12, paddingVertical: 10, marginBottom: 4 },
  hojeToggleActive: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
  hojeToggleText: { fontSize: 13, fontWeight: '700', color: '#EA580C' },
  hojeToggleTextActive: { color: '#FFF' },
  chipsRow: { flexDirection: 'row', marginBottom: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#F1F5F9', marginRight: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#FFF' },
  chipDisabled: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9', opacity: 0.4 },
  chipTextDisabled: { color: '#CBD5E1' },
  applyFiltersBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 15, alignItems: 'center', marginTop: 18 },
  applyFiltersText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textHeader },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EAEEF3', borderRadius: 12, padding: 14, fontSize: 16, color: colors.textHeader },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 24 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
