import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../config/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';
import { authApi } from '../../api/auth.api';
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
  const [loginError, setLoginError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setLoginError(null);
    console.log('[LOGIN] Tentando entrar com email:', data.email);
    setLoading(true);
    try {
      const result = await authApi.login(data.email, data.password);
      console.log('[LOGIN] Login bem-sucedido na API.');
      await login(result.token, result.user);
      console.log('[LOGIN] Login finalizado no useAuthStore.');
    } catch (err: any) {
      console.error('[LOGIN] Erro capturado no handleLogin:', err);
      const errorData = err?.response?.data;
      // Conta PENDENTE — exibir mensagem específica ao invés de "credenciais inválidas"
      if (errorData?.statusConta === 'PENDENTE') {
        setLoginError('Sua conta ainda está aguardando aprovação de um Gestor para acessar o sistema.');
      } else {
        setLoginError(errorData?.error || 'Revise seu e-mail e senha ou verifique se o servidor está rodando.');
      }
    } finally {
      setLoading(false);
    }
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
          {loginError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{loginError}</Text>
            </View>
          )}

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

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotPassword}>Esqueci minha senha</Text>
          </TouchableOpacity>

           <Button 
            title="ENTRAR" 
            style={styles.signInButton} 
            onPress={handleSubmit(
              handleLogin,
              (errors) => console.log('[LOGIN] Erro de validação dos campos:', errors)
            )} 
            loading={loading}
          />
          
          <Text style={styles.signupText}>
            É profissional ou estagiário da clínica?{' '}
            <Text 
              style={styles.signupLink} 
              onPress={() => navigation.navigate('Register')}
            >
              Solicite seu acesso
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
