import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { colors, spacing, shadows } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificacoesStore } from '../../store/useNotificacoesStore';
import { Calendar, LocaleConfig } from 'react-native-calendars';

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

const getWeekOf = (referenceDate: Date) => {
  const day = referenceDate.getDay();
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

const TIPO_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  GRUPO: 'Grupo',
  LUDICA: 'Lúdica'
};

const TIPO_COLORS: Record<string, string> = {
  INDIVIDUAL: '#6366F1',
  GRUPO: '#10B981',
  LUDICA: '#F59E0B'
};

export function SalasScreen() {
  const { data: salas, isLoading, refetch: refetchSalas } = useQuery({ queryKey: ['salas'], queryFn: async () => (await api.get('/salas')).data });
  const { data: agenda, refetch: refetchAgenda } = useQuery({
    queryKey: ['meus-agendamentos'],
    queryFn: async () => (await api.get('/meus-agendamentos')).data
  });
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const naoLidas = useNotificacoesStore(state => state.naoLidas);

  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week');
  const [weekRef, setWeekRef] = useState(new Date());
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const weekDays = getWeekOf(weekRef);

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

  const navigateWeek = (dir: 1 | -1) => {
    const next = new Date(weekRef);
    next.setDate(weekRef.getDate() + dir * 7);
    setWeekRef(next);
  };

  const firstDay = weekDays[0];
  const lastDay = weekDays[6];
  const firstDate = new Date(firstDay.fullString + 'T12:00');
  const lastDate = new Date(lastDay.fullString + 'T12:00');
  const weekLabel = firstDate.getMonth() === lastDate.getMonth()
    ? `${MONTH_NAMES[firstDate.getMonth()]} ${firstDate.getFullYear()}`
    : `${MONTH_NAMES[firstDate.getMonth()]}–${MONTH_NAMES[lastDate.getMonth()]} ${lastDate.getFullYear()}`;

  // Modal de Nova Sala
  const [modalVisible, setModalVisible] = useState(false);
  const [newSalaNome, setNewSalaNome] = useState('');
  const [newSalaTipo, setNewSalaTipo] = useState('INDIVIDUAL');
  const [newSalaCapacidade, setNewSalaCapacidade] = useState('2');
  const [isCreating, setIsCreating] = useState(false);

  const isGestorOrRoot = user?.perfil === 'GESTOR' || user?.perfil === 'ROOT';

  useFocusEffect(
    useCallback(() => {
      refetchSalas();
      refetchAgenda();
    }, [refetchSalas, refetchAgenda])
  );

  const handleCreateSala = async () => {
    if (!newSalaNome || !newSalaCapacidade) {
      return Alert.alert('Erro', 'Preencha todos os campos.');
    }
    setIsCreating(true);
    try {
      await api.post('/salas', { nome: newSalaNome, tipo: newSalaTipo, capacidade: parseInt(newSalaCapacidade) });
      setModalVisible(false);
      setNewSalaNome('');
      queryClient.invalidateQueries({ queryKey: ['salas'] });
      Alert.alert('Sucesso', 'Sala criada!');
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Não foi possível criar a sala.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSala = (salaId: number, salaName: string) => {
    const message = `Tem certeza que deseja excluir a sala "${salaName}"?\n\nEsta ação não poderá ser desfeita.`;

    const performDelete = async () => {
      try {
        await api.delete(`/salas/${salaId}`);
        queryClient.invalidateQueries({ queryKey: ['salas'] });
        if (Platform.OS === 'web') {
          alert('Sala excluída com sucesso.');
        } else {
          Alert.alert('Sucesso', 'Sala excluída com sucesso.');
        }
      } catch (e: any) {
        if (Platform.OS === 'web') {
          alert(e.response?.data?.error || 'Não foi possível excluir a sala.');
        } else {
          Alert.alert('Erro', e.response?.data?.error || 'Não foi possível excluir a sala.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Confirmar Exclusão',
        message,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: performDelete
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ─── Header ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logoPsi}>Ψ</Text>
            <View>
              <Text style={styles.headerTitle}>Psicologia SEP</Text>
              <Text style={styles.headerSub}>Olá, {user?.nome?.split(' ')[0] || 'bem-vindo'}!</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => navigation.navigate('Notificacoes')} style={{ marginRight: 14 }}>
              <Ionicons name="notifications-outline" size={22} color={colors.textHeader} />
              {naoLidas > 0 && (
                <View style={styles.badgeTopRight}>
                  <Text style={styles.badgeTopRightText}>{naoLidas > 99 ? '99+' : naoLidas}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Configurações')} activeOpacity={0.85}>
              <Text style={styles.avatarText}>{user?.nome?.substring(0, 2).toUpperCase() || 'ES'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Calendário com Toggle ─────────────────────────────── */}
        <View style={styles.calendarHeader}>
          <Text style={styles.sectionTitle}>Grade de Datas</Text>
          <View style={styles.toggleBox}>
            <TouchableOpacity
              style={[styles.toggleBtn, calendarMode === 'week' && styles.toggleBtnActive]}
              onPress={() => setCalendarMode('week')}
            >
              <Text style={[styles.toggleText, calendarMode === 'week' && styles.toggleTextActive]}>Semana</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, calendarMode === 'month' && styles.toggleBtnActive]}
              onPress={() => setCalendarMode('month')}
            >
              <Text style={[styles.toggleText, calendarMode === 'month' && styles.toggleTextActive]}>Mês</Text>
            </TouchableOpacity>
          </View>
        </View>

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

        {/* Data selecionada como label */}
        <Text style={styles.selectedDateLabel}>
          Salas — {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </Text>

        {/* ─── Salas ───────────────────────────────────────────────── */}
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Salas da Clínica</Text>
          {isGestorOrRoot && (
            <TouchableOpacity style={styles.addRoomBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.addRoomText}>Nova Sala</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          salas?.map((sala: any) => {
            const tipoColor = TIPO_COLORS[sala.tipo] || colors.primary;
            return (
              <TouchableOpacity
                key={sala.id}
                style={styles.roomCard}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('SalaDetails', { salaId: sala.id, salaName: sala.nome, salaTipo: sala.tipo })}
              >
                {/* Faixa colorida lateral por tipo */}
                <View style={[styles.roomAccent, { backgroundColor: tipoColor }]} />
                <View style={styles.roomBody}>
                  <View style={styles.roomHeaderRow}>
                    <View style={[styles.roomIconBox, { backgroundColor: tipoColor + '20' }]}>
                      <Ionicons name={sala.icon as any} size={20} color={tipoColor} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.roomName}>{sala.nome}</Text>
                      <Text style={styles.roomSub}>
                        {TIPO_LABELS[sala.tipo]} · Cap. {sala.capacidade} pessoa(s)
                      </Text>
                    </View>
                    <View style={styles.roomBadge}>
                      <Text style={styles.roomBadgeText}>{sala.totalAgendamentos} agend.</Text>
                    </View>
                    {isGestorOrRoot && (
                      <TouchableOpacity
                        style={styles.deleteRoomCardBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteSala(sala.id, sala.nome);
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: 8 }} />
                  </View>
                  <View style={styles.roomFooter}>
                    <View style={[styles.statusDot, { backgroundColor: sala.ativa ? '#10B981' : '#EF4444' }]} />
                    <Text style={styles.statusText}>{sala.ativa ? 'Disponível' : 'Inativa'}</Text>
                    <Text style={styles.tapHint}>Toque para agendar →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

      </ScrollView>

      {/* ─── Modal Nova Sala ─────────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Sala</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Nome da Sala *</Text>
            <TextInput style={styles.input} placeholder="Ex: Sala 05 — Infantil" value={newSalaNome} onChangeText={setNewSalaNome} />

            <Text style={styles.label}>Tipo *</Text>
            <View style={styles.typeRow}>
              {['INDIVIDUAL', 'GRUPO', 'LUDICA'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, newSalaTipo === type && { backgroundColor: TIPO_COLORS[type] + '20', borderColor: TIPO_COLORS[type] }]}
                  onPress={() => setNewSalaTipo(type)}
                >
                  <Text style={[styles.typeText, newSalaTipo === type && { color: TIPO_COLORS[type], fontWeight: '700' }]}>
                    {TIPO_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Capacidade (pessoas) *</Text>
            <TextInput style={styles.input} placeholder="Ex: 2" keyboardType="numeric" value={newSalaCapacidade} onChangeText={setNewSalaCapacidade} />

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateSala} disabled={isCreating}>
              {isCreating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Criar Sala</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoPsi: { fontSize: 32, color: colors.primary, fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textHeader },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  badgeTopRight: { position: 'absolute', top: -4, right: -6, backgroundColor: colors.error, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: colors.background },
  badgeTopRightText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 18, color: colors.primaryDark, fontWeight: '700' },
  toggleBox: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: 20, padding: 3 },
  toggleBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 16 },
  toggleBtnActive: { backgroundColor: colors.surface, ...shadows.card },
  toggleText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  toggleTextActive: { color: colors.primary },
  weekContainer: { backgroundColor: colors.surface, borderRadius: 16, paddingBottom: 12, marginBottom: 16, ...shadows.card },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
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
  calendarWrapper: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', ...shadows.card, marginBottom: 16, padding: 6 },
  deleteRoomCardBtn: { padding: 6, borderRadius: 8, backgroundColor: colors.errorLight, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  selectedDateLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginBottom: 14, textTransform: 'capitalize' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  addRoomBtn: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center', gap: 4, ...shadows.btn },
  addRoomText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  roomCard: { backgroundColor: colors.surface, borderRadius: 16, ...shadows.card, marginBottom: 14, flexDirection: 'row', overflow: 'hidden' },
  roomAccent: { width: 5 },
  roomBody: { flex: 1, padding: 16 },
  roomHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  roomIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  roomName: { fontSize: 16, fontWeight: '700', color: colors.textHeader },
  roomSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  roomBadge: { backgroundColor: colors.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roomBadgeText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  roomFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', flex: 1 },
  tapHint: { fontSize: 11, color: colors.primary, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textHeader },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16, color: colors.textHeader },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  typeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  sessionDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 3 },
  sessionDotActive: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)', marginTop: 3 }
});
