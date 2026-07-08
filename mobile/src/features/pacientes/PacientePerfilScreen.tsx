import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, Platform } from 'react-native';
import { TextInputMask } from 'react-native-masked-text';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { colors } from '../../config/theme';
import { useAuthStore } from '../../store/useAuthStore';

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
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { pacienteId } = route.params || {};
  const { user } = useAuthStore();

  const isGestorOrRoot = user?.perfil === 'GESTOR' || user?.perfil === 'ROOT';
  const canEditOrInactivate = ['ESTAGIARIO', 'GESTOR', 'ROOT'].includes(user?.perfil || '');

  // Query para perfil
  const { data: perfil, isLoading } = useQuery({
    queryKey: ['paciente-perfil', pacienteId],
    queryFn: async () => (await api.get(`/pacientes/${pacienteId}/perfil`)).data,
    enabled: !!pacienteId
  });

  // Modais de Edição
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estados dos campos de edição
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [tipoAtendimento, setTipoAtendimento] = useState('ADULTO');
  const [respNome, setRespNome] = useState('');
  const [respTelefone, setRespTelefone] = useState('');
  const [respCpf, setRespCpf] = useState('');
  const [parceiroNome, setParceiroNome] = useState('');
  const [parceiroCpf, setParceiroCpf] = useState('');
  const [parceiroTelefone, setParceiroTelefone] = useState('');

  const idadeCalculada = dataNascimento ? calcIdade(dataNascimento) : 0;
  const isMenorEdicao = dataNascimento.length >= 10 && idadeCalculada < 18;

  const handleInativar = () => {
    const msg = `Tem certeza que deseja inativar o paciente "${perfil?.nome}"?\n\nEle não aparecerá na lista de ativos, mas o histórico de sessões será preservado no sistema.`;

    const performInativacao = async () => {
      try {
        await api.delete(`/pacientes/${pacienteId}`);
        queryClient.invalidateQueries({ queryKey: ['pacientes'] });
        if (Platform.OS === 'web') {
          alert('Paciente inativado com sucesso.');
        } else {
          Alert.alert('Sucesso', 'Paciente inativado com sucesso.');
        }
        navigation.goBack();
      } catch (e: any) {
        if (Platform.OS === 'web') {
          alert(e.response?.data?.error || 'Erro ao inativar.');
        } else {
          Alert.alert('Erro', e.response?.data?.error || 'Erro ao inativar.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        performInativacao();
      }
    } else {
      Alert.alert(
        'Confirmar Inativação',
        msg,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Inativar', style: 'destructive', onPress: performInativacao }
        ]
      );
    }
  };

  const handleEditPaciente = async () => {
    if (!nome || !cpf || !telefone || !dataNascimento) {
      return Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
    }

    if (nome.trim().length < 3) {
      return Alert.alert('Nome Inválido', 'O nome deve ter ao menos 3 caracteres.');
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return Alert.alert('CPF Inválido', 'O CPF deve conter exatamente 11 dígitos numéricos.');
    }

    const cleanTelefone = telefone.replace(/\D/g, '');
    if (cleanTelefone.length < 10 || cleanTelefone.length > 11) {
      return Alert.alert('Telefone Inválido', 'O telefone deve conter 10 ou 11 dígitos numéricos (com DDD).');
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataNascimento)) {
      return Alert.alert('Data de Nascimento Inválida', 'A data deve estar no formato DD/MM/YYYY (ex: 15/06/1990).');
    }

    const [dayStr, monthStr, yearStr] = dataNascimento.split('/');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const dateObj = new Date(year, month, day);
    if (
      dateObj.getFullYear() !== year ||
      dateObj.getMonth() !== month ||
      dateObj.getDate() !== day ||
      dateObj > new Date()
    ) {
      return Alert.alert('Data de Nascimento Inválida', 'Insira uma data de nascimento real e no passado.');
    }

    const backendDataNascimento = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const age = calcIdade(backendDataNascimento);
    const isMenorDeIdade = age < 18;

    let cleanRespTel = '';
    let cleanParcCpf = '';
    let cleanParcTel = '';

    // Se menor, responsável é obrigatório
    if (isMenorDeIdade) {
      if (!respNome || !respTelefone) {
        return Alert.alert('Responsável Obrigatório', `O paciente tem ${age} anos (menor de idade).\nNome e Telefone do responsável são obrigatórios.`);
      }
      if (respNome.trim().length < 3) {
        return Alert.alert('Responsável Inválido', 'O nome do responsável deve ter ao menos 3 caracteres.');
      }
      cleanRespTel = respTelefone.replace(/\D/g, '');
      if (cleanRespTel.length < 10 || cleanRespTel.length > 11) {
        return Alert.alert('Telefone do Responsável Inválido', 'O telefone do responsável deve conter 10 ou 11 dígitos numéricos.');
      }
      if (respCpf) {
        const cleanRespCpf = respCpf.replace(/\D/g, '');
        if (cleanRespCpf.length !== 11) {
          return Alert.alert('CPF do Responsável Inválido', 'O CPF do responsável deve conter exatamente 11 dígitos numéricos.');
        }
      }
    }

    // Se Casal, parceiro é obrigatório
    if (tipoAtendimento === 'CASAL') {
      if (!parceiroNome || !parceiroCpf || !parceiroTelefone) {
        return Alert.alert('Cônjuge/Parceiro(a) Obrigatório', 'Para atendimento de casal, Nome, CPF e Telefone do cônjuge/parceiro são obrigatórios.');
      }
      if (parceiroNome.trim().length < 3) {
        return Alert.alert('Cônjuge/Parceiro(a) Inválido', 'O nome do cônjuge/parceiro deve ter ao menos 3 caracteres.');
      }
      cleanParcCpf = parceiroCpf.replace(/\D/g, '');
      if (cleanParcCpf.length !== 11) {
        return Alert.alert('CPF do Cônjuge/Parceiro Inválido', 'O CPF do cônjuge/parceiro deve conter exatamente 11 dígitos numéricos.');
      }
      cleanParcTel = parceiroTelefone.replace(/\D/g, '');
      if (cleanParcTel.length < 10 || cleanParcTel.length > 11) {
        return Alert.alert('Telefone do Cônjuge/Parceiro Inválido', 'O telefone do cônjuge/parceiro deve conter 10 ou 11 dígitos numéricos.');
      }
    }

    setIsSaving(true);
    try {
      await api.put(`/pacientes/${pacienteId}`, {
        nome,
        cpf: cleanCpf,
        telefone: cleanTelefone,
        dataNascimento: backendDataNascimento,
        tipoAtendimento,
        responsavelNome: isMenorDeIdade ? respNome : null,
        responsavelCpf: isMenorDeIdade && respCpf ? respCpf.replace(/\D/g, '') : null,
        responsavelTelefone: isMenorDeIdade ? cleanRespTel : null,
        parceiroNome: tipoAtendimento === 'CASAL' ? parceiroNome : null,
        parceiroCpf: tipoAtendimento === 'CASAL' ? cleanParcCpf : null,
        parceiroTelefone: tipoAtendimento === 'CASAL' ? cleanParcTel : null
      });
      queryClient.invalidateQueries({ queryKey: ['paciente-perfil', pacienteId] });
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      setEditModalVisible(false);
      Alert.alert('Sucesso', 'Paciente atualizado com sucesso!');
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Erro ao atualizar.');
    } finally {
      setIsSaving(false);
    }
  };

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
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {canEditOrInactivate && (
            <TouchableOpacity onPress={() => {
              setNome(perfil?.nome || '');
              setCpf(perfil?.cpf || '');
              setTelefone(perfil?.telefone || '');
              
              if (perfil?.dataNascimento) {
                const [y, m, d] = perfil.dataNascimento.split('T')[0].split('-');
                setDataNascimento(`${d}/${m}/${y}`);
              } else {
                setDataNascimento('');
              }
              
              setTipoAtendimento(perfil?.tipoAtendimento || 'ADULTO');
              setRespNome(perfil?.responsavelNome || '');
              setRespTelefone(perfil?.responsavelTelefone || '');
              setRespCpf(perfil?.responsavelCpf || '');
              setParceiroNome(perfil?.parceiroNome || '');
              setParceiroCpf(perfil?.parceiroCpf || '');
              setParceiroTelefone(perfil?.parceiroTelefone || '');
              setEditModalVisible(true);
            }} style={styles.actionHeaderBtn}>
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
          {isGestorOrRoot && (
            <TouchableOpacity onPress={handleInativar} style={styles.actionHeaderBtn}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          )}
          {!canEditOrInactivate && !isGestorOrRoot && <View style={{ width: 40 }} />}
        </View>
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

        {/* ─── Agendamentos Ativos ──────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agendamentos Ativos</Text>
          {!perfil?.agendamentosAtivos?.length ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={36} color="#CBD5E1" />
              <Text style={styles.emptyText}>Sem agendamentos ativos na clínica</Text>
            </View>
          ) : (
            perfil.agendamentosAtivos.map((ag: any) => {
              const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
              const diaLabel = ag.diaSemana !== null && ag.diaSemana !== undefined ? dias[ag.diaSemana] : '';
              return (
                <View key={ag.id} style={styles.ativoCard}>
                  <Ionicons name="calendar" size={18} color={colors.primary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.ativoSala}>{ag.sala}</Text>
                    <Text style={styles.ativoDet}>
                      {ag.tipo === 'UNICO' ? `Data única: ${new Date(ag.dataEspecifica).toLocaleDateString('pt-BR')}` : `Semanal: ${diaLabel}`} às {ag.horarioInicio}
                    </Text>
                    <Text style={styles.ativoEst}>{ag.estagiario}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ─── Dados Pessoais ───────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {perfil?.tipoAtendimento === 'CASAL' ? 'Dados Pessoais (Primeiro Contato)' : 'Dados Pessoais'}
          </Text>
          <InfoRow icon="card-outline" label="CPF" value={perfil?.cpf || '—'} />
          <InfoRow icon="call-outline" label="Telefone" value={perfil?.telefone || '—'} />
          <InfoRow icon="calendar-outline" label="Nascimento" value={perfil?.dataNascimento ? new Date(perfil.dataNascimento).toLocaleDateString('pt-BR') : '—'} />
        </View>

        {/* ─── Cônjuge / Parceiro (Apenas Casal) ─────── */}
        {perfil?.tipoAtendimento === 'CASAL' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cônjuge / Parceiro(a)</Text>
            <InfoRow icon="person-outline" label="Nome" value={perfil?.parceiroNome || '—'} />
            <InfoRow icon="card-outline" label="CPF" value={perfil?.parceiroCpf || '—'} />
            <InfoRow icon="call-outline" label="Telefone" value={perfil?.parceiroTelefone || '—'} />
          </View>
        )}

        {/* ─── Responsável (Apenas Menor ou se preenchido) ── */}
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

      {/* MODAL DE EDIÇÃO DE PACIENTE */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Ficha do Paciente</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>
                {tipoAtendimento === 'CASAL' ? 'Nome (Quem iniciou o contato) *' : 'Nome Completo *'}
              </Text>
              <TextInput style={styles.input} value={nome} onChangeText={setNome} />

              <Text style={styles.inputLabel}>
                {tipoAtendimento === 'CASAL' ? 'CPF (Quem iniciou o contato) *' : 'CPF *'}
              </Text>
              <TextInputMask style={styles.input} type="custom" options={{ mask: '999.999.999-99' }} keyboardType="numeric" value={cpf} onChangeText={(text: string) => setCpf(text)} />

              <Text style={styles.inputLabel}>
                {tipoAtendimento === 'CASAL' ? 'Telefone (Quem iniciou o contato) *' : 'Telefone *'}
              </Text>
              <TextInputMask style={styles.input} type="custom" options={{ mask: '(99) 99999-9999' }} keyboardType="phone-pad" value={telefone} onChangeText={(text: string) => setTelefone(text)} />

              <Text style={styles.inputLabel}>
                {tipoAtendimento === 'CASAL' ? 'Data de Nascimento (Quem iniciou o contato) *' : 'Data de Nascimento *'}
              </Text>
              <TextInputMask style={styles.input} type="custom" options={{ mask: '99/99/9999' }} keyboardType="numeric" value={dataNascimento} onChangeText={(text: string) => setDataNascimento(text)} />

              {isMenorEdicao && (
                <View style={styles.alertBox}>
                  <Ionicons name="warning" size={18} color="#EA580C" />
                  <Text style={styles.alertText}>Menor de {idadeCalculada} anos — Responsável obrigatório!</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Tipo de Atendimento *</Text>
              <View style={styles.typeRow}>
                {['ADULTO', 'CRIANCA', 'CASAL'].map(tipo => (
                  <TouchableOpacity
                    key={tipo}
                    style={[styles.typeBtn, tipoAtendimento === tipo && styles.typeBtnActive]}
                    onPress={() => setTipoAtendimento(tipo)}
                  >
                    <Text style={[styles.typeText, tipoAtendimento === tipo && styles.typeTextActive]}>{tipo}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Responsável (Exibido apenas para Crianças ou Menores) */}
              {(isMenorEdicao || tipoAtendimento === 'CRIANCA') && (
                <View>
                  <View style={styles.sectionDivider}>
                    <Text style={styles.sectionLabel}>Responsável (Obrigatório ⚠️)</Text>
                  </View>

                  <Text style={styles.inputLabel}>Nome do Responsável *</Text>
                  <TextInput style={[styles.input, !respNome && styles.inputAlerta]} value={respNome} onChangeText={setRespNome} />

                  <Text style={styles.inputLabel}>Telefone do Responsável *</Text>
                  <TextInputMask style={[styles.input, !respTelefone && styles.inputAlerta]} type="custom" options={{ mask: '(99) 99999-9999' }} keyboardType="phone-pad" value={respTelefone} onChangeText={(text: string) => setRespTelefone(text)} />

                  <Text style={styles.inputLabel}>CPF do Responsável (Opcional)</Text>
                  <TextInputMask style={styles.input} type="custom" options={{ mask: '999.999.999-99' }} keyboardType="numeric" value={respCpf} onChangeText={(text: string) => setRespCpf(text)} />
                </View>
              )}

              {/* Cônjuge / Parceiro (Exibido apenas para Casal) */}
              {tipoAtendimento === 'CASAL' && (
                <View>
                  <View style={styles.sectionDivider}>
                    <Text style={styles.sectionLabel}>Cônjuge / Parceiro(a) (Obrigatório ⚠️)</Text>
                  </View>

                  <Text style={styles.inputLabel}>Nome do(a) Parceiro(a) *</Text>
                  <TextInput style={[styles.input, !parceiroNome && styles.inputAlerta]} value={parceiroNome} onChangeText={setParceiroNome} />

                  <Text style={styles.inputLabel}>CPF do(a) Parceiro(a) *</Text>
                  <TextInputMask style={[styles.input, !parceiroCpf && styles.inputAlerta]} type="custom" options={{ mask: '999.999.999-99' }} keyboardType="numeric" value={parceiroCpf} onChangeText={(text: string) => setParceiroCpf(text)} />

                  <Text style={styles.inputLabel}>Telefone do(a) Parceiro(a) *</Text>
                  <TextInputMask style={[styles.input, !parceiroTelefone && styles.inputAlerta]} type="custom" options={{ mask: '(99) 99999-9999' }} keyboardType="phone-pad" value={parceiroTelefone} onChangeText={(text: string) => setParceiroTelefone(text)} />
                </View>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={handleEditPaciente} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Salvar Alterações</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  actionHeaderBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
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
  emptyBox: { alignItems: 'center', paddingVertical: 16 },
  emptyText: { color: colors.textSecondary, marginTop: 8, fontSize: 13 },
  sessaoCard: { flexDirection: 'row', marginBottom: 10, backgroundColor: '#FAFAFA', borderRadius: 12, overflow: 'hidden' },
  sessaoAccent: { width: 4 },
  sessaoBody: { flex: 1, padding: 12, gap: 4 },
  sessaoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessaoData: { fontSize: 13, fontWeight: '700', color: colors.textHeader },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  sessaoSala: { fontSize: 12, color: colors.textSecondary },
  sessaoNotas: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  ativoCard: { flexDirection: 'row', padding: 12, backgroundColor: '#EFF6FF', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#DBEAFE' },
  ativoSala: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  ativoDet: { fontSize: 12, color: colors.textHeader, marginTop: 2 },
  ativoEst: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textHeader },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EAEEF3', borderRadius: 12, padding: 14, fontSize: 16, color: colors.textHeader },
  inputAlerta: { borderColor: '#EA580C', borderWidth: 1.5 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EAEEF3', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#DBEAFE', borderColor: colors.primary },
  typeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  typeTextActive: { color: colors.primary },
  sectionDivider: { borderTopWidth: 1, borderTopColor: '#EAEEF3', marginTop: 20, paddingTop: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.textHeader },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 20 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
