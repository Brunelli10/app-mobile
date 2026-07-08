import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, shadows } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useAuthStore } from '../../store/useAuthStore';

LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

const DAY_NAMES_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Retorna os 7 dias (Dom→Sáb) da semana que contém `referenceDate`
const getWeekOf = (referenceDate: Date): { label: string; fullString: string; isWeekend: boolean }[] => {
  // Segunda-feira como início da semana
  const day = referenceDate.getDay(); // 0=Dom
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - ((day === 0 ? 7 : day) - 1));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: DAY_NAMES_SHORT[(d.getDay())],
      fullString: d.toISOString().split('T')[0],
      dayNum: d.getDate(),
      isWeekend: d.getDay() === 0 || d.getDay() === 6
    };
  });
};

const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  AGENDADA:   { color: colors.primary, label: 'Agendada',  bg: '#EFF6FF' },
  REALIZADA:  { color: '#10B981',      label: 'Realizada', bg: '#DCFCE7' },
  CONCLUIDA:  { color: '#10B981',      label: 'Concluída', bg: '#DCFCE7' },
  FALTA:      { color: '#EF4444',      label: 'Falta',     bg: '#FEE2E2' },
  CANCELADA:  { color: '#94A3B8',      label: 'Cancelada', bg: '#F1F5F9' },
};

export function AgendaScreen() {
  const { user } = useAuthStore();
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'AGENDADA' | 'CONCLUIDA' | 'FALTA'>('TODOS');
  const todayStr = new Date().toISOString().split('T')[0];

  // Semana atual: referência pelo início (segunda-feira)
  const [weekRef, setWeekRef] = useState(new Date()); // data de referência da semana
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const weekDays = getWeekOf(weekRef) as any[];

  const navigateWeek = (dir: 1 | -1) => {
    const next = new Date(weekRef);
    next.setDate(weekRef.getDate() + dir * 7);
    setWeekRef(next);
  };

  // Label do cabeçalho da semana: "Mai 2026" ou "Abr–Mai 2026" se cruza meses
  const firstDay = weekDays[0];
  const lastDay = weekDays[6];
  const firstDate = new Date(firstDay.fullString + 'T12:00');
  const lastDate = new Date(lastDay.fullString + 'T12:00');
  const weekLabel = firstDate.getMonth() === lastDate.getMonth()
    ? `${MONTH_NAMES[firstDate.getMonth()]} ${firstDate.getFullYear()}`
    : `${MONTH_NAMES[firstDate.getMonth()]}–${MONTH_NAMES[lastDate.getMonth()]} ${lastDate.getFullYear()}`;

  const { data: agenda, isLoading, refetch } = useQuery({
    queryKey: ['meus-agendamentos'],
    queryFn: async () => (await api.get('/meus-agendamentos')).data
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Marcar datas com sessões para o calendário mensal
  const markedDates: Record<string, any> = {};
  agenda?.forEach((ag: any) => {
    if (ag.dataRaw) {
      markedDates[ag.dataRaw] = ag.dataRaw === selectedDate
        ? { selected: true, selectedColor: colors.primary, marked: true, dotColor: '#FFF' }
        : { marked: true, dotColor: colors.primary };
    }
  });
  if (!markedDates[selectedDate]) {
    markedDates[selectedDate] = { selected: true, selectedColor: colors.primary };
  }

  const filteredAgenda = agenda?.filter((ag: any) => {
    const matchesDate = ag.dataRaw === selectedDate;
    let matchesStatus = true;
    if (filtroStatus === 'AGENDADA') {
      matchesStatus = ag.status === 'AGENDADA';
    } else if (filtroStatus === 'CONCLUIDA') {
      matchesStatus = ag.status === 'CONCLUIDA' || ag.status === 'REALIZADA';
    } else if (filtroStatus === 'FALTA') {
      matchesStatus = ag.status === 'FALTA' || ag.status === 'CANCELADA';
    }
    return matchesDate && matchesStatus;
  }) || [];

  // Determinar o título da tela por perfil
  const tituloPorPerfil: Record<string, string> = {
    PACIENTE: 'Minhas Sessões',
    ESTAGIARIO: 'Minha Agenda',
    GESTOR: 'Agenda da Clínica',
    ROOT: 'Agenda da Clínica'
  };
  const titulo = tituloPorPerfil[user?.perfil || 'ESTAGIARIO'] || 'Agenda';

  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ─── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{titulo}</Text>
          <Text style={styles.headerSub}>
            {filteredAgenda.length} sessão(ões) · {new Date(selectedDate + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </Text>
        </View>
        <View style={styles.toggleBox}>
          <TouchableOpacity style={[styles.toggleBtn, calendarMode === 'week' && styles.toggleBtnActive]} onPress={() => setCalendarMode('week')}>
            <Text style={[styles.toggleText, calendarMode === 'week' && styles.toggleTextActive]}>Semana</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, calendarMode === 'month' && styles.toggleBtnActive]} onPress={() => setCalendarMode('month')}>
            <Text style={[styles.toggleText, calendarMode === 'month' && styles.toggleTextActive]}>Mês</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Calendário Semanal ────────────────────────── */}
      {calendarMode === 'week' ? (
        <View style={styles.weekContainer}>
          {/* Navegação de semana */}
          <View style={styles.weekNav}>
            <TouchableOpacity style={styles.navArrow} onPress={() => navigateWeek(-1)}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.weekLabel}>{weekLabel}</Text>
            <TouchableOpacity style={styles.navArrow} onPress={() => navigateWeek(1)}>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Grade Seg–Dom */}
          <View style={styles.weekStrip}>
            {weekDays.map((d: any, i: number) => {
              const isActive = d.fullString === selectedDate;
              const isToday = d.fullString === todayStr;
              const hasSession = agenda?.some((ag: any) => ag.dataRaw === d.fullString);
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dayCol,
                    isActive && styles.dayColActive,
                    d.isWeekend && !isActive && styles.dayColWeekend
                  ]}
                  onPress={() => setSelectedDate(d.fullString)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayLabel,
                    isActive && styles.dayLabelActive,
                    d.isWeekend && !isActive && styles.dayLabelWeekend
                  ]}>{d.label}</Text>
                  <Text style={[
                    styles.dayNum,
                    isActive && styles.dayNumActive,
                    isToday && !isActive && styles.dayNumToday
                  ]}>{d.dayNum}</Text>
                  {hasSession && !isActive && <View style={styles.sessionDot} />}
                  {hasSession && isActive && <View style={styles.sessionDotActive} />}
                  {!hasSession && <View style={{ height: 5 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.calendarWrapper}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              selectedDayBackgroundColor: colors.primary,
              todayTextColor: colors.primary,
              arrowColor: colors.primary,
              dotColor: colors.primary,
              textDayFontWeight: '600',
            }}
          />
        </View>
      )}

      {/* Filtros por Status */}
      <View style={styles.statusFilterContainer}>
        {(['TODOS', 'AGENDADA', 'CONCLUIDA', 'FALTA'] as const).map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.statusFilterBtn, filtroStatus === status && styles.statusFilterBtnActive]}
            onPress={() => setFiltroStatus(status)}
          >
            <Text style={[styles.statusFilterText, filtroStatus === status && styles.statusFilterTextActive]}>
              {status === 'TODOS' ? 'Todas' : status === 'AGENDADA' ? 'Agendadas' : status === 'CONCLUIDA' ? 'Concluídas' : 'Faltas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── Lista de Sessões ──────────────────────────── */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredAgenda.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Sem sessões neste dia</Text>
            <Text style={styles.emptyText}>
              {user?.perfil === 'PACIENTE'
                ? 'Você não tem sessões agendadas para este dia.'
                : 'Vá até a aba Salas para criar um agendamento.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredAgenda}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={refetch}
            refreshing={isLoading}
            renderItem={({ item }) => {
              const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['AGENDADA'];
              const pacientesNomes = item.pacientes?.map((p: any) => p.nome).join(', ') || '—';
              const showPaciente = user?.perfil !== 'PACIENTE'; // Paciente já sabe quem é ele

              return (
                <TouchableOpacity
                  style={styles.agendaCard}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('SessaoDetails', { sessao: item })}
                >
                  <View style={[styles.cardAccent, { backgroundColor: statusCfg.color }]} />
                  <View style={styles.cardBody}>
                    {/* Horário + Status */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.horarioBadge}>
                        <Ionicons name="time-outline" size={13} color={colors.primary} />
                        <Text style={styles.horarioText}>{item.horarioInicio} – {item.horarioFim}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                        <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                      </View>
                    </View>

                    {/* Paciente(s) — com Badge do Tipo de Atendimento */}
                    {showPaciente && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginVertical: 2 }}>
                        <Text style={styles.pacienteNome} numberOfLines={1}>{pacientesNomes}</Text>
                        {item.pacientes?.[0]?.tipoAtendimento && (
                          <View style={[styles.tagBadge, {
                            backgroundColor: item.pacientes[0].tipoAtendimento === 'CRIANCA' ? '#FFF7ED' : (item.pacientes[0].tipoAtendimento === 'CASAL' ? '#FDF2F8' : '#EFF6FF')
                          }]}>
                            <Text style={[styles.tagBadgeText, {
                              color: item.pacientes[0].tipoAtendimento === 'CRIANCA' ? '#EA580C' : (item.pacientes[0].tipoAtendimento === 'CASAL' ? '#DB2777' : colors.primary)
                            }]}>
                              {item.pacientes[0].tipoAtendimento === 'CRIANCA' ? 'Criança' : (item.pacientes[0].tipoAtendimento === 'CASAL' ? 'Casal' : 'Adulto')}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Estagiário Titular */}
                    {(user?.perfil === 'GESTOR' || user?.perfil === 'ROOT' || user?.perfil === 'PACIENTE') && item.estagiarioNome && (
                      <Text style={styles.estagiarioText}>
                        <Ionicons name="person-circle-outline" size={12} color={colors.textSecondary} /> {item.estagiarioNome}
                      </Text>
                    )}

                    {/* Estagiário Substituto (se houver) */}
                    {item.estagiarioSubstitutoNome && (
                      <Text style={styles.substitutoText}>
                        <Ionicons name="swap-horizontal-outline" size={12} color="#D97706" /> Atendido por: {item.estagiarioSubstitutoNome} (Substituto)
                      </Text>
                    )}

                    {/* Sala */}
                    <View style={styles.cardBottomRow}>
                      <Ionicons name="business-outline" size={12} color={colors.textSecondary} />
                      <Text style={styles.salaText}>{item.salaNome}</Text>
                      <View style={styles.tipoBadge}>
                        <Text style={styles.tipoText}>{item.tipo === 'UNICO' ? 'Única' : '10 sem.'}</Text>
                      </View>
                    </View>
                  </View>
                  {user?.perfil !== 'PACIENTE' && (
                    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: 20, paddingBottom: 14, backgroundColor: colors.surface },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.primaryDark },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  toggleBox: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: 20, padding: 3 },
  toggleBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 16 },
  toggleBtnActive: { backgroundColor: colors.surface, ...shadows.card },
  toggleText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  toggleTextActive: { color: colors.primary },

  // ─── Calendário Semanal ─────────────────────────────────
  weekContainer: { backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 12 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 8 },
  navArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.infoLight, justifyContent: 'center', alignItems: 'center' },
  weekLabel: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  weekStrip: { flexDirection: 'row', paddingHorizontal: 10, gap: 4 },
  dayCol: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14 },
  dayColActive: { backgroundColor: colors.primary },
  dayColWeekend: { opacity: 0.6 },
  dayLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 4, textTransform: 'uppercase' },
  dayLabelActive: { color: '#FFF' },
  dayLabelWeekend: { color: colors.primary },
  dayNum: { fontSize: 16, fontWeight: '700', color: colors.textHeader },
  dayNumActive: { color: '#FFF' },
  dayNumToday: { color: colors.primary },
  sessionDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 3 },
  sessionDotActive: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)', marginTop: 3 },

  // ─── Calendário Mensal ──────────────────────────────────
  calendarWrapper: { backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border },

  // ─── Filtro Status ──────────────────────────────────────
  statusFilterContainer: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginTop: 14, gap: 6 },
  statusFilterBtn: { flex: 1, backgroundColor: colors.surface, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.card },
  statusFilterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusFilterText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  statusFilterTextActive: { color: '#FFF' },

  // ─── Lista ──────────────────────────────────────────────
  listContainer: { flex: 1 },
  listContent: { padding: spacing.lg, paddingBottom: 100 },
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textHeader, marginTop: 16 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 8, lineHeight: 22 },
  agendaCard: { backgroundColor: colors.surface, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, ...shadows.card, overflow: 'hidden', paddingRight: 14 },
  cardAccent: { width: 5, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14, gap: 5 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  horarioBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  horarioText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  pacienteNome: { fontSize: 16, fontWeight: '700', color: colors.textHeader },
  tagBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginLeft: 6 },
  tagBadgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  estagiarioText: { fontSize: 12, color: colors.textSecondary },
  substitutoText: { fontSize: 11, color: colors.warning, fontWeight: '600', marginTop: 1 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  salaText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', flex: 1 },
  tipoBadge: { backgroundColor: colors.border, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  tipoText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' }
});
