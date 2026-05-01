# 🏥 MVP — Sistema de Agendamentos Clínicos

> **Stack:** MySQL · TypeScript · Node.js · Angular · Docker
> **Baseado em análise de:** `Salas_e_horarios.xlsx`

---

## 📋 Índice

1. [Resumo Executivo da Planilha](#1-resumo-executivo-da-planilha)
2. [Ciclo de Vida de Desenvolvimento](#2-ciclo-de-vida-de-desenvolvimento-sdlc)
3. [Modelagem de Dados](#3-modelagem-de-dados-completa)
4. [Arquitetura Técnica e Implementação](#4-arquitetura-técnica-e-implementação)

---

## 1. Resumo Executivo da Planilha

### 1.1 Contexto e Objetivo Atual

A planilha gerencia a **grade semanal de uma clínica-escola de psicologia** com 7 salas, onde estagiários atendem pacientes sob supervisão acadêmica. O sistema atual é uma grade fixa de segunda a sábado, com slots de 50 minutos (08:00–17:50), organizado em abas separadas por sala.

### 1.2 Estrutura de Dados Identificada

| Elemento | Detalhes Encontrados | Observações |
|---|---|---|
| **7 Salas** | Sala 1–4 (individual), Sala Infantil, Sala de Grupos, Sala de Supervisão | Tipos distintos de atendimento |
| **Horários** | 10 slots/dia: 08:00 a 17:50 (50 min + 10 min intervalo) | Segunda a Sábado |
| **Paciente** | Apenas nome — sem ID, CPF, telefone ou histórico | Campo único de texto livre |
| **Estagiário(a)** | Apenas nome — sem matrícula, supervisor ou carga horária | Campo único de texto livre |
| **Anotações (*)** | Marcações como `Mônica 31/10`, `Supervisão Felipe*` | Sem padrão formal — ad hoc |
| **Sala de Grupos** | 1 estagiário para múltiplos pacientes por slot | Estrutura diferente das individuais |
| **Sala de Supervisão** | Uso esporádico para sessões de supervisão acadêmica | Baixa ocupação registrada |

### 1.3 Ineficiências do Processo Manual

> ⚠️ **Problemas críticos identificados na planilha atual**

- **Sem identificação única de pacientes** — nomes repetidos causam ambiguidade (ex: `Ana Carolina` aparece em Sala 1 segunda E sexta — mesma pessoa?)
- **Sem histórico de sessões** — impossível rastrear frequência, faltas ou evolução do paciente
- **Conflitos silenciosos** — um estagiário pode estar alocado em duas salas simultaneamente sem nenhum alerta
- **Anotações informais com asterisco (`*`)** — indicam exceções, mas sem semântica clara ou rastreabilidade
- **Nenhuma separação** entre grade recorrente e agendamentos pontuais (datas específicas misturadas no nome)
- **Gestão de substituições 100% manual** — sem notificação ou registro de quem substituiu quem
- **Ausência de controle de capacidade** da Sala de Grupos (quantos pacientes por sessão?)
- **Sem mecanismo** de confirmação de presença, cancelamento ou lista de espera

### 1.4 Funcionalidades Essenciais do MVP

> ✅ **Escopo do MVP — o que precisa ser entregue**

- **CRUD de Salas:** cadastro com nome, tipo (individual/infantil/grupo/supervisão) e capacidade
- **CRUD de Pacientes:** nome completo, data de nascimento, contato e tipo de atendimento
- **CRUD de Estagiários:** nome, matrícula, supervisor responsável e carga horária semanal
- **Agendamento recorrente semanal:** alocação de (sala, paciente, estagiário, dia, horário)
- **Validação de conflitos em tempo real:** bloquear sobreposição de sala ou estagiário
- **Visualização de grade semanal:** view similar à planilha atual, mas interativa
- **Registro de sessão:** confirmar presença, registrar falta ou cancelamento
- **Agendamentos pontuais:** exceções e substituições com data específica
- **Autenticação e perfis:** Admin, Estagiário e Supervisor com permissões distintas

---

## 2. Ciclo de Vida de Desenvolvimento (SDLC)

> **Stack:** MySQL 8 · Node.js/TypeScript · Angular 17+ · Docker / Docker Compose

---

### 🔷 Fase 1 — Planejamento `1–2 semanas`

| Atividade | Responsável | Entregável / QA |
|---|---|---|
| Levantamento de requisitos com stakeholders clínicos | PO / Arquiteto | Backlog priorizado (Jira/Linear) |
| Definir MVP scope: entidades, fluxos, regras de negócio | Arquiteto | Documento de arquitetura v1 |
| Setup do repositório Git (mono-repo ou separado) | Tech Lead | Repositório com branches strategy |
| Configurar ambientes: dev / staging / prod | DevOps | `docker-compose.yml` base |
| Definir convenções: commits (conventional), lint, PR review | Time | `CONTRIBUTING.md` |

---

### 🔷 Fase 2 — Design `1–2 semanas`

| Atividade | Responsável | Entregável / QA |
|---|---|---|
| Modelagem de banco de dados (DER + migrations) | Arquiteto | Schema SQL revisado |
| Design da API REST: endpoints, contratos (OpenAPI 3.0) | Backend Dev | `swagger.yaml` validado |
| Wireframes das telas principais (grade, cadastros, login) | Frontend Dev | Figma/mockup aprovado |
| Definir strategy de autenticação: JWT + refresh tokens | Arquiteto | Fluxo de auth documentado |
| Revisão de segurança: LGPD, dados de pacientes | PO + Arquiteto | Checklist de conformidade |

---

### 🔷 Fase 3 — Desenvolvimento `4–6 semanas`

| Atividade | Responsável | Entregável / QA |
|---|---|---|
| Backend: setup Express + TypeScript + estrutura MVC | Backend Dev | Projeto rodando com `/health` |
| Migrations e seeds com Knex.js | Backend Dev | DB populado localmente |
| Implementar módulos: Auth, Salas, Pacientes, Estagiários | Backend Dev | Endpoints testados via Swagger |
| Módulo Agendamentos: CRUD + validação de conflitos | Backend Dev | Regras de negócio cobertas |
| Frontend: setup Angular + Material + routing | Frontend Dev | App shell navegável |
| Componentes: grade semanal, formulários de cadastro | Frontend Dev | Componentes com stories |
| Integração frontend–backend via HttpClient + interceptors | Full-stack | Fluxo E2E funcionando |
| Dockerizar backend e frontend | DevOps | `docker-compose up` funciona |

---

### 🔷 Fase 4 — Testes `1–2 semanas`

| Atividade | Responsável | Entregável / QA |
|---|---|---|
| Testes unitários backend: Jest (services, validators) | Backend Dev | Cobertura ≥ 80% em services |
| Testes de integração: supertest nas rotas críticas | Backend Dev | CI passa nas rotas de agend. |
| Testes unitários frontend: Jest + Testing Library | Frontend Dev | Componentes críticos cobertos |
| Testes E2E: Playwright — fluxo de login + agendamento | QA / Dev | Smoke test automatizado |
| Testes de carga: conflito de horários simultâneos | Backend Dev | Nenhuma race condition |
| UAT com usuário clínico (admin da clínica) | PO + Cliente | Sign-off formal do MVP |

---

### 🔷 Fase 5 — Deploy `1 semana`

| Atividade | Responsável | Entregável / QA |
|---|---|---|
| Pipeline CI/CD: GitHub Actions — build, test, push image | DevOps | Pipeline verde no `main` |
| Registry de imagens: Docker Hub ou GitHub Registry | DevOps | Imagens tagueadas por versão |
| Deploy em VPS/cloud: docker-compose | DevOps | URL pública estável |
| Configurar variáveis de ambiente (sem `.env` no repo) | DevOps | Secrets via GitHub/Doppler |
| Backup automático do MySQL: dump diário | DevOps | Backup testado e restaurável |
| Monitoramento básico: uptime check + alertas de erro | DevOps | Alerta configurado |

---

### 2.1 Estratégia de Branches Git

| Branch | Propósito |
|---|---|
| `main` | Código de produção — só recebe merge via PR aprovado com CI verde |
| `develop` | Branch de integração — base para todas as features |
| `feature/*` | Uma branch por funcionalidade (ex: `feature/agendamento-conflito`) |
| `fix/*` | Correções de bug (ex: `fix/login-jwt-expiry`) |
| `release/*` | Preparação de versão com bump de versão e changelog |

---

## 3. Modelagem de Dados Completa

> Todas as entidades possuem `created_at` e `updated_at` implícitos.

---

### 3.1 `usuario`

| Campo | Tipo | Chave | Descrição |
|---|---|---|---|
| `id` | `INT` | 🔑 PK | Identificador único auto-incremento |
| `nome` | `VARCHAR(150)` | | Nome completo do usuário do sistema |
| `email` | `VARCHAR(150)` | `UNIQUE` | Login único |
| `senha_hash` | `VARCHAR(255)` | | Bcrypt hash (custo ≥ 12) |
| `perfil` | `ENUM` | | `admin` \| `estagiario` \| `supervisor` |
| `ativo` | `BOOLEAN` | | Soft delete |
| `created_at` | `DATETIME` | | Data/hora de criação |
| `updated_at` | `DATETIME` | | Atualizado via trigger |

---

### 3.2 `estagiario`

| Campo | Tipo | Chave | Descrição |
|---|---|---|---|
| `id` | `INT` | 🔑 PK | Identificador único |
| `usuario_id` | `INT` | 🔗 FK → `usuario.id` | Login e perfil |
| `supervisor_id` | `INT` | 🔗 FK → `supervisor.id` | Supervisor responsável |
| `matricula` | `VARCHAR(20)` | `UNIQUE` | Número de matrícula institucional |
| `carga_horaria_semanal` | `TINYINT` | | Máximo de horas semanais de atendimento |
| `data_inicio` | `DATE` | | Início do estágio na clínica |
| `data_fim` | `DATE` | | Previsão de encerramento (nullable) |
| `ativo` | `BOOLEAN` | | Soft delete |

---

### 3.3 `supervisor`

| Campo | Tipo | Chave | Descrição |
|---|---|---|---|
| `id` | `INT` | 🔑 PK | Identificador único |
| `usuario_id` | `INT` | 🔗 FK → `usuario.id` | Relação 1:1 |
| `crp` | `VARCHAR(20)` | `UNIQUE` | Registro no Conselho Regional de Psicologia |
| `especialidade` | `VARCHAR(100)` | | Ex: Psicanálise, TCC, Psicologia Infantil |
| `ativo` | `BOOLEAN` | | Soft delete |

---

### 3.4 `paciente`

| Campo | Tipo | Chave | Descrição |
|---|---|---|---|
| `id` | `INT` | 🔑 PK | Identificador único |
| `nome` | `VARCHAR(150)` | | Nome completo |
| `data_nascimento` | `DATE` | | Usada para calcular faixa etária / tipo de sala |
| `cpf` | `VARCHAR(14)` | `UNIQUE` | Nullable para menores |
| `telefone` | `VARCHAR(20)` | | Contato principal |
| `tipo_atendimento` | `ENUM` | | `individual` \| `grupo` \| `infantil` |
| `responsavel_nome` | `VARCHAR(150)` | | Para pacientes menores de 18 anos (nullable) |
| `ativo` | `BOOLEAN` | | Soft delete — histórico preservado |

---

### 3.5 `sala`

| Campo | Tipo | Chave | Descrição |
|---|---|---|---|
| `id` | `INT` | 🔑 PK | Identificador único |
| `nome` | `VARCHAR(80)` | `UNIQUE` | Ex: Sala 1, Sala Infantil |
| `tipo` | `ENUM` | | `individual` \| `infantil` \| `grupo` \| `supervisao` |
| `capacidade` | `TINYINT` | | Máx. de pacientes simultâneos (1 para individuais) |
| `ativa` | `BOOLEAN` | | Controla disponibilidade sem deletar |

---

### 3.6 `agendamento` ⭐

> Entidade central do sistema. Representa um slot recorrente semanal ou um agendamento pontual.

| Campo | Tipo | Chave | Descrição |
|---|---|---|---|
| `id` | `INT` | 🔑 PK | Identificador único |
| `sala_id` | `INT` | 🔗 FK → `sala.id` | Sala alocada |
| `estagiario_id` | `INT` | 🔗 FK → `estagiario.id` | Estagiário responsável |
| `dia_semana` | `TINYINT` | | 0=Dom, 1=Seg…6=Sáb (para recorrente) |
| `horario_inicio` | `TIME` | | Ex: `08:00:00` |
| `horario_fim` | `TIME` | | Ex: `08:50:00` (sempre +50min) |
| `tipo` | `ENUM` | | `recorrente` \| `pontual` |
| `data_especifica` | `DATE` | | Preenchido apenas para `tipo=pontual` (nullable) |
| `status` | `ENUM` | | `ativo` \| `cancelado` \| `suspenso` |
| `observacoes` | `TEXT` | | Equivale ao asterisco da planilha |

---

### 3.7 `sessao`

> Registro de cada ocorrência real de atendimento. Gerada a partir do agendamento.

| Campo | Tipo | Chave | Descrição |
|---|---|---|---|
| `id` | `INT` | 🔑 PK | Identificador único |
| `agendamento_id` | `INT` | 🔗 FK → `agendamento.id` | Agendamento de origem |
| `data_sessao` | `DATE` | | Data real da ocorrência |
| `status` | `ENUM` | | `realizada` \| `falta` \| `cancelada` \| `remarcada` |
| `estagiario_substituto_id` | `INT` | 🔗 FK → `estagiario.id` | Nullable — para substituições |
| `registrado_por` | `INT` | 🔗 FK → `usuario.id` | Quem confirmou a sessão |
| `notas` | `TEXT` | | Anotações resumidas (não prontuário) |

---

### 3.8 `agendamento_pacientes`

> Tabela associativa que permite múltiplos pacientes por slot — necessário para a Sala de Grupos.

| Campo | Tipo | Chave | Descrição |
|---|---|---|---|
| `agendamento_id` | `INT` | 🔑🔗 PK + FK → `agendamento.id` | Parte da chave composta |
| `paciente_id` | `INT` | 🔑🔗 PK + FK → `paciente.id` | Parte da chave composta |
| `data_entrada` | `DATE` | | Quando o paciente entrou no grupo (nullable para individuais) |

---

### 3.9 Mapa de Relacionamentos

| Relacionamento | Cardinalidade | Tipo | Via |
|---|---|---|---|
| `usuario` → `estagiario` | 1 : 1 | Composição | `estagiario.usuario_id` |
| `usuario` → `supervisor` | 1 : 1 | Composição | `supervisor.usuario_id` |
| `supervisor` → `estagiario` | 1 : N | Associação | `estagiario.supervisor_id` |
| `paciente` → `agendamento` | N : N | Associação | `agendamento_pacientes` |
| `estagiario` → `agendamento` | 1 : N | Associação | `agendamento.estagiario_id` |
| `sala` → `agendamento` | 1 : N | Composição | `agendamento.sala_id` |
| `agendamento` → `sessao` | 1 : N | Composição | `sessao.agendamento_id` |
| `estagiario` → `sessao` (substituto) | 0..1 : N | Associação opt. | `sessao.estagiario_substituto_id` |

---

## 4. Arquitetura Técnica e Implementação

---

### 4.1 Backend — Node.js / TypeScript / Express

#### Estrutura de Pastas (MVC + Repository Pattern)

```
src/
├── routes/          # Definição das rotas Express — somente roteamento
├── controllers/     # Recebe req/res, valida input (Zod), chama Service
├── services/        # Regras de negócio — validação de conflito, carga horária
├── repositories/    # Isolamento de SQL (Repository Pattern) — toda query aqui
├── models/          # Interfaces TypeScript das entidades do domínio
├── middlewares/     # Auth JWT, rate limiting, error handler, logging (morgan)
├── config/          # Conexão MySQL (pool), variáveis de env, constantes
└── utils/           # Helpers: formatação de data, validação de CPF, hash

tests/
├── unit/            # Espelha src/services/ e src/utils/
├── integration/     # Espelha src/routes/ — usa supertest
└── e2e/             # Playwright — fluxos completos

Dockerfile           # Imagem Node.js Alpine — build multi-stage
docker-compose.yml   # Orquestra: app + mysql + nginx
```

---

#### Principais Endpoints REST

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/auth/login` | Autenticação — retorna JWT + refresh token |
| `POST` | `/api/auth/refresh` | Renova access token via refresh token |
| `GET` | `/api/salas` | Listar salas (filtro por tipo) |
| `GET` | `/api/pacientes` | Listar pacientes (busca por nome, ativo) |
| `POST` | `/api/pacientes` | Cadastrar novo paciente |
| `GET` | `/api/estagiarios` | Listar estagiários (filtro por supervisor) |
| `GET` | `/api/agendamentos/grade-semanal` | Grade completa — retorna por sala e dia |
| `POST` | `/api/agendamentos` | Criar agendamento — **valida conflito** |
| `PUT` | `/api/agendamentos/:id` | Editar agendamento (com validação) |
| `DELETE` | `/api/agendamentos/:id` | Cancelar/desativar agendamento |
| `POST` | `/api/sessoes/:agendamento_id/confirmar` | Registrar presença/falta da sessão |
| `GET` | `/api/relatorios/carga-estagiario/:id` | Horas semanais do estagiário |

---

#### Regra de Negócio Crítica: Validação de Conflito

> 🔒 **Algoritmo executado em `src/services/agendamento.service.ts`**

Ao criar ou editar um agendamento, a service dispara **3 queries em paralelo** via `Promise.all`:

```typescript
// Query 1 — Conflito de Sala
SELECT COUNT(*) FROM agendamento
WHERE sala_id = ?
  AND dia_semana = ?
  AND status = 'ativo'
  AND horario_inicio < ?      -- fim do novo
  AND horario_fim > ?          -- início do novo

// Query 2 — Conflito de Estagiário (mesma lógica, com estagiario_id)
// Impede estagiário em duas salas no mesmo horário

// Query 3 — Carga horária
-- Soma as horas do estagiário na semana
-- Rejeita se ultrapassar carga_horaria_semanal
```

Se qualquer query retornar `count > 0`, lança `ConflictException` (HTTP 409) com mensagem descritiva. Toda a validação roda dentro de uma **transação MySQL** para garantir consistência em cenários concorrentes.

---

### 4.2 Frontend — Angular 17+

#### Organização de Módulos (Feature-based Architecture)

| Módulo | Responsabilidade |
|---|---|
| `AuthModule` | Login, guards de rota por perfil, interceptor que injeta JWT no header |
| `CoreModule` | Services singleton: `AuthService`, `HttpInterceptor`, `ErrorHandlerService` |
| `SharedModule` | Componentes reutilizáveis: botões, modais, loading spinner, toasts |
| `GradeModule` | Componente principal: grade semanal interativa (7 colunas × 10 slots) |
| `AgendamentoModule` | Formulário de cadastro/edição com validação reativa |
| `PacienteModule` | CRUD completo com busca e paginação |
| `EstagiarioModule` | Gestão de estagiários + visualização de carga horária |
| `SessaoModule` | Tela de confirmação de sessões diárias (check-in de presença/falta) |
| `RelatoriosModule` | Lazy-loaded — relatórios de ocupação de sala e carga de estagiários |

---

#### Padrões de Implementação Angular

> ⚙️ **Decisões técnicas para o MVP**

- **Gestão de estado:** `RxJS BehaviorSubject` em Services — sem NgRx no MVP (over-engineering para esse escopo)
- **HTTP:** um `ApiService` base com métodos tipados + interceptor global para JWT + handler de 401 (redirect ao login)
- **Formulários:** Reactive Forms com validators customizados (ex: horário fim > horário início, CPF válido)
- **Grade semanal:** componente puro com `@Input()` dados — renderiza a matriz `sala×dia×horário` via `*ngFor` aninhado
- **Lazy loading:** `RelatoriosModule` e módulos de CRUD carregados sob demanda (melhora TTI inicial)
- **Feedback:** toast de sucesso/erro em todas operações + spinner global via interceptor HTTP

---

### 4.3 Estratégia de Testes

| Tipo | Ferramenta | Cobertura Alvo | O que testar |
|---|---|---|---|
| Unitário (BE) | Jest | ≥ 80% services | Regras de conflito, cálculo de carga, formatação de horários |
| Unitário (FE) | Jest + Testing Library | Componentes críticos | `GradeComponent` rendering, formulário validações, guards |
| Integração (BE) | Supertest + Jest | Rotas críticas | `POST /agendamentos` com DB real (Docker test DB) |
| E2E | Playwright | Fluxos principais | Login → criar agendamento → confirmar sessão → logout |
| Carga | k6 | Baseline definido | Simular 50 req/s no endpoint de grade semanal |

---

### 4.4 Deploy — Docker e CI/CD

#### Pipeline GitHub Actions (`.github/workflows/main.yml`)

| Step | Trigger | Ação |
|---|---|---|
| **1 — Lint** | Push em qualquer branch | `eslint` + `tsc --noEmit` — falha rápida antes de rodar testes |
| **2 — Test** | Push em qualquer branch | Jest unitários + integração com MySQL service do GitHub Actions |
| **3 — Build** | Push em `main` ou `develop` | `docker build --target production` — multi-stage (build + runtime) |
| **4 — Push** | Push em `main` | `docker push` para registry com tag da versão |
| **5 — Deploy** | Push em `main` | SSH no servidor + `docker-compose pull && docker-compose up -d` |
| **6 — Smoke** | Pós-deploy | `curl /api/health` — falha o job e reverte se não retornar 200 em 30s |

---

#### Estratégia de Versionamento Semântico

> 🏷️ **Versioning e Release Strategy**

- Usar **Semantic Versioning:** `MAJOR.MINOR.PATCH` (ex: `1.0.0` → `1.1.0` → `1.1.1`)
- Tags Git criadas via GitHub Release — aciona automaticamente o pipeline de produção
- `CHANGELOG.md` gerado via `conventional-changelog` a partir dos commits
- Imagens Docker tagueadas com: `:latest` (main), `:SHA_CURTO` (cada build), `:v1.1.0` (releases)
- **Rollback:** manter as 3 últimas imagens no registry — `docker-compose up -d image:versao-anterior`
- Nunca fazer deploy manual em produção — **todo deploy deve passar pelo pipeline CI/CD**

---

### 4.5 Variáveis de Ambiente e Segurança

| Variável | Observação de Segurança |
|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` | Nunca hardcoded — injetar via Docker secrets ou `.env` (não commitado) |
| `DB_USER` / `DB_PASSWORD` | Usuário com permissões mínimas (não root) — `GRANT` apenas no banco da app |
| `JWT_SECRET` | Mínimo 64 chars aleatórios — rotacionar periodicamente |
| `JWT_EXPIRY` / `REFRESH_EXPIRY` | Access token: 15min. Refresh token: 7 dias com rotação |
| `NODE_ENV` | `production` em produção — desativa stack traces em respostas de erro |
| `BCRYPT_ROUNDS` | Mínimo 12 — equilibrar com performance do login |

> 📋 **Nota LGPD:** Dados de pacientes (nome, CPF, data de nascimento, tipo de atendimento) são dados pessoais e potencialmente sensíveis conforme a Lei 13.709/2018. O banco deve ter criptografia em repouso, acesso restrito por rede (sem porta exposta publicamente), backups criptografados e logs de acesso com usuário e timestamp.

---

### 4.6 Resumo da Stack e Próximos Passos além do MVP

| Camada | Tecnologia / Decisão |
|---|---|
| **Banco de Dados** | MySQL 8.0 — transactions, JSON columns para notas, índices em `(sala_id, dia_semana, horario_inicio)` |
| **Backend Runtime** | Node.js 20 LTS + TypeScript 5 — Express 4 |
| **Query Builder** | Knex.js — SQL explícito, migrations versionadas, sem magic de ORM |
| **Validação** | Zod — schema validation com inferência TypeScript automática no controller |
| **Frontend** | Angular 17+ com Signals + Angular Material para componentes UI |
| **Containerização** | Docker 24 + Docker Compose v2 — backend + mysql + nginx (reverse proxy) |
| **CI/CD** | GitHub Actions — gratuito para repos públicos |
| **Pós-MVP (v2)** | Notificações WhatsApp (Twilio/Z-API), prontuário eletrônico, app mobile (Angular + Capacitor) |

---

*Documento gerado com base na análise de `Salas_e_horarios.xlsx`*
