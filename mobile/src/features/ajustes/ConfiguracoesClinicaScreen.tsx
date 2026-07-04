import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../config/theme';
import { Button } from '../../components/Button';
import { api } from '../../api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';

const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function ConfiguracoesClinicaScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('22:00');
  const [isSaving, setIsSaving] = useState(false);

  // Buscar configurações da clínica
  const { data: config, isLoading } = useQuery({
    queryKey: ['configuracao-clinica'],
    queryFn: async () => (await api.get('/configuracao')).data
  });

  useEffect(() => {
    if (config) {
      setDiasSelecionados(JSON.parse(config.diasFuncionamento || '[]'));
      setHorarioInicio(config.horarioInicio || '08:00');
      setHorarioFim(config.horarioFim || '22:00');
    }
  }, [config]);

  const toggleDia = (dia: number) => {
    if (diasSelecionados.includes(dia)) {
      setDiasSelecionados(diasSelecionados.filter(d => d !== dia));
    } else {
      setDiasSelecionados([...diasSelecionados, dia].sort((a, b) => a - b));
    }
  };

  const handleSalvar = async () => {
    if (diasSelecionados.length === 0) {
      return Alert.alert('Atenção', 'Selecione pelo menos um dia de funcionamento.');
    }
    
    if (horarioInicio >= horarioFim) {
      return Alert.alert('Atenção', 'O horário de início deve ser menor que o horário de término.');
    }

    const message = 'Atenção!\n\nAlterar as configurações da clínica irá desmarcar e cancelar automaticamente todos os agendamentos e sessões ativas que estiverem fora do novo horário ou fora dos dias permitidos.\n\nDeseja salvar mesmo assim?';

    const saveChanges = async () => {
      setIsSaving(true);
      try {
        const response = await api.put('/configuracao', {
          horarioInicio,
          horarioFim,
          diasFuncionamento: JSON.stringify(diasSelecionados)
        });

        queryClient.invalidateQueries({ queryKey: ['configuracao-clinica'] });
        queryClient.invalidateQueries({ queryKey: ['disponibilidade'] });
        
        const cancelledCount = response.data.cancelledCount || 0;
        const successMsg = cancelledCount > 0
          ? `Configurações atualizadas! ${cancelledCount} agendamento(s) fora do período foram cancelados.`
          : 'Configurações atualizadas com sucesso!';

        if (Platform.OS === 'web') {
          alert(successMsg);
        } else {
          Alert.alert('Sucesso', successMsg);
        }
        navigation.goBack();
      } catch (error: any) {
        const errorMsg = error?.response?.data?.error || 'Erro ao salvar configurações.';
        if (Platform.OS === 'web') {
          alert(errorMsg);
        } else {
          Alert.alert('Erro', errorMsg);
        }
      } finally {
        setIsSaving(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        saveChanges();
      }
    } else {
      Alert.alert(
        'Confirmar Alterações',
        message,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salvar e Aplicar', style: 'destructive', onPress: saveChanges }
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações da Clínica</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dias de Funcionamento</Text>
          <Text style={styles.cardSub}>Selecione os dias da semana em que a clínica realiza agendamentos:</Text>
          
          <View style={styles.daysContainer}>
            {DAY_LABELS.map((label, index) => {
              const active = diasSelecionados.includes(index);
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayButton, active && styles.dayButtonActive]}
                  onPress={() => toggleDia(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayText, active && styles.dayTextActive]}>{label}</Text>
                  <Text style={styles.daySubName}>{DAY_NAMES[index].substring(0, 3)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Horário de Funcionamento</Text>
          <Text style={styles.cardSub}>Selecione a faixa horária permitida para agendamentos na clínica:</Text>

          <Text style={styles.fieldLabel}>Horário de Abertura</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={horarioInicio}
              onValueChange={(itemValue) => setHorarioInicio(itemValue)}
              style={styles.picker}
            >
              {HOURS.slice(0, -1).map(hour => (
                <Picker.Item key={hour} label={hour} value={hour} />
              ))}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>Horário de Fechamento</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={horarioFim}
              onValueChange={(itemValue) => setHorarioFim(itemValue)}
              style={styles.picker}
            >
              {HOURS.slice(1).map(hour => (
                <Picker.Item key={hour} label={hour} value={hour} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={20} color="#D97706" style={{ marginRight: 8 }} />
          <Text style={styles.warningText}>
            Qualquer alteração de horário ou exclusão de dias de funcionamento cancelará de forma irreversível os agendamentos conflitantes das salas.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isSaving ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Button title="SALVAR CONFIGURAÇÕES" onPress={handleSalvar} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F5F8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F5F8' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#FFF', elevation: 2 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.textHeader },
  container: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textHeader, marginBottom: 6 },
  cardSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
  daysContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  dayButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  dayButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 15, fontWeight: '800', color: colors.textHeader },
  dayTextActive: { color: '#FFF' },
  daySubName: { fontSize: 8, color: colors.textSecondary, marginTop: 4, textTransform: 'uppercase', fontWeight: '700' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.textHeader, marginTop: 14, marginBottom: 8 },
  pickerContainer: { 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 12, 
    overflow: 'hidden',
    marginBottom: 10
  },
  picker: { 
    height: 50, 
    width: '100%',
    color: colors.textHeader
  },
  warningCard: { flexDirection: 'row', backgroundColor: '#FEF3C7', borderLeftWidth: 4, borderColor: '#D97706', borderRadius: 12, padding: 16, marginBottom: 20 },
  warningText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 18 },
  footer: { backgroundColor: '#FFF', padding: 20, paddingBottom: 34, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 12 }
});
