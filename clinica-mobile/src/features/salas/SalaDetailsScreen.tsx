import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../config/theme';
import { Button } from '../../components/Button';
import { api } from '../../api/apiClient';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useQuery, useQueryClient } from '@tanstack/react-query';

LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan.','Fev.','Mar','Abr','Mai','Jun','Jul.','Ago','Set.','Out.','Nov.','Dez.'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom.','Seg.','Ter.','Qua.','Qui.','Sex.','Sáb.'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

const getNextDays = () => {
  const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const dates = [];
  const today = new Date();
  for (let i = 0; i <= 30; i++) {
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

// Gerar as datas do ciclo (para visualização do resumo)
const getCycleDates = (startDate: string, weeks: number): string[] => {
  const dates: string[] = [];
  const start = new Date(startDate + 'T12:00:00');
  for (let i = 0; i < weeks; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 7);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

export function SalaDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { salaId, salaName } = route.params || {};

  const [viewMode, setViewMode] = useState<'month' | 'week'>('week');
  const weekDays = getNextDays();
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [weeksCount, setWeeksCount] = useState(1);
  const [pacienteId, setPacienteId] = useState<number | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  // Modal de Responsável
  const [respModalVisible, setRespModalVisible] = useState(false);
  const [respNome, setRespNome] = useState('');
  const [respCpf, setRespCpf] = useState('');
  const [respTelefone, setRespTelefone] = useState('');
  const [isUpdatingResp, setIsUpdatingResp] = useState(false);

  // ─── Dados: Pacientes ─────────────────────────────────────────────
  const { data: pacientes, isLoading: loadingPacientes } = useQuery({
    queryKey: ['pacientes'],
    queryFn: async () => (await api.get('/pacientes')).data
  });

  // ─── Dados: Disponibilidade de slots por data ─────────────────────
  const { data: disponibilidade, isLoading: loadingSlots } = useQuery({
    queryKey: ['disponibilidade', salaId, selectedDate],
    queryFn: async () => (await api.get(`/salas/${salaId}/disponibilidade?data=${selectedDate}`)).data,
    enabled: !!salaId && !!selectedDate
  });

  // Calcular datas do ciclo para o resumo visual
  const cycleDates = selectedDate && weeksCount > 1 ? getCycleDates(selectedDate, weeksCount) : [];

  const handleBooking = async () => {
    if (!selectedDate) return Alert.alert('Atenção', 'Selecione uma data.');
    if (!selectedTime) return Alert.alert('Atenção', 'Selecione um horário.');
    if (!pacienteId) return Alert.alert('Atenção', 'Selecione um paciente.');

    const slotInfo = disponibilidade?.find((s: any) => s.horario === selectedTime);
    if (slotInfo?.ocupado) {
      return Alert.alert('Horário Ocupado', `Este horário já está reservado por ${slotInfo.estagiario}. Escolha outro.`);
    }

    Alert.alert(
      'Confirmar Agendamento',
      `Sala: ${salaName}\nData: ${selectedDate}\nHorário: ${selectedTime}\nCiclo: ${weeksCount} semana(s)\n\nDeseja confirmar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setIsBooking(true);
            try {
              await api.post('/agendamentos', { salaId, horarioInicio: selectedTime, weeksCount, pacienteId, dataInicio: selectedDate });
              queryClient.invalidateQueries({ queryKey: ['disponibilidade'] });
              queryClient.invalidateQueries({ queryKey: ['meus-agendamentos'] });
              Alert.alert('✅ Agendado!', `${weeksCount} sessão(ões) registrada(s) com sucesso.`);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Conflito Detectado', e?.response?.data?.error || 'Erro ao agendar.');
            } finally {
              setIsBooking(false);
            }
          }
        }
      ]
    );
  };

  const handleSaveResponsavel = async () => {
    if (!respNome || !respTelefone) return Alert.alert('Atenção', 'Preencha o Nome e o Telefone.');
    setIsUpdatingResp(true);
    try {
      await api.put(`/pacientes/${pacienteId}/responsavel`, { responsavelNome: respNome, responsavelCpf: respCpf, responsavelTelefone: respTelefone });
      setRespModalVisible(false);
      setRespNome(''); setRespCpf(''); setRespTelefone('');
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      Alert.alert('Sucesso', 'Responsável vinculado!');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Erro ao vincular.');
    } finally {
      setIsUpdatingResp(false);
    }
  };

  const selectedPaciente = pacientes?.find((p: any) => p.id === pacienteId);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{salaName || 'Agendamento'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ─── 1. Paciente ──────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>1. Selecione o Paciente</Text>
        {loadingPacientes ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pacientesScroll}>
            {pacientes?.map((p: any) => {
              const isActive = pacienteId === p.id;
              const calcIdade = (dn: string) => {
                if (!dn) return 99;
                const nasc = new Date(dn);
                const hoje = new Date();
                let idade = hoje.getFullYear() - nasc.getFullYear();
                const m = hoje.getMonth() - nasc.getMonth();
                if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
                return idade;
              };
              const idade = calcIdade(p.dataNascimento);
              const isMenor = idade < 18;

              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pacienteCard, isActive && styles.pacienteCardActive]}
                  onPress={() => setPacienteId(p.id)}
                >
                  <View style={styles.pacienteCardTop}>
                    <View style={[styles.pacienteAvatar, isActive && styles.pacienteAvatarActive]}>
                      <Text style={[styles.pacienteAvatarText, isActive && { color: colors.primary }]}>
                        {p.nome.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    {isMenor && <View style={styles.menorBadge}><Text style={styles.menorBadgeText}>-18</Text></View>}
                  </View>
                  <Text style={[styles.pacienteNome, isActive && styles.textWhite]} numberOfLines={1}>{p.nome}</Text>
                  <Text style={[styles.pacienteSub, isActive && styles.textWhiteAlpha]}>{idade} anos</Text>

                  {isActive && (
                    <View style={styles.respBox}>
                      {p.responsavelNome ? (
                        <View style={styles.respInfo}>
                          <Ionicons name="person" size={11} color="#FFF" />
                          <Text style={styles.respText} numberOfLines={1}>{p.responsavelNome}</Text>
                        </View>
                      ) : isMenor ? (
                        <TouchableOpacity style={styles.addRespBtn} onPress={() => setRespModalVisible(true)}>
                          <Ionicons name="warning" size={12} color="#FFF" />
                          <Text style={styles.addRespText}>Responsável obrigatório!</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity style={styles.addRespBtnOptional} onPress={() => setRespModalVisible(true)}>
                          <Ionicons name="person-add" size={12} color={colors.primary} />
                          <Text style={styles.addRespTextOptional}>Adicionar responsável</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ─── 2. Data ──────────────────────────────────────────── */}
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>2. Data de Início</Text>
          <View style={styles.toggleBox}>
            <TouchableOpacity style={[styles.toggleBtn, viewMode === 'week' && styles.toggleBtnActive]} onPress={() => setViewMode('week')}>
              <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>Semana</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, viewMode === 'month' && styles.toggleBtnActive]} onPress={() => setViewMode('month')}>
              <Text style={[styles.toggleText, viewMode === 'month' && styles.toggleTextActive]}>Mês</Text>
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === 'month' ? (
          <View style={styles.calendarWrapper}>
            <Calendar
              current={selectedDate}
              minDate={todayStr}
              onDayPress={(day: any) => setSelectedDate(day.dateString)}
              markedDates={{
                ...cycleDates.reduce((acc, d, i) => ({
                  ...acc,
                  [d]: i === 0 ? { selected: true, selectedColor: colors.primary } : { marked: true, dotColor: colors.primary }
                }), {}),
                [selectedDate]: { selected: true, selectedColor: colors.primary }
              }}
              theme={{ selectedDayBackgroundColor: colors.primary, todayTextColor: colors.primary, arrowColor: colors.primary }}
            />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekStrip}>
            {weekDays.map((d, i) => {
              const isActive = d.fullString === selectedDate;
              const isToday = d.fullString === todayStr;
              const isCycle = cycleDates.includes(d.fullString) && !isActive;
              return (
                <TouchableOpacity key={i} style={[styles.dayCol, isActive && styles.dayColActive, isCycle && styles.dayColCycle]} onPress={() => setSelectedDate(d.fullString)}>
                  <Text style={[styles.dayText, isActive && styles.textWhite, isCycle && styles.dayTextCycle]}>{d.dayOfWeek}</Text>
                  <Text style={[styles.dateNum, isActive && styles.textWhite, isToday && !isActive && { color: colors.primary }, isCycle && styles.dayTextCycle]}>{d.dayNumber}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ─── 3. Horário com disponibilidade visual ────────────── */}
        <Text style={styles.sectionTitle}>3. Selecione o Horário</Text>
        <Text style={styles.legendRow}>
          <Text style={styles.legendFree}>■ Livre  </Text>
          <Text style={styles.legendOcupado}>■ Ocupado  </Text>
          <Text style={styles.legendSelected}>■ Selecionado</Text>
        </Text>
        {loadingSlots ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : (
          <View style={styles.slotsGrid}>
            {disponibilidade?.map((slot: any) => {
              const isSelected = selectedTime === slot.horario;
              const isOcupado = slot.ocupado;
              return (
                <TouchableOpacity
                  key={slot.horario}
                  style={[
                    styles.slotItem,
                    isOcupado && styles.slotItemOcupado,
                    isSelected && styles.slotItemActive,
                  ]}
                  onPress={() => {
                    if (isOcupado) {
                      Alert.alert('Horário Ocupado', `Reservado por: ${slot.estagiario}\nPaciente(s): ${slot.pacientes?.join(', ')}`);
                    } else {
                      setSelectedTime(slot.horario);
                    }
                  }}
                  disabled={isOcupado && !isSelected}
                  activeOpacity={isOcupado ? 1 : 0.7}
                >
                  {isOcupado && <Ionicons name="lock-closed" size={11} color="#94A3B8" style={{ marginBottom: 2 }} />}
                  <Text style={[styles.slotText, isOcupado && styles.slotTextOcupado, isSelected && styles.slotTextActive]}>
                    {slot.horario}
                  </Text>
                  {isOcupado && <Text style={styles.slotOcupadoHint} numberOfLines={1}>{slot.estagiario?.split(' ')[0]}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ─── 4. Duração do Ciclo ──────────────────────────────── */}
        <Text style={styles.sectionTitle}>4. Duração do Ciclo</Text>
        <View style={styles.stepperContainer}>
          <TouchableOpacity style={styles.stepperButton} onPress={() => weeksCount > 1 && setWeeksCount(w => w - 1)}>
            <Ionicons name="remove" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.stepperValueBox}>
            <Text style={styles.stepperValueText}>{weeksCount}</Text>
            <Text style={styles.stepperLabel}>Semana{weeksCount > 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={styles.stepperButton} onPress={() => weeksCount < 10 && setWeeksCount(w => w + 1)}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Resumo visual do ciclo */}
        {weeksCount > 1 && selectedDate && selectedTime && (
          <View style={styles.cyclePreview}>
            <Text style={styles.cyclePreviewTitle}>📅 Sessões que serão criadas:</Text>
            {getCycleDates(selectedDate, weeksCount).map((d, i) => (
              <View key={i} style={styles.cycleRow}>
                <View style={styles.cycleDot} />
                <Text style={styles.cycleDate}>
                  {`${i + 1}ª sessão — ${new Date(d + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} às ${selectedTime}`}
                </Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Footer Botão */}
      <View style={styles.footerInfo}>
        {isBooking ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Button title="VERIFICAR E AGENDAR" onPress={handleBooking} />
        )}
      </View>

      {/* Modal Responsável */}
      <Modal visible={respModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vincular Responsável</Text>
              <TouchableOpacity onPress={() => setRespModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Nome do Responsável *</Text>
            <TextInput style={styles.input} placeholder="Ex: João da Silva" value={respNome} onChangeText={setRespNome} />
            <Text style={styles.label}>Telefone *</Text>
            <TextInput style={styles.input} placeholder="11999999999" keyboardType="numeric" value={respTelefone} onChangeText={setRespTelefone} />
            <Text style={styles.label}>CPF (Opcional)</Text>
            <TextInput style={styles.input} placeholder="12345678900" keyboardType="numeric" value={respCpf} onChangeText={setRespCpf} />
            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveResponsavel} disabled={isUpdatingResp}>
              {isUpdatingResp ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Salvar Responsável</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F5F8' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#FFF', elevation: 2 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.textHeader },
  container: { padding: 20, paddingBottom: 150 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 17, color: colors.primaryDark, fontWeight: '700', marginBottom: 14, marginTop: 8 },
  toggleBox: { flexDirection: 'row', backgroundColor: '#EAEEF3', borderRadius: 20, padding: 3 },
  toggleBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 16 },
  toggleBtnActive: { backgroundColor: '#FFF', elevation: 2 },
  toggleText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  toggleTextActive: { color: colors.primary },
  pacientesScroll: { marginBottom: 24 },
  pacienteCard: { backgroundColor: '#FFF', padding: 14, borderRadius: 14, marginRight: 10, borderWidth: 1.5, borderColor: '#EAEEF3', width: 150, elevation: 1 },
  pacienteCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pacienteCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  pacienteAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  pacienteAvatarActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  pacienteAvatarText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  menorBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  menorBadgeText: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  pacienteNome: { fontSize: 14, fontWeight: '700', color: colors.textHeader, marginBottom: 2 },
  pacienteSub: { fontSize: 12, color: colors.textSecondary },
  textWhite: { color: '#FFF' },
  textWhiteAlpha: { color: 'rgba(255,255,255,0.7)' },
  respBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  respInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  respText: { fontSize: 11, color: '#FFF', flex: 1 },
  addRespBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.3)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, gap: 4 },
  addRespText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  addRespBtnOptional: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, gap: 4 },
  addRespTextOptional: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600' },
  calendarWrapper: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 24, elevation: 1 },
  weekStrip: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, flexDirection: 'row', elevation: 1, marginBottom: 24, gap: 2 },
  dayCol: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 18, minWidth: 42 },
  dayColActive: { backgroundColor: colors.primary },
  dayColCycle: { backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary },
  dayText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  dayTextCycle: { color: colors.primary },
  dateNum: { color: colors.textHeader, fontSize: 16, fontWeight: '600' },
  legendRow: { fontSize: 12, marginBottom: 12 },
  legendFree: { color: '#10B981' },
  legendOcupado: { color: '#94A3B8' },
  legendSelected: { color: colors.primary },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  slotItem: { backgroundColor: '#FFF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center', minWidth: 80 },
  slotItemOcupado: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', opacity: 0.7 },
  slotItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontSize: 15, fontWeight: '700', color: colors.textHeader },
  slotTextOcupado: { color: '#94A3B8', fontWeight: '500' },
  slotTextActive: { color: '#FFF' },
  slotOcupadoHint: { fontSize: 9, color: '#94A3B8', marginTop: 2 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 8, elevation: 1, alignSelf: 'flex-start', marginBottom: 16 },
  stepperButton: { width: 48, height: 48, backgroundColor: '#F8FAFC', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepperValueBox: { alignItems: 'center', width: 80 },
  stepperValueText: { fontSize: 24, fontWeight: '800', color: colors.textHeader },
  stepperLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  cyclePreview: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  cyclePreviewTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, marginBottom: 10 },
  cycleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  cycleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  cycleDate: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  footerInfo: { backgroundColor: '#FFF', padding: 20, paddingBottom: 34, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 12, position: 'absolute', bottom: 0, left: 0, right: 0 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textHeader },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EAEEF3', borderRadius: 12, padding: 14, fontSize: 16, color: colors.textHeader },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
