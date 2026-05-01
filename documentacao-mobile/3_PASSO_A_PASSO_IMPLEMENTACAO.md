# Guia Passo a Passo Minucioso de Implementação do Zero

Este é o roteiro exato que será executado para subir a base do nosso aplicativo usando **React Native**. Esse guia já resolve os dilemas arquiteturais em código bruto.

---

### Passo 1: Inicializando o Projeto Base

Não começamos mais no React Native cru. Vamos utilizar a stack do Expo moderno que facilita vida nos apps Mobile e empacotamento.

```bash
# Na raiz do seu computador
npx create-expo-app@latest clinica-mobile --template blank-typescript
cd clinica-mobile
```

### Passo 2: Adicionando as Armas Principais (Dependências)

Vamos injetar os pacotes que mencionamos no *Escopo Técnico*:

```bash
# Navegação
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context

# Chamadas HTTP e Ferramentas de Rede
npm install axios @tanstack/react-query

# Armazenamento Seguro (JWT) e Gerência Global (Zustand)
npx expo install expo-secure-store
npm install zustand

# Formularios e Validacao Profunda
npm install react-hook-form @hookform/resolvers zod

# Estilo e Visualizações SVG / Ícones
npx expo install @expo/vector-icons react-native-svg
```

---

### Passo 3: Segurança (Exemplo do Cofre e Zustand)

Antes sequer de desenhar a tela, protegeremos a porta do JWT. Crie dentro da nova estrutura `src/store/useAuthStore.ts`:

```typescript
// src/store/useAuthStore.ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  user: any | null;
  login: (token: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  login: async (token, userData) => {
    await SecureStore.setItemAsync('clinic_jwt_token', token);
    set({ token, user: userData });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('clinic_jwt_token');
    set({ token: null, user: null });
  },
}));
```

### Passo 4: O Coração do Acesso a Rede (Axios Intercepts)

Se tentarem buscar a sala, o Axios precisa por conta própria incluir o token de quem está acessando. Como injetamos de forma Global?

```typescript
// src/api/apiClient.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/useAuthStore';

// URL DO BACKEND AQUI
export const api = axios.create({
  baseURL: 'http://SEU_IP_BACKEND/api', 
});

// Interceptor de Requisição (Anexa o token secreto)
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('clinic_jwt_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de Erro (Logout forçado se token inválido - 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
       console.log("Token expirado, derrubando sessão de segurança.");
       useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
```

---

### Passo 5: Estratégia de Roteamento (Main Navigation Base)

Para blindar o aplicativo, teremos dois grupos de telas. O cara só vê as telas secretas se `token != null`.

```tsx
// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';

// IMPORTAREMOS NOSSAS DUAS PILHAS DE TELAS 
import { AuthStack } from './AuthStack'; // (Tela de Login puramente)
import { AppTabs } from './AppTabs';     // (O Dashboard, Grade de Salas, Clientes, etc)

export function RootNavigator() {
  const { token } = useAuthStore();

  return (
    <NavigationContainer>
      {/* SE O CARA TEM TOKEN, BOTA ELE PRA DENTRO. SE NÃO, TRANCA LOGO NO AUTHSTACK */}
      {token ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
```

---

### Passo 6: Exemplo prático de Regra de Validação ZOD numa Tela

Lembra do Formulário de Checkout / Reserva? Só para mostrar como a camada client side bloca o usuário antes do botão rolar.

```typescript
import { z } from "zod";

export const BookingSchema = z.object({
  patientId: z.string({ required_error: "Selecione o paciente." }),
  roomId: z.string({ required_error: "Selecione a sala antes de avançar." }),
  isTenWeekCycle: z.boolean().default(false),
  timeSlot: z.string().min(5, "Você precisa preencher um bloco (ex: 08:00)"),
});

// Para usar no formulário de reserva, não haverá let's e ifs bagunçados:
// Form validará com React Hook Form: 
// const { control, handleSubmit } = useForm({ resolver: zodResolver(BookingSchema) });
```

### O Que Acontece a Seguir?
Após instalarmos essa base do projeto, o fluxo prossegue na construção bruta dos UI Components (criando botões na cor azul Psychology, botões de switch pro sistema de 10 semanas) até chegar as integrações completas das telas (consumindo os Endpoints). Mãos à obra!
