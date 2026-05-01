import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { useNavigation } from '@react-navigation/native';
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
  REALIZADA:  { color: colors.primary, label: 'Agendada',  bg: '#EFF6FF' },
  CONCLUIDA:  { color: '#10B981',      label: 'Concluída', bg: '#DCFCE7' },
  FALTA:      { color: '#EF4444',      label: 'Falta',     bg: '#FEE2E2' },
  CANCELADA:  { color: '#94A3B8',      label: 'Cancelada', bg: '#F1F5F9' },
};

export function AgendaScreen() {
  const { user } = useAuthStore();
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week');
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

  const filteredAgenda = agenda?.filter((ag: any) => ag.dataRaw === selectedDate) || [];

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
              const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['REALIZADA'];
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

                    {/* Paciente(s) — visível para estagiário e gestor */}
                    {showPaciente && (
                      <Text style={styles.pacienteNome} numberOfLines={1}>{pacientesNomes}</Text>
                    )}

                    {/* Estagiário — visível para gestor e paciente */}
                    {(user?.perfil === 'GESTOR' || user?.perfil === 'ROOT' || user?.perfil === 'PACIENTE') && item.estagiarioNome && (
                      <Text style={styles.estagiarioText}>
                        <Ionicons name="person-circle-outline" size={12} color={colors.textSecondary} /> {item.estagiarioNome}
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
  safeArea: { flex: 1, backgroundColor: '#F2F5F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.primaryDark },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  toggleBox: { flexDirection: 'row', backgroundColor: '#EAEEF3', borderRadius: 20, padding: 3 },
  toggleBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 16 },
  toggleBtnActive: { backgroundColor: '#FFF', elevation: 2 },
  toggleText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  toggleTextActive: { color: colors.primary },

  // ─── Calendário Semanal ─────────────────────────────────
  weekContainer: { backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EAEEF3', paddingBottom: 12 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  navArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
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
  calendarWrapper: { backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EAEEF3' },

  // ─── Lista ──────────────────────────────────────────────
  listContainer: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textHeader, marginTop: 16 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 8, lineHeight: 22 },
  agendaCard: { backgroundColor: '#FFF', borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, overflow: 'hidden', paddingRight: 14 },
  cardAccent: { width: 5, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14, gap: 5 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  horarioBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  horarioText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  pacienteNome: { fontSize: 16, fontWeight: '700', color: colors.textHeader },
  estagiarioText: { fontSize: 12, color: colors.textSecondary },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  salaText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', flex: 1 },
  tipoBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  tipoText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' }
});
