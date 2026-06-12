# 🧠 Psicologia SEP - Sistema de Gestão de Clínica Escola

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)

Um aplicativo de software de ponta desenvolvido para **digitalizar a gestão de agendas e atendimentos em uma Clínica Escola de Psicologia**, substituindo o controle manual via planilhas.

## 🚀 Sobre o Projeto
Este sistema resolve o problema da superlotação e choques de horário nas salas de atendimento. A aplicação impõe **regras de negócio estritas** (como o ciclo de limite de 10 semanas de terapia) e garante controle de acesso baseado em papéis (RBAC).

A arquitetura do projeto foi dividida em um monorepo que contempla tanto o Backend (API REST) quanto o Frontend (App Mobile).

### 🌟 Principais Features
- 🗓️ **Agendamento Inteligente:** Alocação de salas baseada em disponibilidade real, evitando conflitos de horários.
- 👨‍💻 **Role-Based Access Control (RBAC):**
  - **ROOT / Gestor:** Visão gerencial total, dashboards gráficos, relatórios e controle de aprovação de usuários.
  - **Estagiário:** Gerenciamento da própria grade, visualização apenas dos seus pacientes e anotações clínicas.
  - **Paciente:** Acesso restrito apenas ao seu próprio histórico e sessões marcadas.
- 📱 **UI Premium e Fluida:** Design construído com componentes nativos via Expo, focado na melhor experiência do usuário (UX) em telas mobile.
- 📊 **Dashboards e Métricas:** Gráficos interativos para acompanhamento de presença, cancelamentos e evolução da clínica.

---

## 🏗️ Arquitetura e Estrutura de Pastas
O projeto segue as melhores práticas da Engenharia de Software (MVC no backend, Feature-Sliced no frontend).

```
├── backend/                  # ⚙️ API REST (Node.js + Express)
├── mobile/                   # 📱 App Mobile (React Native + Expo)
├── docs/                     # 📖 Documentação, Diagramas e Requisitos
└── infra/                    # 🏗️ Infraestrutura e Docker Config
```

### 📁 Organização de Pastas
- **`docs/`**: Contém todos os arquivos de planejamento, diagramas de banco de dados (Mermaid) e requisitos do MVP.
- **`infra/`**: Contém o arquivo `docker-compose.yml`, que serve para rodar a API em um ambiente isolado (container), facilitando o deploy futuro.
- **`backend/`**: Servidor da aplicação.
- **`mobile/`**: Aplicativo cliente.

---

## 💻 Como Rodar o Projeto (Ambiente de Desenvolvimento)

Nós implementamos o **Concurrently** para facilitar a sua vida (Developer Experience). Você não precisa subir duas coisas manualmente.

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18+)
- [Expo CLI / Expo Go](https://expo.dev/) no seu celular
- Celular e Computador **na mesma rede Wi-Fi**.

### 2. Configuração do IP (Automática)
Não é necessário configurar IPs manualmente. O aplicativo possui **detecção dinâmica em tempo de execução** para desenvolvimento:
* **Web (Navegador)**: Detecta o host atual e conecta à porta 3000.
* **Celular (Expo Go)**: Detecta o IP do seu computador que enviou o bundle e conecta automaticamente.
*(Nota: Para produção, a URL do backend deve ser fornecida na variável de ambiente `EXPO_PUBLIC_API_URL` durante a geração da build).*

### 3. Rodando tudo com 1 clique
Abra o terminal **na raiz do projeto** e rode:

```bash
# 1. Instala as dependências de todo o monorepo (root, backend, frontend)
npm run install:all

# 2. Roda a inicialização do Banco de Dados
npm run db:push

# 3. Sobe o Backend (Node) e o Frontend (Expo) simultaneamente!
npm start
```

### 🔑 Acessos Iniciais
Você pode usar a conta administrativa (ROOT) injetada no banco por padrão:
- **Email:** `root@clinica.com`
- **Senha:** `root123`

---

## 🔒 Testes e Engenharia (Próximos Passos)
O projeto passou por rigorosos testes end-to-end manuais durante as Sprints de MVP. 
- **Docker:** O uso de Docker foi evitado no Frontend para preservar a facilidade de usar o *Expo Go* (via rede LAN). No futuro, um `docker-compose.yml` será fornecido para orquestração da API e do banco de dados (ex: PostgreSQL) em ambiente de produção (AWS/Render).
- **CI/CD:** Pipelines serão configurados após a estabilização do modelo de negócio (Sprint Final).

---
*Desenvolvido com 🩵 para a Gestão Clínica.*