import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { colors, spacing, shadows } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { useNavigation } from '@react-navigation/native';

const PERFIL_LABELS: Record<string, string> = {
  PACIENTE: 'Paciente',
  ESTAGIARIO: 'Estagiário',
  GESTOR: 'Gestor',
  ROOT: 'Administrador'
};

const PERFIL_COLORS: Record<string, { bg: string; text: string }> = {
  PACIENTE:  { bg: '#F1F5F9', text: '#64748B' },
  ESTAGIARIO:{ bg: '#EFF6FF', text: colors.primary },
  GESTOR:    { bg: '#F0FDF4', text: '#16A34A' },
  ROOT:      { bg: '#FDF4FF', text: '#9333EA' }
};

function MenuRow({ icon, label, sublabel, onPress, danger = false }: {
  icon: any; label: string; sublabel?: string; onPress?: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? colors.errorLight : colors.infoLight }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, danger && { color: colors.error }]}>{label}</Text>
        {sublabel && <Text style={styles.menuSub}>{sublabel}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export function AjustesScreen() {
  const { user, logout } = useAuthStore();
  const navigation = useNavigation<any>();

  const perfilCfg = PERFIL_COLORS[user?.perfil || 'PACIENTE'];
  const perfilLabel = PERFIL_LABELS[user?.perfil || 'PACIENTE'];

  // Buscar métricas do estagiário se aplicável
  const isEstagiario = user?.perfil === 'ESTAGIARIO';
  const isGestorOrRoot = user?.perfil === 'GESTOR' || user?.perfil === 'ROOT';

  const { data: metricas } = useQuery({
    queryKey: ['dashboard-metricas'],
    queryFn: async () => (await api.get('/dashboard/metricas')).data,
    enabled: isGestorOrRoot
  });

  const { data: meusAgendamentos } = useQuery({
    queryKey: ['meus-agendamentos'],
    queryFn: async () => (await api.get('/meus-agendamentos')).data,
    enabled: isEstagiario
  });

  const sessoesHoje = meusAgendamentos?.filter((a: any) => {
    const hoje = new Date().toISOString().split('T')[0];
    return a.dataRaw === hoje;
  });

  const sessoesSemana = meusAgendamentos?.length || 0;

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Tem certeza que deseja encerrar a sessão?')) {
        logout();
      }
    } else {
      Alert.alert('Sair da Conta', 'Tem certeza que deseja encerrar a sessão?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: async () => { await logout(); } }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ─── Cabeçalho ─────────────────────────────── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Configurações</Text>
        </View>

        {/* ─── Hero do Perfil ─────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <Text style={styles.avatarText}>{user?.nome?.substring(0, 2).toUpperCase() || 'US'}</Text>
          </View>
          <Text style={styles.userName}>{user?.nome || 'Usuário'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'email@exemplo.com'}</Text>
          <View style={[styles.perfilBadge, { backgroundColor: perfilCfg.bg }]}>
            <Text style={[styles.perfilText, { color: perfilCfg.text }]}>{perfilLabel}</Text>
          </View>
        </View>

        {/* ─── Métricas do Estagiário ─────────────────── */}
        {isEstagiario && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Minhas Métricas</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{sessoesHoje?.length || 0}</Text>
                <Text style={styles.statLabel}>Hoje</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{sessoesSemana}</Text>
                <Text style={styles.statLabel}>Esta Semana</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#10B981' }]}>
                  {meusAgendamentos?.filter((a: any) => a.status === 'CONCLUIDA').length || 0}
                </Text>
                <Text style={styles.statLabel}>Concluídas</Text>
              </View>
            </View>
          </View>
        )}


        {/* ─── Configurações Específicas por Perfil ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {user?.perfil === 'PACIENTE' ? 'Meu Tratamento' : 
             user?.perfil === 'ESTAGIARIO' ? 'Minha Rotina Clínica' : 
             'Administração'}
          </Text>

          {/* Menus do Paciente */}
          {user?.perfil === 'PACIENTE' && (
            <>
              <MenuRow icon="document-text-outline" label="Meu Prontuário" sublabel="Ver histórico e atestados" onPress={() => Alert.alert('Em desenvolvimento', 'Seu prontuário eletrônico estará disponível em breve.')} />
              <MenuRow icon="chatbubble-ellipses-outline" label="Falar com Responsável" sublabel="Contato com seu estagiário" onPress={() => Alert.alert('Em desenvolvimento', 'O chat integrado será lançado na próxima versão.')} />
            </>
          )}

          {/* Menus do Estagiário */}
          {isEstagiario && (
            <>
              <MenuRow icon="calendar-outline" label="Minha Grade de Horários" sublabel="Gerenciar dias e horários livres" onPress={() => navigation.navigate('GradeHorarios')} />
              <MenuRow icon="person-add-outline" label="Meus Pacientes" sublabel="Lista e ficha clínica" onPress={() => navigation.navigate('Pacientes')} />
              <MenuRow icon="ribbon-outline" label="Supervisão" sublabel="Notas e relatórios do supervisor" onPress={() => navigation.navigate('Supervisao')} />
            </>
          )}

          {/* Menus do Gestor/Root */}
          {isGestorOrRoot && (
            <>
              <MenuRow icon="business-outline" label="Configurações da Clínica" sublabel="Horários de funcionamento e regras" onPress={() => navigation.navigate('ConfiguracoesClinica')} />
              <MenuRow icon="shield-checkmark-outline" label="Gestão de Acessos" sublabel="Aprovar e gerenciar usuários" onPress={() => navigation.navigate('GestaoAcessos')} />
              <MenuRow icon="download-outline" label="Exportar Relatórios" sublabel="Dados gerenciais em PDF/Excel" onPress={() => navigation.navigate('Relatorios')} />
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta e App</Text>
          <MenuRow icon="person-outline" label="Informações Pessoais" sublabel="Editar meus dados" onPress={() => navigation.navigate('Perfil')} />
          <MenuRow icon="notifications-outline" label="Notificações" sublabel="Alertas de sessão e pendências" onPress={() => navigation.navigate('Notificacoes')} />
          <MenuRow icon="information-circle-outline" label="Sobre o App" sublabel="Versão 1.0.0 — Psicologia SEP" onPress={() => Alert.alert('Sobre', 'App desenvolvido para a Clínica Escola de Psicologia.\nVersão: 1.0.0')} />
        </View>

        {/* ─── Logout ─────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Psicologia SEP · Sistema de Gestão Clínica</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingBottom: 100 },
  pageHeader: { paddingHorizontal: spacing.xl, paddingTop: 28, paddingBottom: 4 },
  pageTitle: { fontSize: 30, fontWeight: '800', color: colors.primaryDark },
  profileCard: { backgroundColor: colors.surface, margin: spacing.xl, marginTop: 16, borderRadius: 24, padding: 24, alignItems: 'center', ...shadows.card },
  avatarWrapper: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center', marginBottom: 14, ...shadows.btn },
  avatarText: { fontSize: 30, fontWeight: '900', color: '#FFF' },
  userName: { fontSize: 22, fontWeight: '800', color: colors.textHeader },
  userEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  perfilBadge: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  perfilText: { fontSize: 13, fontWeight: '700' },
  section: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, backgroundColor: colors.surface, borderRadius: 18, padding: spacing.lg, ...shadows.card },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: colors.inputBackground, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.textHeader },
  statLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: colors.textHeader },
  menuSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: spacing.xl, backgroundColor: colors.errorLight, borderRadius: 16, padding: spacing.lg, gap: 10 },
  logoutText: { fontSize: 16, fontWeight: '700', color: colors.error },
  footer: { textAlign: 'center', fontSize: 12, color: colors.textMuted, marginBottom: 8 }
});
