# Escopo Técnico e Arquitetural – React Native (Expo)

Este documento dita de forma robusta e explícita como o App Mobile da Psicologia SEP será construído, abordando o design técnico e focando em manutenabilidade e escala.

## 1. Stack Tecnológica
*   **Core:** React Native + Expo (EAS Build para distribuição e updates Over-The-Air, poupando a equipe de brigar com Android Studio / Xcode no início).
*   **Linguagem:** TypeScript Extremo (Strict mode). Não passarão dados sem uma interface definida.
*   **Navegação:** React Navigation v6 (Bottom Tabs + Native Stack).
*   **Gerenciamento de Estado Global:** Zustand. (É 80% mais leve que Redux e resolve todo fluxo síncrono que precisamos, como guardar as flags de sessão e tema).
*   **Cache e chamadas HTTP:** Axios + React Query (Tanstack Query). Perfeito para fazer o cache imediato das salas que não atualizaram, economizando banda e trazendo velocidade ímpar para listar dados.
*   **Estilização:** NativeWind (Tailwind CSS para React Native) ou StyleSheet padronizado. Preferiremos Tailwind para consistência com o backend (se usou algo da web moderna).

## 2. Arquitetura de Pastas (Modular)

Utilizaremos uma arquitetura baseada em domínios (`Feature-based`), fugindo de separar tudo por "tipos de arquivos".

```text
src/
 ├─ api/          (Lógica crua do Axios, interceptors de requisição e respostas)
 ├─ assets/       (Imagens, ícones, fontes customizadas)
 ├─ components/   (Bandejas, Botões base, Inputs - DUMB COMPONENTS)
 ├─ config/       (Tokens, URL base, Theme properties do Azul #1565C0)
 ├─ features/     (Domínios fechados - SMART COMPONENTS)
 │   ├─ auth/     (Rotas, Serviços e UI do Login)
 │   ├─ salas/    (Lógica para fetch de calendário e visual)
 │   └─ sessoes/  (Aba de fazer o Check-in e Casos Delicados)
 ├─ navigation/   (Stacks principais e configurações do React Navigation)
 ├─ store/        (Hooks do Zustand. Ex: useAuthStore.ts)
 └─ utils/        (Ex: mascara CPF, manipuladores do date-fns para lidar com blocos de 1H)
```

## 3. Padrões de Validação (O Escudo Client-Side)
Tudo será barrado no celular **antes** de bater no servidor, aliviando banco de dados:
*   **Bibliotecas:** Zod + React Hook Form.
*   **Regra 1:** Nenhum formulário submete se o paciente for menor de idade e a 'string' do telefone do responsável for menor que 11 dígitos.
*   **Regra 2:** Ao usar o agendamento de 10 Semanas (10-Week Booking), travar datas de fim de semana (Domingo).

## 4. Segurança de Aplicação (Security Measures)
*   **Proteção do JWT:** Tokens não vão para `AsyncStorage` comum (pois é legível por Root em Android). Vamos usar o **`expo-secure-store`**, que criptografa a secret no Keychain/Keystore do dispositivo.
*   **Interceptors do Axios:** Toda a requisição carrega o Header `Authorization: Bearer <token>`.
*   **Tratamento de Expiracão do Token (401 Unauthorized):** Se a API do Backend acusar o token falso ou expirado, o `Axios Interceptor` captura globalmente e dispara uma função do `Zustand` de logout forçado imediato, apagando o SecureStore e derrubando o usuário de volta pra tela de login.
*   **Cache Sigiloso:** As queries do "React Query" que puxam os dados de "Observações Delicadas" NÃO serão marcadas com tempo longo de Cache. Se o estagiário deslogar, a tela é imediatamente varrida para que outro não acesse.
