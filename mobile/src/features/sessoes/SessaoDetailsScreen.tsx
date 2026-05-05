import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../config/theme';
import { api } from '../../api/apiClient';
import { useAuthStore } from '../../store/useAuthStore';

const STATUS_CONFIG = {
  CONCLUIDA: { cor: '#10B981', bg: '#DCFCE7', label: 'Concluída' },
  FALTA:     { cor: '#EF4444', bg: '#FEE2E2', label: 'Falta' },
  CANCELADA: { cor: '#94A3B8', bg: '#F1F5F9', label: 'Cancelada' },
  REALIZADA: { cor: colors.primary, bg: '#EFF6FF', label: 'Agendada' },
};

export function SessaoDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { sessao } = route.params || {};
  const { user } = useAuthStore();

  const [statusSessao, setStatusSessao] = useState<string>(sessao?.status || 'REALIZADA');
  const [evolucaoClinica, setEvolucaoClinica] = useState(sessao?.notas || '');
  const [isSaving, setIsSaving] = useState(false);

  // Dados reais do paciente vindos do backend
  const pacientesNomes = sessao?.pacientes?.map((p: any) => p.nome).join(' · ') || 'Paciente não informado';
  const pacientesResp  = sessao?.pacientes?.filter((p: any) => p.responsavelNome).map((p: any) => `${p.nome}: ${p.responsavelNome}`);
  const temMenorSemResp = sessao?.pacientes?.some((p: any) => {
    const nasc = new Date(p.dataNascimento || '2010-01-01');
    const idade = new Date().getFullYear() - nasc.getFullYear();
    return idade < 18 && !p.responsavelNome;
  });

  const cfg = STATUS_CONFIG[statusSessao as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['REALIZADA'];
  const jaEncerrada = statusSessao === 'CONCLUIDA' || statusSessao === 'FALTA' || statusSessao === 'CANCELADA';

  const handleStatusChange = async (novoStatus: string) => {
    if (jaEncerrada) {
      return Alert.alert('Sessão já registrada', 'Esta sessão já teve seu desfecho registrado e não pode ser alterada.');
    }
    Alert.alert(
      novoStatus === 'CONCLUIDA' ? '✅ Confirmar Presença' : '❌ Registrar Falta',
      `${pacientesNomes}\n\nDeseja registrar "${novoStatus === 'CONCLUIDA' ? 'Compareceu' : 'Falta'}" para esta sessão?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setIsSaving(true);
            try {
              await api.patch(`/sessoes/${sessao.id}/status`, { status: novoStatus, notas: evolucaoClinica });
              setStatusSessao(novoStatus);
              Alert.alert('Registrado!', novoStatus === 'CONCLUIDA'
                ? 'Presença confirmada. Bom trabalho!'
                : 'Falta registrada. O sistema monitorará faltas consecutivas automaticamente.'
              );
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Erro', e?.response?.data?.error || 'Falha ao registrar status.');
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  const isGestorOrRoot = user?.perfil === 'GESTOR' || user?.perfil === 'ROOT';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sessão — Check-in</Text>
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
          </View>

          {/* ─── Evolução Clínica ─────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Evolução Clínica</Text>
            <Text style={styles.sectionHint}>
              {jaEncerrada ? 'Anotações salvas para esta sessão:' : 'Registre as observações antes de confirmar o desfecho.'}
            </Text>
            <TextInput
              style={[styles.notasInput, jaEncerrada && styles.notasInputDisabled]}
              placeholder="Descreva o que ocorreu na sessão, progressos, intercorrências..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={5}
              value={evolucaoClinica}
              onChangeText={setEvolucaoClinica}
              editable={!jaEncerrada}
            />
          </View>

          {/* ─── Aviso de Cancelamento Automático ────────────── */}
          {!jaEncerrada && (
            <View style={styles.warningBox}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={styles.warningText}>
                O sistema cancela automaticamente sessões futuras após 2 faltas consecutivas.
              </Text>
            </View>
          )}

          {/* ─── Ações (apenas Estagiário e para sessões abertas) ── */}
          {!jaEncerrada ? (
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Registrar Desfecho</Text>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnSuccess]}
                onPress={() => handleStatusChange('CONCLUIDA')}
                disabled={isSaving}
              >
                <Ionicons name="checkmark-circle" size={26} color="#FFF" />
                <View style={styles.btnTextBlock}>
                  <Text style={styles.btnTitle}>Paciente Compareceu</Text>
                  <Text style={styles.btnSub}>Presença confirmada na sessão</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.btnDanger]}
                onPress={() => handleStatusChange('FALTA')}
                disabled={isSaving}
              >
                <Ionicons name="close-circle" size={26} color="#FFF" />
                <View style={styles.btnTextBlock}>
                  <Text style={styles.btnTitle}>Registrar Falta</Text>
                  <Text style={styles.btnSub}>Paciente não compareceu</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            // Sessão já encerrada — mostra apenas o resultado
            <View style={[styles.encerradaBox, { borderColor: cfg.cor, backgroundColor: cfg.bg }]}>
              <Ionicons name={statusSessao === 'CONCLUIDA' ? 'checkmark-circle' : 'close-circle'} size={36} color={cfg.cor} />
              <Text style={[styles.encerradaTitle, { color: cfg.cor }]}>Sessão {cfg.label}</Text>
              <Text style={styles.encerradaSub}>Este registro não pode ser alterado.</Text>
            </View>
          )}

          {/* ─── Visão do Gestor: acesso rápido ao perfil ─────── */}
          {isGestorOrRoot && sessao?.pacientes?.length > 0 && (
            <View style={styles.gestorBox}>
              <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
              <Text style={styles.gestorText}>Visão Gerencial: {sessao.pacientes.length} paciente(s) nesta sessão</Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primaryDark, marginBottom: 6 },
  sectionHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
  notasInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: colors.textHeader, minHeight: 120, textAlignVertical: 'top' },
  notasInputDisabled: { opacity: 0.7, backgroundColor: '#F1F5F9' },
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
  gestorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, gap: 8, marginTop: 4 },
  gestorText: { fontSize: 12, color: colors.primary, fontWeight: '600' }
});
