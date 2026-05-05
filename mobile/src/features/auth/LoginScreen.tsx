import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../config/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api/apiClient';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const loginSchema = z.object({
  email: z.string().email('Digite um e-mail válido.'),
  password: z.string().min(1, 'A senha não pode ser vazia.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleLogin = async (data: LoginFormData) => {
    console.log('🚀 Tentativa de login iniciada com:', data.email);
    setLoading(true);
    try {
      console.log('📡 Enviando POST para /auth/login...');
      const response = await api.post('/auth/login', { email: data.email, password: data.password });
      console.log('✅ Login bem-sucedido! Token recebido.');
      await login(response.data.token, response.data.user);
    } catch (err: any) {
      console.error('❌ Erro no login:', err);
      const errorData = err?.response?.data;
      // Conta PENDENTE — exibir mensagem específica ao invés de "credenciais inválidas"
      if (errorData?.statusConta === 'PENDENTE') {
        Alert.alert(
          '⏳ Conta Pendente',
          'Sua conta ainda está aguardando aprovação.\n\nUm estagiário ou gestor da clínica precisa aprovar seu cadastro antes de você acessar o sistema.',
          [{ text: 'Entendido', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Acesso Negado',
          errorData?.error || 'Revise seu e-mail e senha ou verifique se o servidor está rodando.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = (errors: any) => {
    console.warn('⚠️ Validação do formulário falhou:', errors);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.logoPsi}>Ψ</Text>
          <Text style={styles.logoText}>Psicologia SEP</Text>
          <Text style={styles.logoSubText}>Gestão Clínica & Agendamentos</Text>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.title}>Bem-vindo(a)</Text>
          <Text style={styles.subtitle}>Entre para gerenciar seus agendamentos</Text>
        </View>

        <View style={styles.formContainer}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input 
                label="E-mail" 
                icon="mail-outline" 
                placeholder="ex: email@exemplo.com"
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                keyboardType="email-address"
                errorMessage={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input 
                label="Senha" 
                icon="key-outline" 
                placeholder="********"
                isPassword
                value={value}
                onChangeText={onChange}
                errorMessage={errors.password?.message}
              />
            )}
          />

          <Text style={styles.forgotPassword}>Esqueci minha senha</Text>

          <Button 
            title="ENTRAR" 
            style={styles.signInButton} 
            onPress={handleSubmit(handleLogin, onInvalid)} 
            loading={loading}
          />
          
          <Text style={styles.signupText}>
            Ainda não tem uma conta?{' '}
            <Text 
              style={styles.signupLink} 
              onPress={() => navigation.navigate('Register')}
            >
              Criar Conta
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoPsi: {
    fontSize: 48,
    color: colors.primaryDark,
    fontWeight: '800',
  },
  logoText: {
    fontSize: 22,
    color: colors.textHeader,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  logoSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.textHeader,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  formContainer: {
    width: '100%',
  },
  forgotPassword: {
    color: '#64B5F6', 
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  signInButton: {
    marginTop: 12,
  },
  signupText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
    color: colors.textSecondary,
  },
  signupLink: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
