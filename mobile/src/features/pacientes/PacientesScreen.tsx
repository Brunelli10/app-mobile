import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { colors } from '../../config/theme';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';

// ─── Calcular idade localmente para feedback imediato na UI ───────────────────
const calcularIdade = (dataNasc: string): number => {
  if (!dataNasc || dataNasc.length < 10) return 99;
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
};

export function PacientesScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ADULTO' | 'CRIANCA' | 'CASAL'>('TODOS');
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Campos do formulário
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

  const idadeCalculada = calcularIdade(dataNascimento);
  const isMenor = dataNascimento.length >= 10 && idadeCalculada < 18;

  const { data: pacientes, isLoading } = useQuery({
    queryKey: ['pacientes'],
    queryFn: async () => {
      const { data } = await api.get('/pacientes');
      return data;
    }
  });

  const { data: pendentes } = useQuery({
    queryKey: ['pacientes-pendentes'],
    queryFn: async () => {
      const { data } = await api.get('/pacientes/pendentes');
      return data;
    }
  });

  const filteredPacientes = pacientes?.filter((p: any) => {
    const matchesSearch = p.nome.toLowerCase().includes(search.toLowerCase());
    const matchesFiltro = filtroTipo === 'TODOS' || p.tipoAtendimento === filtroTipo;
    return matchesSearch && matchesFiltro;
  }) || [];

  const resetForm = () => {
    setNome(''); setCpf(''); setTelefone(''); setDataNascimento('');
    setTipoAtendimento('ADULTO'); setRespNome(''); setRespTelefone(''); setRespCpf('');
    setParceiroNome(''); setParceiroCpf(''); setParceiroTelefone('');
  };

  const handleCreatePaciente = async () => {
    if (!nome || !cpf || !telefone || !dataNascimento) {
      return Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
    }

    // Validar Nome
    if (nome.trim().length < 3) {
      return Alert.alert('Nome Inválido', 'O nome deve ter ao menos 3 caracteres.');
    }

    // Validar CPF (apenas números, exatamente 11 dígitos)
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return Alert.alert('CPF Inválido', 'O CPF deve conter exatamente 11 dígitos numéricos.');
    }

    // Validar Telefone (apenas números, 10 ou 11 dígitos)
    const cleanTelefone = telefone.replace(/\D/g, '');
    if (cleanTelefone.length < 10 || cleanTelefone.length > 11) {
      return Alert.alert('Telefone Inválido', 'O telefone deve conter 10 ou 11 dígitos numéricos (com DDD).');
    }

    // Validar Data de Nascimento (AAAA-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
      return Alert.alert('Data de Nascimento Inválida', 'A data deve estar no formato AAAA-MM-DD (ex: 1990-06-15).');
    }
    const parts = dataNascimento.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    if (
      dateObj.getFullYear() !== year ||
      dateObj.getMonth() !== month ||
      dateObj.getDate() !== day ||
      dateObj > new Date()
    ) {
      return Alert.alert('Data de Nascimento Inválida', 'Insira uma data de nascimento real e no passado.');
    }

    const calculatedAge = calcularIdade(dataNascimento);
    const isMenorDeIdade = calculatedAge < 18;

    // Se menor, responsável é obrigatório
    if (isMenorDeIdade) {
      if (!respNome || !respTelefone) {
        return Alert.alert('Responsável Obrigatório', `O paciente tem ${calculatedAge} anos (menor de idade).\nNome e Telefone do responsável são obrigatórios.`);
      }
      if (respNome.trim().length < 3) {
        return Alert.alert('Responsável Inválido', 'O nome do responsável deve ter ao menos 3 caracteres.');
      }
      const cleanRespTel = respTelefone.replace(/\D/g, '');
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

    let cleanParcCpf = '';
    let cleanParcTel = '';

    // Se Casal, cônjuge/parceiro(a) é obrigatório
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
      await api.post('/pacientes', {
        nome,
        cpf: cleanCpf,
        telefone: cleanTelefone,
        dataNascimento,
        tipoAtendimento,
        responsavelNome: isMenorDeIdade ? respNome : null,
        responsavelCpf: isMenorDeIdade && respCpf ? respCpf.replace(/\D/g, '') : null,
        responsavelTelefone: isMenorDeIdade ? respTelefone.replace(/\D/g, '') : null,
        parceiroNome: tipoAtendimento === 'CASAL' ? parceiroNome : null,
        parceiroCpf: tipoAtendimento === 'CASAL' ? cleanParcCpf : null,
        parceiroTelefone: tipoAtendimento === 'CASAL' ? cleanParcTel : null
      });
      queryClient.invalidateQueries({ queryKey: ['pacientes'] });
      setModalVisible(false);
      resetForm();
      Alert.alert('Sucesso', 'Paciente cadastrado com sucesso!');
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Erro ao cadastrar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAprovar = async (usuarioId: number, nomePaciente: string) => {
    try {
      await api.patch(`/pacientes/aprovar/${usuarioId}`);
      queryClient.invalidateQueries({ queryKey: ['pacientes-pendentes'] });
      Alert.alert('Aprovado!', `${nomePaciente} agora tem acesso ao app!`);
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Erro ao aprovar.');
    }
  };

  const canCreateOrApprove = ['ESTAGIARIO', 'GESTOR', 'ROOT'].includes(user?.perfil || '');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pacientes</Text>
          <Text style={styles.headerSub}>{filteredPacientes.length} cadastrado(s)</Text>
        </View>
        {canCreateOrApprove && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="person-add" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>Novo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Badge de Pendentes */}
      {canCreateOrApprove && pendentes?.length > 0 && (
        <TouchableOpacity style={styles.pendentesBox} onPress={() =>
          Alert.alert('Aprovações Pendentes', 'Selecione um paciente para aprovar:', [
            ...pendentes.map((p: any) => ({
              text: `✅ Aprovar ${p.nome.split(' ')[0]}`,
              onPress: () => handleAprovar(p.id, p.nome)
            })),
            { text: 'Fechar', style: 'cancel' }
          ])
        }>
          <Ionicons name="time-outline" size={18} color={colors.primary} />
          <Text style={styles.pendentesText}>{pendentes.length} conta(s) aguardando aprovação</Text>
          <Text style={styles.pendentesAction}>Revisar</Text>
        </TouchableOpacity>
      )}

      {/* Busca */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#94A3B8" />
        <TextInput
          placeholder="Buscar por nome..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filtros por Tipo de Atendimento */}
      <View style={styles.filterContainer}>
        {(['TODOS', 'ADULTO', 'CRIANCA', 'CASAL'] as const).map(tipo => (
          <TouchableOpacity
            key={tipo}
            style={[styles.filterBtn, filtroTipo === tipo && styles.filterBtnActive]}
            onPress={() => setFiltroTipo(tipo)}
          >
            <Text style={[styles.filterBtnText, filtroTipo === tipo && styles.filterBtnTextActive]}>
              {tipo === 'TODOS' ? 'Todos' : tipo === 'CRIANCA' ? 'Criança' : tipo === 'CASAL' ? 'Casal' : 'Adulto'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredPacientes}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>Nenhum paciente cadastrado ainda.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const idade = calcularIdade(item.dataNascimento);
            const menorSemResp = idade < 18 && !item.responsavelNome;
            return (
              <TouchableOpacity style={[styles.card, menorSemResp && styles.cardAlerta]} onPress={() => navigation.navigate('PacientePerfil', { pacienteId: item.id })} activeOpacity={0.75}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>{item.nome.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.nomeText}>{item.nome}</Text>
                  <Text style={styles.sub}>{item.cpf} · {idade} anos</Text>
                  {item.responsavelNome && (
                    <Text style={styles.respTag}>👤 {item.responsavelNome}</Text>
                  )}
                  {item.tipoAtendimento === 'CASAL' && item.parceiroNome && (
                    <Text style={styles.parcTag}>💑 {item.parceiroNome}</Text>
                  )}
                  {menorSemResp && (
                    <Text style={styles.alertaTag}>⚠️ Menor sem responsável!</Text>
                  )}
                </View>
                <View style={[styles.tag, {
                  backgroundColor: item.tipoAtendimento === 'CRIANCA' ? '#FFF7ED' : (item.tipoAtendimento === 'CASAL' ? '#FDF2F8' : '#EFF6FF')
                }]}>
                  <Text style={[styles.tagText, {
                    color: item.tipoAtendimento === 'CRIANCA' ? '#EA580C' : (item.tipoAtendimento === 'CASAL' ? '#DB2777' : colors.primary)
                  }]}>{item.tipoAtendimento}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* MODAL DE NOVO PACIENTE */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Paciente</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>
                {tipoAtendimento === 'CASAL' ? 'Nome (Quem iniciou o contato) *' : 'Nome Completo *'}
              </Text>
              <TextInput style={styles.input} placeholder="Ex: Ana Maria Costa" value={nome} onChangeText={setNome} />

              <Text style={styles.inputLabel}>
                {tipoAtendimento === 'CASAL' ? 'CPF (Quem iniciou o contato) *' : 'CPF *'}
              </Text>
              <TextInput style={styles.input} placeholder="00000000000" keyboardType="numeric" value={cpf} onChangeText={setCpf} />

              <Text style={styles.inputLabel}>
                {tipoAtendimento === 'CASAL' ? 'Telefone (Quem iniciou o contato) *' : 'Telefone *'}
              </Text>
              <TextInput style={styles.input} placeholder="11999990000" keyboardType="phone-pad" value={telefone} onChangeText={setTelefone} />

              <Text style={styles.inputLabel}>
                {tipoAtendimento === 'CASAL' ? 'Data de Nascimento (Quem iniciou o contato) * (AAAA-MM-DD)' : 'Data de Nascimento * (AAAA-MM-DD)'}
              </Text>
              <TextInput style={styles.input} placeholder="1990-06-15" value={dataNascimento} onChangeText={setDataNascimento} />

              {isMenor && (
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
              {(isMenor || tipoAtendimento === 'CRIANCA') && (
                <View>
                  <View style={styles.sectionDivider}>
                    <Text style={styles.sectionLabel}>Responsável (Obrigatório ⚠️)</Text>
                  </View>

                  <Text style={styles.inputLabel}>Nome do Responsável *</Text>
                  <TextInput style={[styles.input, !respNome && styles.inputAlerta]} placeholder="Ex: João da Silva" value={respNome} onChangeText={setRespNome} />

                  <Text style={styles.inputLabel}>Telefone do Responsável *</Text>
                  <TextInput style={[styles.input, !respTelefone && styles.inputAlerta]} placeholder="11999990000" keyboardType="phone-pad" value={respTelefone} onChangeText={setRespTelefone} />

                  <Text style={styles.inputLabel}>CPF do Responsável (Opcional)</Text>
                  <TextInput style={styles.input} placeholder="00000000000" keyboardType="numeric" value={respCpf} onChangeText={setRespCpf} />
                </View>
              )}

              {/* Cônjuge / Parceiro (Exibido apenas para Casal) */}
              {tipoAtendimento === 'CASAL' && (
                <View>
                  <View style={styles.sectionDivider}>
                    <Text style={styles.sectionLabel}>Cônjuge / Parceiro(a) (Obrigatório ⚠️)</Text>
                  </View>

                  <Text style={styles.inputLabel}>Nome do(a) Parceiro(a) *</Text>
                  <TextInput style={[styles.input, !parceiroNome && styles.inputAlerta]} placeholder="Ex: Carlos Oliveira" value={parceiroNome} onChangeText={setParceiroNome} />

                  <Text style={styles.inputLabel}>CPF do(a) Parceiro(a) *</Text>
                  <TextInput style={[styles.input, !parceiroCpf && styles.inputAlerta]} placeholder="00000000000" keyboardType="numeric" value={parceiroCpf} onChangeText={setParceiroCpf} />

                  <Text style={styles.inputLabel}>Telefone do(a) Parceiro(a) *</Text>
                  <TextInput style={[styles.input, !parceiroTelefone && styles.inputAlerta]} placeholder="11999990000" keyboardType="phone-pad" value={parceiroTelefone} onChangeText={setParceiroTelefone} />
                </View>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreatePaciente} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Cadastrar Paciente</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F5F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 32, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.primaryDark },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignItems: 'center', gap: 6 },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  pendentesBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', marginHorizontal: 20, marginTop: 12, padding: 12, borderRadius: 12, gap: 8 },
  pendentesText: { flex: 1, color: colors.primary, fontSize: 13, fontWeight: '600' },
  pendentesAction: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 20, marginTop: 16, paddingHorizontal: 16, borderRadius: 12, height: 48, elevation: 1 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 12, gap: 6 },
  filterBtn: { flex: 1, backgroundColor: '#FFF', paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EAEEF3', elevation: 1 },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  filterBtnTextActive: { color: '#FFF' },
  list: { padding: 20, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.textSecondary, marginTop: 16, fontSize: 15 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 2 },
  cardAlerta: { borderWidth: 1.5, borderColor: '#EA580C' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarInitial: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  info: { flex: 1 },
  nomeText: { fontSize: 16, fontWeight: '700', color: colors.textHeader },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  respTag: { fontSize: 11, color: '#10B981', marginTop: 4, fontWeight: '600' },
  parcTag: { fontSize: 11, color: '#DB2777', marginTop: 4, fontWeight: '600' },
  alertaTag: { fontSize: 11, color: '#EA580C', marginTop: 4, fontWeight: '600' },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textHeader },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EAEEF3', borderRadius: 12, padding: 14, fontSize: 16, color: colors.textHeader },
  inputAlerta: { borderColor: '#EA580C', borderWidth: 1.5 },
  alertBox: { flexDirection: 'row', backgroundColor: '#FFF7ED', padding: 12, borderRadius: 10, alignItems: 'center', gap: 8, marginTop: 8 },
  alertText: { flex: 1, color: '#EA580C', fontSize: 13, fontWeight: '600' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EAEEF3', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#DBEAFE', borderColor: colors.primary },
  typeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  typeTextActive: { color: colors.primary },
  sectionDivider: { borderTopWidth: 1, borderTopColor: '#EAEEF3', marginTop: 20, paddingTop: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.textHeader },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 24 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
