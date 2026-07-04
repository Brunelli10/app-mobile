# 🧠 Psicologia SEP - Sistema de Gestão de Clínica Escola

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)

Um aplicativo de software de ponta desenvolvido para **digitalizar a gestão de agendas e atendimentos em uma Clínica Escola de Psicologia**, substituindo o controle manual via planilhas. A infraestrutura de dados roda num ambiente moderno de banco relacional utilizando **Neon DB (PostgreSQL)** em Nuvem.

## 🚀 Sobre o Projeto
Este sistema resolve o problema da superlotação e choques de horário nas salas de atendimento. A aplicação impõe **regras de negócio estritas** (como o ciclo de limite de 10 semanas de terapia, conferência de estagiários, e bloqueios contra concorrência temporal em agendamentos).

### 🌟 Principais Features
- 🗓️ **Agendamento Inteligente e Avançado:** Alocação de salas baseada em disponibilidade real, evitando conflitos de horários. Gestores possuem privilégios de alocar sessões diretamente para qualquer estagiário.
- 👨‍💻 **Role-Based Access Control (RBAC):**
  - **ROOT / Gestor:** Visão gerencial total, dashboards gráficos, extração de relatórios (PDF/CSV) e aprovação de cadastros.
  - **Estagiário:** Gerenciamento da própria grade, visualização da sua fila de pacientes e anotações clínicas.
  - **Paciente:** Acesso restrito apenas ao seu próprio histórico e sessões marcadas.
- 🔔 **Central de Notificações Push/In-App:** Sistema ativo de mensageria onde estagiários e gestores são notificados em tempo real sobre alterações nas salas, cancelamentos, novas sessoes, faltas e novas notas de supervisão.
- 👤 **Gestão de Perfil:** Atualização de dados pessoais e alteração de senhas diretamente via aplicativo, com sincronização imediata através de Zustand e React Query.
- 📱 **UI Premium e Fluida:** Design construído com componentes nativos via Expo, focado na melhor experiência do usuário.
- 📊 **Dashboards e Métricas:** Gráficos interativos para acompanhamento de presença, cancelamentos e evolução da clínica.

---

## 🏗️ Arquitetura e Estrutura de Pastas
O projeto segue o modelo de monorepo, separando a API REST (Backend) do Aplicativo Cliente (Mobile).

```
├── backend/                  # ⚙️ API REST (Node.js + Express)
├── mobile/                   # 📱 App Mobile (React Native + Expo)
├── docs/                     # 📖 Documentação, Diagramas e Requisitos
└── infra/                    # 🏗️ Infraestrutura e Scripts
```

---

## 💻 Como Rodar o Projeto (Ambiente de Desenvolvimento)

Nós implementamos o **Concurrently** para facilitar a Developer Experience (DX). Você não precisa subir duas coisas manualmente.

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18+)
- [Expo CLI / Expo Go](https://expo.dev/) no seu celular
- Arquivo `.env` configurado dentro da pasta `backend/` com as chaves do banco (`DATABASE_URL`, contendo acesso ao banco Neon/PostgreSQL).
- Celular e Computador **na mesma rede Wi-Fi**.

### 2. Configuração do IP (Automática)
Não é necessário configurar IPs manualmente. O aplicativo possui script nativo de **detecção dinâmica em tempo de execução** para desenvolvimento local.

### 3. Rodando tudo
Abra o terminal **na raiz do projeto** e rode:

```bash
# 1. Instala as dependências de todo o monorepo
npm run install:all

# 2. Roda as migrações do Banco de Dados Neon (PostgreSQL) e insere o ROOT
cd backend && npx prisma db push && npm run db:seed && cd ..

# 3. Sobe o Backend (Node) e o Frontend (Expo) simultaneamente!
npm start
```

### 🔑 Acessos Iniciais
Você pode usar a conta administrativa (ROOT) injetada no banco por padrão:
- **Email:** `root@clinica.com`
- **Senha:** `root123`

---
*Desenvolvido com 🩵 para a Gestão Clínica Moderna.*