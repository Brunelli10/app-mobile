import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../config/theme';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api/apiClient';
import { Ionicons } from '@expo/vector-icons';

export function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const handleReset = async () => {
    setErrorMsg(null);
    if (!email || !email.includes('@')) {
      return setErrorMsg('Por favor, insira um e-mail válido.');
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/esqueci-senha', { email: email.toLowerCase().trim() });
      const novaSenha = response.data.novaSenha;
      setTempPassword(novaSenha);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.container}>
          
          <View style={[styles.iconContainer, tempPassword ? styles.iconContainerSuccess : null]}>
            <Ionicons 
              name={tempPassword ? "checkmark-circle-outline" : "lock-closed-outline"} 
              size={48} 
              color={tempPassword ? "#10B981" : colors.primary} 
            />
          </View>

          {tempPassword ? (
            <View style={styles.successContainer}>
              <Text style={styles.successTitle}>Senha Redefinida!</Text>
              <Text style={styles.successSubtitle}>
                Como estamos em versão de testes (MVP), o e-mail não foi disparado de verdade.
              </Text>
              
              <View style={styles.tempPasswordBox}>
                <Text style={styles.tempPasswordLabel}>Sua nova senha temporária é:</Text>
                <Text style={styles.tempPasswordValue}>{tempPassword}</Text>
              </View>

              <Text style={styles.tempPasswordInstruction}>
                Anote ou copie a senha acima, volte ao login e use-a para acessar sua conta.
              </Text>

              <Button 
                title="VOLTAR AO LOGIN" 
                style={styles.actionButton} 
                onPress={() => navigation.goBack()} 
              />
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Recuperar Senha</Text>
                <Text style={styles.subtitle}>Digite o e-mail associado à sua conta para receber uma senha temporária.</Text>
              </View>

              <View style={styles.formContainer}>
                {errorMsg && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>{errorMsg}</Text>
                  </View>
                )}

                <Input 
                  label="E-mail Cadastrado" 
                  icon="mail-outline" 
                  placeholder="Ex: seuemail@exemplo.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Button 
                  title="RECUPERAR ACESSO" 
                  style={styles.actionButton} 
                  onPress={handleReset} 
                  loading={loading}
                />

                <Text style={styles.backText}>
                  Lembrou da senha?{' '}
                  <Text style={styles.backLink} onPress={() => navigation.goBack()}>
                    Voltar ao Login
                  </Text>
                </Text>
              </View>
            </>
          )}

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 28, justifyContent: 'center', paddingBottom: 40 },
  iconContainer: { alignItems: 'center', marginBottom: 24, alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF', justifyContent: 'center' },
  iconContainerSuccess: { backgroundColor: '#D1FAE5' },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '900', color: colors.textHeader, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  formContainer: { width: '100%' },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorBoxText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButton: { marginTop: 12 },
  backText: { textAlign: 'center', marginTop: 32, fontSize: 14, color: colors.textSecondary },
  backLink: { color: colors.primaryDark, fontWeight: '700' },
  
  // Estilos da tela de sucesso
  successContainer: { width: '100%', alignItems: 'center' },
  successTitle: { fontSize: 26, fontWeight: '900', color: '#10B981', marginBottom: 8, textAlign: 'center' },
  successSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20, marginBottom: 24 },
  tempPasswordBox: { width: '100%', backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16 },
  tempPasswordLabel: { fontSize: 13, color: '#065F46', marginBottom: 8, fontWeight: '600' },
  tempPasswordValue: { fontSize: 32, fontWeight: '900', color: '#047857', letterSpacing: 3 },
  tempPasswordInstruction: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 15, lineHeight: 18, marginBottom: 28 },
});
