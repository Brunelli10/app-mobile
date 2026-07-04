import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../config/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/apiClient';
import { useMutation } from '@tanstack/react-query';

export function PerfilScreen() {
  const navigation = useNavigation();
  const { user, setUser } = useAuthStore();
  
  const [nome, setNome] = useState(user?.nome || '');
  const [email, setEmail] = useState(user?.email || '');
  
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const updatePerfilMutation = useMutation({
    mutationFn: async () => await api.patch('/me', { nome, email }),
    onSuccess: (res) => {
      // Atualiza o Zustand com os novos dados
      if (user) {
        setUser({ ...user, ...res.data.user });
      }
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    },
    onError: (err: any) => {
      Alert.alert('Erro', err.response?.data?.error || 'Erro ao atualizar perfil.');
    }
  });

  const updateSenhaMutation = useMutation({
    mutationFn: async () => await api.patch('/me/senha', { senhaAtual, novaSenha }),
    onSuccess: () => {
      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    },
    onError: (err: any) => {
      Alert.alert('Erro', err.response?.data?.error || 'Erro ao alterar senha.');
    }
  });

  const handleUpdatePerfil = () => {
    if (!nome.trim() || !email.trim()) {
      return Alert.alert('Atenção', 'Nome e Email não podem ficar vazios.');
    }
    updatePerfilMutation.mutate();
  };

  const handleUpdateSenha = () => {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return Alert.alert('Atenção', 'Preencha todos os campos de senha.');
    }
    if (novaSenha !== confirmarSenha) {
      return Alert.alert('Atenção', 'A nova senha e a confirmação não coincidem.');
    }
    if (novaSenha.length < 6) {
      return Alert.alert('Atenção', 'A nova senha deve ter pelo menos 6 caracteres.');
    }
    updateSenhaMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textHeader} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Informações Pessoais</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Dados Básicos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Básicos</Text>
          
          <Text style={styles.label}>Nome Completo</Text>
          <TextInput 
            style={styles.input} 
            value={nome} 
            onChangeText={setNome}
            placeholder="Seu nome"
          />

          <Text style={styles.label}>E-mail de Acesso</Text>
          <TextInput 
            style={styles.input} 
            value={email} 
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="seu@email.com"
          />

          <TouchableOpacity 
            style={styles.btnAction} 
            onPress={handleUpdatePerfil}
            disabled={updatePerfilMutation.isPending}
          >
            {updatePerfilMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnActionText}>Salvar Dados</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Alterar Senha */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Segurança e Senha</Text>
          
          <Text style={styles.label}>Senha Atual</Text>
          <TextInput 
            style={styles.input} 
            value={senhaAtual} 
            onChangeText={setSenhaAtual}
            secureTextEntry
            placeholder="••••••••"
          />

          <Text style={styles.label}>Nova Senha</Text>
          <TextInput 
            style={styles.input} 
            value={novaSenha} 
            onChangeText={setNovaSenha}
            secureTextEntry
            placeholder="••••••••"
          />

          <Text style={styles.label}>Confirmar Nova Senha</Text>
          <TextInput 
            style={styles.input} 
            value={confirmarSenha} 
            onChangeText={setConfirmarSenha}
            secureTextEntry
            placeholder="••••••••"
          />

          <TouchableOpacity 
            style={[styles.btnAction, { backgroundColor: '#10B981' }]} 
            onPress={handleUpdateSenha}
            disabled={updateSenhaMutation.isPending}
          >
            {updateSenhaMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnActionText}>Alterar Senha</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#FFF', elevation: 2 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.textHeader },
  scroll: { padding: 20 },
  section: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primaryDark, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, fontSize: 16, color: colors.textHeader, marginBottom: 16 },
  btnAction: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnActionText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' }
});
