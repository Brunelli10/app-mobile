import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors } from '../../config/theme';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api/apiClient';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const registerSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres.'),
  email: z.string().email('Digite um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  matricula: z.string().min(4, 'Matrícula inválida.'),
  semestre: z.string().min(1, 'Semestre é obrigatório.')
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const handleRegister = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      await api.post('/auth/register', { 
        name: data.name, 
        email: data.email, 
        password: data.password,
        matricula: data.matricula,
        semestre: data.semestre
      });
      Alert.alert('Solicitação Enviada', 'Seu pré-cadastro como Estagiário foi realizado. Aguarde a aprovação do Gestor da clínica para acessar.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err: any) {
      Alert.alert('Erro no Cadastro', err?.response?.data?.error || 'Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Solicitar Acesso</Text>
            <Text style={styles.subtitle}>Cadastro exclusivo para Profissionais e Estagiários da Clínica SEP.</Text>
          </View>

          <View style={styles.formContainer}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input 
                  label="Nome Completo" 
                  icon="person-outline" 
                  placeholder="Ex: João da Silva"
                  value={value}
                  onChangeText={onChange}
                  errorMessage={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input 
                  label="E-mail" 
                  icon="mail-outline" 
                  placeholder="Ex: email@exemplo.com"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
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
                  placeholder="******"
                  isPassword
                  value={value}
                  onChangeText={onChange}
                  errorMessage={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="matricula"
              render={({ field: { onChange, value } }) => (
                <Input 
                  label="Matrícula" 
                  icon="card-outline" 
                  placeholder="Sua matrícula (ex: 2024001)"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="number-pad"
                  errorMessage={errors.matricula?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="semestre"
              render={({ field: { onChange, value } }) => (
                <Input 
                  label="Semestre Atual" 
                  icon="school-outline" 
                  placeholder="Ex: 8"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="number-pad"
                  errorMessage={errors.semestre?.message}
                />
              )}
            />

            <Button 
              title="ENVIAR SOLICITAÇÃO" 
              style={styles.registerButton} 
              onPress={handleSubmit(handleRegister)} 
              loading={loading}
            />
            
            <Text style={styles.loginText}>
              Já possui uma conta?{' '}
              <Text style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
                Entrar
              </Text>
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: 28, justifyContent: 'center', paddingBottom: 40, paddingTop: 40 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 30, fontWeight: '900', color: colors.textHeader, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  formContainer: { width: '100%' },
  registerButton: { marginTop: 24 },
  loginText: { textAlign: 'center', marginTop: 32, fontSize: 14, color: colors.textSecondary },
  loginLink: { color: colors.primaryDark, fontWeight: '700' },
});
