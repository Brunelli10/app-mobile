import React, { useCallback } from 'react';
import { ActivityIndicator, Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { colors, shadows, spacing } from '../../config/theme';

const formatNextSession = (session?: any) => {
  if (!session?.dataRaw) return 'Nenhuma proxima sessao agendada';
  const date = new Date(session.dataRaw + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });
  return `${date} · ${session.horarioInicio} - ${session.horarioFim} · ${session.salaNome}`;
};

export function ContatoResponsavelScreen() {
  const navigation = useNavigation<any>();
  const { data: sessoes = [], isLoading, refetch } = useQuery({
    queryKey: ['contato-responsavel'],
    queryFn: async () => {
      const { data } = await api.get('/meus-agendamentos');
      return data || [];
    }
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const hoje = new Date().toISOString().split('T')[0];
  const proximas = sessoes
    .filter((s: any) => s.dataRaw >= hoje && !['CANCELADA', 'FALTA'].includes(s.status))
    .sort((a: any, b: any) => String(a.dataRaw).localeCompare(String(b.dataRaw)));
  const proximaSessao = proximas[0];
  const responsavelNome = proximaSessao?.estagiarioNome || sessoes.find((s: any) => s.estagiarioNome)?.estagiarioNome || 'Responsavel a definir';
  const initials = responsavelNome.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase();

  const openMail = () => {
    Linking.openURL(`mailto:?subject=Contato pelo app Psicologia SEP&body=Ola, ${responsavelNome}.`);
  };

  const openPhone = () => {
    Linking.openURL('tel:');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeader} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Falar com Responsavel</Text>
          <Text style={styles.headerSub}>Contato do profissional vinculado ao seu atendimento</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 56 }} />
      ) : (
        <View style={styles.container}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || 'PS'}</Text>
            </View>
            <Text style={styles.name}>{responsavelNome}</Text>
            <Text style={styles.role}>Estagiario responsavel</Text>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton} onPress={openMail}>
                <Ionicons name="mail-outline" size={18} color="#FFF" />
                <Text style={styles.actionText}>Enviar E-mail</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.phoneButton]} onPress={openPhone}>
                <Ionicons name="call-outline" size={18} color="#FFF" />
                <Text style={styles.actionText}>Ligar/WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="calendar-clear-outline" size={20} color={colors.primary} />
              <Text style={styles.infoTitle}>Proxima sessao</Text>
            </View>
            <Text style={styles.infoText}>{formatNextSession(proximaSessao)}</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.infoTitle}>Orientacao</Text>
            </View>
            <Text style={styles.infoText}>Use estes canais para assuntos relacionados ao seu acompanhamento e reagendamentos.</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, padding: spacing.xl, paddingTop: 28, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.primaryDark },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  container: { padding: spacing.xl },
  profileCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 22, alignItems: 'center', ...shadows.card },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { fontSize: 26, fontWeight: '900', color: '#FFF' },
  name: { fontSize: 20, fontWeight: '800', color: colors.textHeader, textAlign: 'center' },
  role: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionButton: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 10 },
  phoneButton: { backgroundColor: '#059669' },
  actionText: { color: '#FFF', fontWeight: '800', fontSize: 12, textAlign: 'center' },
  infoCard: { marginTop: 14, backgroundColor: colors.surface, borderRadius: 16, padding: 16, ...shadows.card },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: colors.textHeader },
  infoText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 }
});
