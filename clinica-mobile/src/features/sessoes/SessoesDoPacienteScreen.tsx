import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { useAuthStore } from '../../store/useAuthStore';

export function SessoesDoPacienteScreen() {
  const { user } = useAuthStore();

  const { data: sessoes, isLoading, refetch } = useQuery({ 
    queryKey: ['minhas-sessoes-paciente'], 
    queryFn: async () => {
      // Aqui idealmente consumiria uma rota tipo GET /paciente/minhas-sessoes
      // Por enquanto, faremos o mock visual da estrutura
      const { data } = await api.get('/meus-agendamentos').catch(() => ({ data: [] }));
      return data || [];
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Olá, {user?.nome?.split(' ')[0]}</Text>
        <Text style={styles.headerSub}>Acompanhe aqui seus próximos atendimentos</Text>
      </View>

      <View style={styles.container}>
        {isLoading ? (
           <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : sessoes.length === 0 ? (
           <View style={styles.emptyState}>
             <Ionicons name="medical-outline" size={64} color="#CBD5E1" />
             <Text style={styles.emptyText}>Você ainda não possui nenhum atendimento agendado ou vinculado a um estagiário.</Text>
           </View>
        ) : (
          <FlatList
            data={sessoes}
            keyExtractor={(item: any) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={refetch}
            refreshing={isLoading}
            renderItem={({ item }) => (
              <View style={styles.agendaCard}>
                <View style={styles.dateBadge}>
                  <Text style={styles.badgeDayName}>{item.diaExtenso || 'DIA'}</Text>
                  <Text style={styles.badgeDayNum}>{item.dia || '--'}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.timeText}>{item.horarioInicio} - {item.horarioFim}</Text>
                  <Text style={styles.roomText}>Sala: {item.salaNome}</Text>
                  <Text style={styles.internText}>Psicólogo(a): {item.estagiarioNome || 'A definir'}</Text>
                  <View style={styles.typeTag}>
                    <Text style={styles.typeTagText}>Sessão Confirmada</Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F5F8' },
  header: { padding: 24, paddingTop: 32, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EAEEF3' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.primaryDark },
  headerSub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  container: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 100 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, paddingBottom: 100 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 16, lineHeight: 22 },
  agendaCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset:{width:0, height:2}, elevation: 2 },
  dateBadge: { backgroundColor: '#F8FAFC', borderRadius: 12, width: 56, height: 64, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: '#EAEEF3' },
  badgeDayName: { fontSize: 12, color: colors.primary, fontWeight: '700', textTransform: 'uppercase' },
  badgeDayNum: { fontSize: 20, color: colors.textHeader, fontWeight: '800' },
  cardInfo: { flex: 1 },
  timeText: { fontSize: 15, fontWeight: '700', color: colors.textHeader, marginBottom: 4 },
  roomText: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  internText: { fontSize: 13, color: colors.textSecondary, marginBottom: 8, fontStyle: 'italic' },
  typeTag: { alignSelf: 'flex-start', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeTagText: { fontSize: 11, color: '#059669', fontWeight: '600' }
});
