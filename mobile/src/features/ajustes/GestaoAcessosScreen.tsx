import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, ScrollView, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../config/theme';
import { Button } from '../../components/Button';
import { api } from '../../api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const PERFIL_LABELS: Record<string, string> = {
  PACIENTE: 'Paciente',
  ESTAGIARIO: 'Estagiário',
  SUPERVISOR: 'Supervisor',
  GESTOR: 'Gestor',
  ROOT: 'Administrador'
};

const PERFIL_COLORS: Record<string, { bg: string; text: string }> = {
  PACIENTE:  { bg: '#F1F5F9', text: '#64748B' },
  ESTAGIARIO:{ bg: '#EFF6FF', text: colors.primary },
  SUPERVISOR:{ bg: '#F0FDF4', text: '#16A34A' },
  GESTOR:    { bg: '#FDF4FF', text: '#9333EA' },
  ROOT:      { bg: '#FFF1F2', text: '#E11D48' }
};

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  ATIVO: 'Ativo',
  BLOQUEADO: 'Bloqueado'
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDENTE: { bg: '#FEF3C7', text: '#D97706' },
  ATIVO:    { bg: '#DCFCE7', text: '#15803D' },
  BLOQUEADO:{ bg: '#FEE2E2', text: '#B91C1C' }
};

export function GestaoAcessosScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPerfil, setSelectedPerfil] = useState<string>('ALL');

  // Controle do Modal de Edição
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>('ATIVO');
  const [newPerfil, setNewPerfil] = useState<string>('PACIENTE');

  // Campos adicionais do Estagiário
  const [matricula, setMatricula] = useState('');
  const [cargaHoraria, setCargaHoraria] = useState('');
  const [dataInicio, setDataInicio] = useState('');

  // Campos adicionais do Supervisor
  const [crp, setCrp] = useState('');
  const [especialidade, setEspecialidade] = useState('');

  const [isUpdating, setIsUpdating] = useState(false);

  // Buscar lista de usuários
  const { data: usuarios, isLoading, refetch } = useQuery({
    queryKey: ['usuarios-lista', search, selectedStatus, selectedPerfil],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedPerfil !== 'ALL') params.perfil = selectedPerfil;
      return (await api.get('/usuarios', { params })).data;
    }
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleAprovar = async (userId: number, nome: string) => {
    try {
      await api.put(`/usuarios/${userId}/status`, { status: 'ATIVO' });
      queryClient.invalidateQueries({ queryKey: ['usuarios-lista'] });
      Alert.alert('Sucesso', `Conta de ${nome} aprovada!`);
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Erro ao aprovar usuário.';
      Alert.alert('Erro', msg);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setNewStatus(user.status);
    setNewPerfil(user.perfil);

    // Carregar dados de Estagiário se houver
    if (user.perfil === 'ESTAGIARIO' && user.estagiario) {
      setMatricula(user.estagiario.matricula || '');
      setCargaHoraria(String(user.estagiario.cargaHorariaSemanal || ''));
      setDataInicio(user.estagiario.dataInicio ? user.estagiario.dataInicio.split('T')[0] : '');
    } else {
      setMatricula('');
      setCargaHoraria('');
      setDataInicio('');
    }

    // Carregar dados de Supervisor se houver
    if (user.perfil === 'SUPERVISOR' && user.supervisor) {
      setCrp(user.supervisor.crp || '');
      setEspecialidade(user.supervisor.especialidade || '');
    } else {
      setCrp('');
      setEspecialidade('');
    }

    setEditModalVisible(true);
  };

  const handleSalvarEdicao = async () => {
    if (!editingUser) return;
    setIsUpdating(true);

    try {
      // 1. Atualizar Status se mudou
      if (newStatus !== editingUser.status) {
        await api.put(`/usuarios/${editingUser.id}/status`, { status: newStatus });
      }

      // 2. Atualizar Perfil se mudou ou se for Estagiário/Supervisor (para salvar campos específicos)
      // Nota: Sempre enviamos a atualização de perfil se for ESTAGIARIO ou SUPERVISOR para garantir o preenchimento dos campos,
      // mesmo que a role continue sendo a mesma.
      const isRoleSpecific = newPerfil === 'ESTAGIARIO' || newPerfil === 'SUPERVISOR';
      if (newPerfil !== editingUser.perfil || isRoleSpecific) {
        const body: any = { perfil: newPerfil };

        if (newPerfil === 'ESTAGIARIO') {
          if (!matricula || !cargaHoraria || !dataInicio) {
            throw new Error('Matrícula, carga horária e data de início são obrigatórios para Estagiários.');
          }
          body.matricula = matricula;
          body.cargaHorariaSemanal = cargaHoraria;
          body.dataInicio = dataInicio;
        } else if (newPerfil === 'SUPERVISOR') {
          if (!crp || !especialidade) {
            throw new Error('CRP e especialidade são obrigatórios para Supervisores.');
          }
          body.crp = crp;
          body.especialidade = especialidade;
        }

        await api.put(`/usuarios/${editingUser.id}/role`, body);
      }

      queryClient.invalidateQueries({ queryKey: ['usuarios-lista'] });
      setEditModalVisible(false);
      Alert.alert('Sucesso', 'Permissões atualizadas com sucesso.');
    } catch (error: any) {
      const msg = error.message || error?.response?.data?.error || 'Erro ao atualizar usuário.';
      Alert.alert('Erro', msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderUserCard = ({ item }: { item: any }) => {
    const perfilCfg = PERFIL_COLORS[item.perfil] || PERFIL_COLORS.PACIENTE;
    const statusCfg = STATUS_COLORS[item.status] || STATUS_COLORS.PENDENTE;

    return (
      <View style={styles.userCard}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarWrapper}>
            <Text style={styles.avatarText}>{item.nome.substring(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.userName}>{item.nome}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
        </View>

        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: perfilCfg.bg }]}>
            <Text style={[styles.badgeText, { color: perfilCfg.text }]}>{PERFIL_LABELS[item.perfil] || item.perfil}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.badgeText, { color: statusCfg.text }]}>{STATUS_LABELS[item.status] || item.status}</Text>
          </View>
        </View>

        {/* Informações específicas de Estagiário/Supervisor */}
        {item.perfil === 'ESTAGIARIO' && item.estagiario?.ativo && (
          <View style={styles.detailsBox}>
            <Ionicons name="school-outline" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.detailsText}>
              Matrícula: {item.estagiario.matricula} · CH: {item.estagiario.cargaHorariaSemanal}h/sem
            </Text>
          </View>
        )}

        {item.perfil === 'SUPERVISOR' && item.supervisor?.ativo && (
          <View style={styles.detailsBox}>
            <Ionicons name="ribbon-outline" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.detailsText}>
              CRP: {item.supervisor.crp} · {item.supervisor.especialidade}
            </Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          {item.status === 'PENDENTE' && (
            <TouchableOpacity 
              style={styles.approveButton} 
              onPress={() => handleAprovar(item.id, item.nome)}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
              <Text style={styles.approveButtonText}>Aprovar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.editButton, item.status !== 'PENDENTE' && { flex: 1 }]} 
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="options-outline" size={16} color={colors.primary} />
            <Text style={styles.editButtonText}>Editar Acesso</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestão de Acessos</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Filtro de Status */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['ALL', 'PENDENTE', 'ATIVO', 'BLOQUEADO'].map(st => (
            <TouchableOpacity
              key={st}
              style={[styles.filterChip, selectedStatus === st && styles.filterChipActive]}
              onPress={() => setSelectedStatus(st)}
            >
              <Text style={[styles.filterChipText, selectedStatus === st && styles.filterChipTextActive]}>
                {st === 'ALL' ? 'Todos' : STATUS_LABELS[st]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Filtro de Perfil */}
      <View style={[styles.filterSection, { borderBottomWidth: 1, borderColor: '#EAEEF3', paddingBottom: 12 }]}>
        <Text style={styles.filterLabel}>Função:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['ALL', 'PACIENTE', 'ESTAGIARIO', 'SUPERVISOR', 'GESTOR', 'ROOT'].map(pf => (
            <TouchableOpacity
              key={pf}
              style={[styles.filterChip, selectedPerfil === pf && styles.filterChipActive]}
              onPress={() => setSelectedPerfil(pf)}
            >
              <Text style={[styles.filterChipText, selectedPerfil === pf && styles.filterChipTextActive]}>
                {pf === 'ALL' ? 'Todas' : PERFIL_LABELS[pf]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUserCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
            </View>
          }
        />
      )}

      {/* Modal de Edição de Acesso */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Acesso</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.modalUserName}>{editingUser?.nome}</Text>
              <Text style={styles.modalUserEmail}>{editingUser?.email}</Text>

              {/* Status */}
              <Text style={styles.sectionLabel}>Status da Conta</Text>
              <View style={styles.optionsRow}>
                {['ATIVO', 'BLOQUEADO', 'PENDENTE'].map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.optionButton, newStatus === st && styles.optionButtonActive]}
                    onPress={() => setNewStatus(st)}
                  >
                    <Text style={[styles.optionText, newStatus === st && styles.optionTextActive]}>
                      {STATUS_LABELS[st]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Perfil/Função */}
              <Text style={styles.sectionLabel}>Função no Sistema</Text>
              <View style={styles.optionsWrap}>
                {['PACIENTE', 'ESTAGIARIO', 'SUPERVISOR', 'GESTOR'].map(pf => (
                  <TouchableOpacity
                    key={pf}
                    style={[styles.optionButton, { width: '47%', marginBottom: 10 }, newPerfil === pf && styles.optionButtonActive]}
                    onPress={() => setNewPerfil(pf)}
                  >
                    <Text style={[styles.optionText, newPerfil === pf && styles.optionTextActive]}>
                      {PERFIL_LABELS[pf]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Campos de Estagiário */}
              {newPerfil === 'ESTAGIARIO' && (
                <View style={styles.formContainer}>
                  <Text style={styles.formTitle}>Dados do Estagiário</Text>
                  
                  <Text style={styles.inputLabel}>Matrícula *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 2026102930"
                    value={matricula}
                    onChangeText={setMatricula}
                  />

                  <Text style={styles.inputLabel}>Carga Horária Semanal (horas) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 20"
                    keyboardType="numeric"
                    value={cargaHoraria}
                    onChangeText={setCargaHoraria}
                  />

                  <Text style={styles.inputLabel}>Data de Início (AAAA-MM-DD) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 2026-02-15"
                    value={dataInicio}
                    onChangeText={setDataInicio}
                  />
                </View>
              )}

              {/* Campos de Supervisor */}
              {newPerfil === 'SUPERVISOR' && (
                <View style={styles.formContainer}>
                  <Text style={styles.formTitle}>Dados do Supervisor</Text>

                  <Text style={styles.inputLabel}>CRP *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: CRP-06/12345"
                    value={crp}
                    onChangeText={setCrp}
                  />

                  <Text style={styles.inputLabel}>Especialidade *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Terapia Cognitivo-Comportamental"
                    value={especialidade}
                    onChangeText={setEspecialidade}
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {isUpdating ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <Button title="SALVAR ALTERAÇÕES" onPress={handleSalvarEdicao} />
              )}
            </View>
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
  searchSection: { padding: 16, backgroundColor: '#FFF' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 15, color: colors.textHeader },
  filterSection: { paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF' },
  filterLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, width: 60 },
  filterScroll: { gap: 8 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#F1F5F9' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: '#FFF' },
  loadingWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 10, fontWeight: '500' },
  userCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  cardInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: colors.textHeader },
  userEmail: { fontSize: 13, color: colors.textSecondary },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  detailsBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8, marginBottom: 12 },
  detailsText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  approveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 10, gap: 4 },
  approveButtonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: colors.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, gap: 4 },
  editButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: Platform.OS === 'web' ? '90%' : '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textHeader },
  modalScroll: { marginBottom: 20 },
  modalUserName: { fontSize: 18, fontWeight: '700', color: colors.textHeader },
  modalUserEmail: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 10 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  optionButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  optionButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: 13, fontWeight: '700', color: colors.textHeader },
  optionTextActive: { color: '#FFF' },
  formContainer: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, marginTop: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  formTitle: { fontSize: 14, fontWeight: '700', color: colors.textHeader, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EAEEF3', borderRadius: 8, padding: 10, fontSize: 14, color: colors.textHeader },
  modalFooter: { borderTopWidth: 1, borderColor: '#F1F5F9', paddingTop: 16 }
});
