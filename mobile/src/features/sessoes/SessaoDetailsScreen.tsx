import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform,
  Modal, ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../config/theme';
import { api } from '../../api/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const STATUS_CONFIG = {
  AGENDADA:  { cor: colors.primary, bg: '#EFF6FF', label: 'Agendada' },
  CONCLUIDA: { cor: '#10B981', bg: '#DCFCE7', label: 'Concluída' },
  FALTA:     { cor: '#EF4444', bg: '#FEE2E2', label: 'Falta' },
  CANCELADA: { cor: '#94A3B8', bg: '#F1F5F9', label: 'Cancelada' },
  REALIZADA: { cor: '#10B981', bg: '#DCFCE7', label: 'Realizada' },
};

export function SessaoDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { sessao } = route.params || {};
  const { user } = useAuthStore();

  const isGestorOrRoot = user?.perfil === 'GESTOR' || user?.perfil === 'ROOT';
  const isSupervisor = user?.perfil === 'SUPERVISOR';
  const isEstagiario = user?.perfil === 'ESTAGIARIO';
  const isPaciente = user?.perfil === 'PACIENTE';

  // Estados locais
  const [statusSessao, setStatusSessao] = useState<string>(sessao?.status || 'AGENDADA');
  const [evolucaoClinica, setEvolucaoClinica] = useState<string>(sessao?.notas || '');
  const [estagiarioSubstitutoId, setEstagiarioSubstitutoId] = useState<number | null>(sessao?.estagiarioSubstitutoId || null);
  const [estagiarioSubstitutoNome, setEstagiarioSubstitutoNome] = useState<string | null>(sessao?.estagiarioSubstitutoNome || null);
  const [supervisorNota, setSupervisorNota] = useState<string>(sessao?.supervisorNota || '');

  // Modais e carregamento
  const [substitutoModalVisible, setSubstitutoModalVisible] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingNotas, setIsSavingNotas] = useState(false);
  const [isSavingSubstituto, setIsSavingSubstituto] = useState(false);
  const [isSavingSupervisor, setIsSavingSupervisor] = useState(false);

  // Buscar estagiários ativos da clínica
  const { data: estagiarios, isLoading: isLoadingEstagiarios } = useQuery({
    queryKey: ['estagiarios-ativos'],
    queryFn: async () => (await api.get('/sessoes/estagiarios')).data,
    enabled: substitutoModalVisible
  });

  const pacientesNomes = sessao?.pacientes?.map((p: any) => p.nome).join(' · ') || 'Paciente não informado';
  const pacientesResp  = sessao?.pacientes?.filter((p: any) => p.responsavelNome).map((p: any) => `${p.nome}: ${p.responsavelNome}`);
  
  const temMenorSemResp = sessao?.pacientes?.some((p: any) => {
    const nasc = new Date(p.dataNascimento || '2010-01-01');
    const idade = new Date().getFullYear() - nasc.getFullYear();
    return idade < 18 && !p.responsavelNome;
  });

  const cfg = STATUS_CONFIG[statusSessao as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['AGENDADA'];
  const jaEncerrada = statusSessao === 'CONCLUIDA' || statusSessao === 'FALTA' || statusSessao === 'CANCELADA';

  // Handler de check-in de presença/falta
  const handleStatusChange = async (novoStatus: string) => {
    if (jaEncerrada) {
      return Alert.alert('Sessão já registrada', 'Esta sessão já teve seu desfecho registrado e não pode ser alterada.');
    }
    const desfechoLabel = novoStatus === 'CONCLUIDA' ? 'Compareceu' : 'Falta';
    
    const performStatusChange = async () => {
      setIsSavingStatus(true);
      try {
        await api.patch(`/sessoes/${sessao.id}/status`, { status: novoStatus, notas: evolucaoClinica });
        setStatusSessao(novoStatus);
        queryClient.invalidateQueries({ queryKey: ['meus-agendamentos'] });
        Alert.alert('Registrado!', novoStatus === 'CONCLUIDA'
          ? 'Presença confirmada. Bom trabalho!'
          : 'Falta registrada. O sistema monitorará faltas consecutivas automaticamente.'
        );
        navigation.goBack();
      } catch (e: any) {
        Alert.alert('Erro', e?.response?.data?.error || 'Falha ao registrar status.');
      } finally {
        setIsSavingStatus(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Deseja registrar "${desfechoLabel}" para esta sessão?`)) {
        performStatusChange();
      }
    } else {
      Alert.alert(
        novoStatus === 'CONCLUIDA' ? '✅ Confirmar Presença' : '❌ Registrar Falta',
        `${pacientesNomes}\n\nDeseja registrar "${desfechoLabel}" para esta sessão?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Confirmar', onPress: performStatusChange }
        ]
      );
    }
  };

  // Handler para salvar evolução clínica (notas) de forma independente
  const handleSaveNotas = async () => {
    setIsSavingNotas(true);
    try {
      await api.patch(`/sessoes/${sessao.id}/notas`, { notas: evolucaoClinica });
      queryClient.invalidateQueries({ queryKey: ['meus-agendamentos'] });
      Alert.alert('Sucesso', 'Evolução clínica salva com sucesso!');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Falha ao salvar anotações.');
    } finally {
      setIsSavingNotas(false);
    }
  };

  // Handler para salvar estagiário substituto
  const handleSaveSubstituto = async (subId: number | null, subNome: string | null) => {
    setIsSavingSubstituto(true);
    try {
      await api.patch(`/sessoes/${sessao.id}/substituto`, { estagiarioSubstitutoId: subId });
      setEstagiarioSubstitutoId(subId);
      setEstagiarioSubstitutoNome(subNome);
      setSubstitutoModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['meus-agendamentos'] });
      Alert.alert('Sucesso', 'Estagiário substituto atualizado com sucesso!');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Falha ao salvar substituto.');
    } finally {
      setIsSavingSubstituto(false);
    }
  };

  // Handler para salvar feedback da supervisão
  const handleSaveSupervisorNota = async () => {
    setIsSavingSupervisor(true);
    try {
      await api.patch(`/sessoes/${sessao.id}/supervisor-nota`, { supervisorNota });
      queryClient.invalidateQueries({ queryKey: ['meus-agendamentos'] });
      Alert.alert('Sucesso', 'Feedback da supervisão salvo com sucesso!');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Falha ao salvar feedback de supervisão.');
    } finally {
      setIsSavingSupervisor(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sessão — Detalhes</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ─── Card de Informações ─────────────────────────── */}
          <View style={styles.cardInfo}>
            {/* Status Badge */}
            <View style={[styles.statusBadgeTop, { backgroundColor: cfg.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: cfg.cor }]} />
              <Text style={[styles.statusBadgeText, { color: cfg.cor }]}>{cfg.label}</Text>
            </View>

            {/* Paciente(s) */}
            <Text style={styles.infoLabel}>Paciente(s)</Text>
            <Text style={styles.pacienteNome}>{pacientesNomes}</Text>

            {/* Alerta menor sem responsável */}
            {temMenorSemResp && (
              <View style={styles.alertBox}>
                <Ionicons name="warning" size={14} color="#EA580C" />
                <Text style={styles.alertText}>Menor de idade sem responsável cadastrado!</Text>
              </View>
            )}

            {/* Responsáveis */}
            {pacientesResp?.length > 0 && (
              <View style={styles.respBox}>
                {pacientesResp.map((r: string, i: number) => (
                  <Text key={i} style={styles.respText}>👤 {r}</Text>
                ))}
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Sala</Text>
                <Text style={styles.infoValue}>{sessao?.salaNome || '—'}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Horário</Text>
                <Text style={styles.infoValue}>{sessao?.horarioInicio} – {sessao?.horarioFim}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Data</Text>
                <Text style={styles.infoValue}>{sessao?.diaExtenso}, {sessao?.dia}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Tipo</Text>
                <Text style={styles.infoValue}>{sessao?.tipo === 'UNICO' ? 'Única' : 'Ciclo 10 sem.'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Estagiário Titular</Text>
                <Text style={styles.infoValue}>{sessao?.estagiarioNome || '—'}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Estagiário Substituto</Text>
                <Text style={[styles.infoValue, estagiarioSubstitutoNome && { color: '#D97706' }]}>
                  {estagiarioSubstitutoNome || 'Nenhum'}
                </Text>
              </View>
            </View>
          </View>

          {/* ─── Gestão de Substituto (Disponível para Estagiários e Gestores) ─── */}
          {!isPaciente && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔁 Estagiário Substituto</Text>
              <Text style={styles.sectionHint}>
                Designe um substituto caso o estagiário titular não possa comparecer.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setSubstitutoModalVisible(true)}
                >
                  <Ionicons name="people-outline" size={16} color="#FFF" />
                  <Text style={styles.smallBtnText}>Selecionar Substituto</Text>
                </TouchableOpacity>

                {estagiarioSubstitutoId && (
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleSaveSubstituto(null, null)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FFF" />
                    <Text style={styles.smallBtnText}>Remover</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* ─── Evolução Clínica (Anotações) ─────────────────── */}
          {!isPaciente && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Evolução Clínica</Text>
              <Text style={styles.sectionHint}>
                Descreva os acontecimentos da sessão e o progresso clínico do paciente.
              </Text>
              <TextInput
                style={styles.notasInput}
                placeholder="Descreva o que ocorreu na sessão, progressos, intercorrências..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={6}
                value={evolucaoClinica}
                onChangeText={setEvolucaoClinica}
              />
              <TouchableOpacity
                style={[styles.saveNotasBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveNotas}
                disabled={isSavingNotas}
              >
                {isSavingNotas ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFF" />
                    <Text style={styles.saveNotasText}>Salvar Anotações</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ─── Área de Supervisão (Feedback) ───────────────── */}
          {!isPaciente && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎓 Acompanhamento da Supervisão</Text>
              {isGestorOrRoot || isSupervisor ? (
                <>
                  <Text style={styles.sectionHint}>
                    Registre orientações, correções ou feedbacks sobre a evolução do estagiário.
                  </Text>
                  <TextInput
                    style={styles.notasInput}
                    placeholder="Deixe seu feedback de supervisão aqui..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                    value={supervisorNota}
                    onChangeText={setSupervisorNota}
                  />
                  <TouchableOpacity
                    style={[styles.saveNotasBtn, { backgroundColor: '#10B981' }]}
                    onPress={handleSaveSupervisorNota}
                    disabled={isSavingSupervisor}
                  >
                    {isSavingSupervisor ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="ribbon-outline" size={18} color="#FFF" />
                        <Text style={styles.saveNotasText}>Salvar Feedback de Supervisão</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.sectionHint}>Feedback técnico e pedagógico do supervisor clínico:</Text>
                  <View style={styles.supervisorFeedbackBox}>
                    <Ionicons name="ribbon" size={18} color={colors.primary} style={{ marginTop: 2 }} />
                    <Text style={styles.supervisorFeedbackText}>
                      {supervisorNota ? `"${supervisorNota}"` : 'Nenhum feedback registrado pelo supervisor ainda.'}
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ─── Check-in de Presença (Estagiários / Gestores) ────────────── */}
          {!jaEncerrada && !isPaciente && (
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Check-in de Presença</Text>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnSuccess]}
                onPress={() => handleStatusChange('CONCLUIDA')}
                disabled={isSavingStatus}
              >
                <Ionicons name="checkmark-circle" size={26} color="#FFF" />
                <View style={styles.btnTextBlock}>
                  <Text style={styles.btnTitle}>Confirmar Presença</Text>
                  <Text style={styles.btnSub}>Paciente compareceu à clínica</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.btnDanger]}
                onPress={() => handleStatusChange('FALTA')}
                disabled={isSavingStatus}
              >
                <Ionicons name="close-circle" size={26} color="#FFF" />
                <View style={styles.btnTextBlock}>
                  <Text style={styles.btnTitle}>Registrar Falta</Text>
                  <Text style={styles.btnSub}>Paciente não compareceu</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {jaEncerrada && !isPaciente && (
            <View style={[styles.encerradaBox, { borderColor: cfg.cor, backgroundColor: cfg.bg }]}>
              <Ionicons name={statusSessao === 'CONCLUIDA' ? 'checkmark-circle' : 'close-circle'} size={36} color={cfg.cor} />
              <Text style={[styles.encerradaTitle, { color: cfg.cor }]}>Sessão {cfg.label}</Text>
              <Text style={styles.encerradaSub}>Check-in de presença/falta já finalizado.</Text>
            </View>
          )}

          {/* Visualização de Pacientes de Faltas consecutivas */}
          {!jaEncerrada && !isPaciente && (
            <View style={styles.warningBox}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={styles.warningText}>
                O sistema cancelará as próximas sessões desse ciclo automaticamente caso o paciente acumule 2 faltas consecutivas.
              </Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL SELETOR DE SUBSTITUTO */}
      <Modal visible={substitutoModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Substituto</Text>
              <TouchableOpacity onPress={() => setSubstitutoModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {isLoadingEstagiarios ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {estagiarios?.map((e: any) => (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.substitutoListItem}
                    onPress={() => handleSaveSubstituto(e.id, e.nome)}
                  >
                    <Ionicons name="person" size={18} color={colors.primary} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.substitutoListNome}>{e.nome}</Text>
                      <Text style={styles.substitutoListMat}>Matrícula: {e.matricula}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {(!estagiarios || estagiarios.length === 0) && (
                  <Text style={styles.emptyText}>Nenhum estagiário ativo encontrado.</Text>
                )}
              </ScrollView>
            )}
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
  container: { padding: 20, paddingBottom: 60 },
  cardInfo: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 3, marginBottom: 16 },
  statusBadgeTop: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginBottom: 16, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  infoLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  pacienteNome: { fontSize: 22, fontWeight: '800', color: colors.textHeader, marginBottom: 8 },
  alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 8, padding: 8, gap: 6, marginBottom: 8 },
  alertText: { color: '#EA580C', fontSize: 12, fontWeight: '600', flex: 1 },
  respBox: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8, marginBottom: 4, gap: 4 },
  respText: { fontSize: 12, color: '#166534', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoCol: { flex: 1 },
  infoValue: { fontSize: 15, fontWeight: '600', color: colors.textHeader },
  section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primaryDark, marginBottom: 4 },
  sectionHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  notasInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: colors.textHeader, minHeight: 100, textAlignVertical: 'top', marginBottom: 12 },
  saveNotasBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  saveNotasText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, gap: 6 },
  smallBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  supervisorFeedbackBox: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: colors.primary, gap: 8, marginTop: 4 },
  supervisorFeedbackText: { flex: 1, fontSize: 13, color: colors.textHeader, fontStyle: 'italic', lineHeight: 18 },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, gap: 8, marginBottom: 16 },
  warningText: { flex: 1, fontSize: 12, color: colors.primary, lineHeight: 18 },
  actionsSection: { gap: 12, marginBottom: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16, elevation: 2, gap: 14 },
  btnSuccess: { backgroundColor: '#10B981' },
  btnDanger: { backgroundColor: '#EF4444' },
  btnTextBlock: { flex: 1 },
  btnTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  encerradaBox: { alignItems: 'center', borderRadius: 16, padding: 24, borderWidth: 2, marginBottom: 16, gap: 8 },
  encerradaTitle: { fontSize: 20, fontWeight: '800' },
  encerradaSub: { fontSize: 13, color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textHeader },
  substitutoListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  substitutoListNome: { fontSize: 15, fontWeight: '700', color: colors.textHeader },
  substitutoListMat: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }
});
