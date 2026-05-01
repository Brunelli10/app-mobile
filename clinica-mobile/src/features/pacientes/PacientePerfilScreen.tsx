import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { colors } from '../../config/theme';

const STATUS_CONFIG: Record<string, { cor: string; label: string; bg: string }> = {
  CONCLUIDA: { cor: '#10B981', label: 'Realizada', bg: '#DCFCE7' },
  FALTA:     { cor: '#EF4444', label: 'Falta',     bg: '#FEE2E2' },
  CANCELADA: { cor: '#94A3B8', label: 'Cancelada', bg: '#F1F5F9' },
  REALIZADA: { cor: colors.primary, label: 'Agendada',  bg: '#EFF6FF' },
};

const calcIdade = (dataNasc: string): number => {
  if (!dataNasc) return 0;
  const nasc = new Date(dataNasc);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
};

export function PacientePerfilScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { pacienteId } = route.params || {};

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['paciente-perfil', pacienteId],
    queryFn: async () => (await api.get(`/pacientes/${pacienteId}/perfil`)).data,
    enabled: !!pacienteId
  });

  const idade = perfil ? calcIdade(perfil.dataNascimento) : 0;
  const isMenor = idade < 18;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ficha do Paciente</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ─── Hero Card ─────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{perfil?.nome?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.heroNome}>{perfil?.nome}</Text>
          <Text style={styles.heroSub}>{idade} anos · {perfil?.tipoAtendimento}</Text>
          {isMenor && (
            <View style={styles.menorBadge}>
              <Ionicons name="alert-circle" size={12} color="#D97706" />
              <Text style={styles.menorBadgeText}>Menor de idade</Text>
            </View>
          )}
        </View>

        {/* ─── Stats ────────────────────────────────── */}
        {perfil?.stats && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{perfil.stats.totalSessoes}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{perfil.stats.presencas}</Text>
              <Text style={styles.statLabel}>Presenças</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{perfil.stats.faltas}</Text>
              <Text style={styles.statLabel}>Faltas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{perfil.stats.taxaPresenca}%</Text>
              <Text style={styles.statLabel}>Presença</Text>
            </View>
          </View>
        )}

        {/* ─── Dados Pessoais ───────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Pessoais</Text>
          <InfoRow icon="card-outline" label="CPF" value={perfil?.cpf || '—'} />
          <InfoRow icon="call-outline" label="Telefone" value={perfil?.telefone || '—'} />
          <InfoRow icon="calendar-outline" label="Nascimento" value={perfil?.dataNascimento ? new Date(perfil.dataNascimento).toLocaleDateString('pt-BR') : '—'} />
        </View>

        {/* ─── Responsável ──────────────────────────── */}
        {(isMenor || perfil?.responsavelNome) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Responsável {isMenor ? '(Obrigatório)' : ''}</Text>
            {perfil?.responsavelNome ? (
              <>
                <InfoRow icon="person-outline" label="Nome" value={perfil.responsavelNome} />
                {perfil.responsavelTelefone && <InfoRow icon="call-outline" label="Telefone" value={perfil.responsavelTelefone} />}
                {perfil.responsavelCpf && <InfoRow icon="card-outline" label="CPF" value={perfil.responsavelCpf} />}
              </>
            ) : (
              <View style={styles.alertBox}>
                <Ionicons name="warning" size={16} color="#EA580C" />
                <Text style={styles.alertText}>Responsável não cadastrado!</Text>
              </View>
            )}
          </View>
        )}

        {/* ─── Histórico de Sessões ─────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico de Sessões</Text>
          {!perfil?.sessoes?.length ? (
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>Nenhuma sessão registrada</Text>
            </View>
          ) : (
            perfil.sessoes.map((s: any) => {
              const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG['REALIZADA'];
              return (
                <View key={s.id} style={styles.sessaoCard}>
                  <View style={[styles.sessaoAccent, { backgroundColor: cfg.cor }]} />
                  <View style={styles.sessaoBody}>
                    <View style={styles.sessaoTop}>
                      <Text style={styles.sessaoData}>
                        {new Date(s.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.statusText, { color: cfg.cor }]}>{cfg.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.sessaoSala}>{s.sala} · {s.estagiario}</Text>
                    {s.notas && <Text style={styles.sessaoNotas} numberOfLines={2}>"{s.notas}"</Text>}
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.primary} style={{ width: 24 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F5F8' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#FFF', elevation: 2 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.textHeader },
  container: { padding: 20, paddingBottom: 100 },
  heroCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center', elevation: 3, marginBottom: 16 },
  heroAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  heroAvatarText: { color: '#FFF', fontSize: 32, fontWeight: '800' },
  heroNome: { fontSize: 22, fontWeight: '800', color: colors.textHeader, marginBottom: 4 },
  heroSub: { fontSize: 14, color: colors.textSecondary },
  menorBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, gap: 4, marginTop: 8 },
  menorBadgeText: { fontSize: 12, fontWeight: '600', color: '#D97706' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.textHeader },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 4 },
  section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primaryDark, marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  infoLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', width: 80 },
  infoValue: { flex: 1, fontSize: 14, color: colors.textHeader, fontWeight: '500' },
  alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 10, padding: 12, gap: 8 },
  alertText: { color: '#EA580C', fontSize: 13, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: colors.textSecondary, marginTop: 8 },
  sessaoCard: { flexDirection: 'row', marginBottom: 10, backgroundColor: '#FAFAFA', borderRadius: 12, overflow: 'hidden' },
  sessaoAccent: { width: 4 },
  sessaoBody: { flex: 1, padding: 12, gap: 4 },
  sessaoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessaoData: { fontSize: 13, fontWeight: '700', color: colors.textHeader },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  sessaoSala: { fontSize: 12, color: colors.textSecondary },
  sessaoNotas: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 }
});
