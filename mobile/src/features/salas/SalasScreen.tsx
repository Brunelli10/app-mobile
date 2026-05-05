import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { colors } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { Calendar, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

const getWeekDays = () => {
  const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const dates = [];
  const today = new Date();
  for (let i = -3; i <= 10; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      dayOfWeek: dayNames[d.getDay()],
      dayNumber: d.getDate(),
      fullString: d.toISOString().split('T')[0]
    });
  }
  return dates;
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
  const { data: salas, isLoading } = useQuery({ queryKey: ['salas'], queryFn: async () => (await api.get('/salas')).data });
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week');
  const [weekDays] = useState(getWeekDays());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal de Nova Sala
  const [modalVisible, setModalVisible] = useState(false);
  const [newSalaNome, setNewSalaNome] = useState('');
  const [newSalaTipo, setNewSalaTipo] = useState('INDIVIDUAL');
  const [newSalaCapacidade, setNewSalaCapacidade] = useState('2');
  const [isCreating, setIsCreating] = useState(false);

  const isGestorOrRoot = user?.perfil === 'GESTOR' || user?.perfil === 'ROOT';

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
            <Ionicons name="notifications-outline" size={22} color={colors.textHeader} style={{ marginRight: 14 }} />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.nome?.substring(0, 2).toUpperCase() || 'ES'}</Text>
            </View>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekStrip}>
            {weekDays.map((d, i) => {
              const isActive = d.fullString === selectedDate;
              const isToday = d.fullString === new Date().toISOString().split('T')[0];
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayCol, isActive && styles.dayColActive]}
                  onPress={() => setSelectedDate(d.fullString)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{d.dayOfWeek}</Text>
                  <Text style={[styles.dateNum, isActive && styles.dateNumActive]}>{d.dayNumber}</Text>
                  {isToday && !isActive && <View style={styles.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.calendarWrapper}>
            <Calendar
              current={selectedDate}
              onDayPress={(day: any) => setSelectedDate(day.dateString)}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: colors.primary }
              }}
              theme={{
                selectedDayBackgroundColor: colors.primary,
                todayTextColor: colors.primary,
                arrowColor: colors.primary,
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
                onPress={() => navigation.navigate('SalaDetails', { salaId: sala.id, salaName: sala.nome })}
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
  safeArea: { flex: 1, backgroundColor: '#F2F5F8' },
  container: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoPsi: { fontSize: 32, color: colors.primary, fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textHeader },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 18, color: colors.primaryDark, fontWeight: '700' },
  toggleBox: { flexDirection: 'row', backgroundColor: '#EAEEF3', borderRadius: 20, padding: 3 },
  toggleBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 16 },
  toggleBtnActive: { backgroundColor: '#FFF', elevation: 2 },
  toggleText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  toggleTextActive: { color: colors.primary },
  weekStrip: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, flexDirection: 'row', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, marginBottom: 16 },
  dayCol: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, position: 'relative' },
  dayColActive: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 14 },
  dayText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  dayTextActive: { color: '#FFF', fontWeight: 'bold' },
  dateNum: { color: colors.textHeader, fontSize: 16, fontWeight: '600' },
  dateNumActive: { color: '#FFF', fontWeight: '800' },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 4 },
  calendarWrapper: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', elevation: 2, marginBottom: 16, padding: 6 },
  selectedDateLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginBottom: 14, textTransform: 'capitalize' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  addRoomBtn: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center', gap: 4 },
  addRoomText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  roomCard: { backgroundColor: '#FFF', borderRadius: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, marginBottom: 14, flexDirection: 'row', overflow: 'hidden' },
  roomAccent: { width: 5 },
  roomBody: { flex: 1, padding: 16 },
  roomHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  roomIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  roomName: { fontSize: 16, fontWeight: '700', color: colors.textHeader },
  roomSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  roomBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roomBadgeText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  roomFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', flex: 1 },
  tapHint: { fontSize: 11, color: colors.primary, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textHeader },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EAEEF3', borderRadius: 12, padding: 14, fontSize: 16, color: colors.textHeader },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EAEEF3', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  typeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
