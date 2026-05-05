# Análise dos Novos Requisitos — Psicologia SEP

> Requisitos enviados pelo Brunelli analisados contra o planejamento atual.
> Cor institucional: **Azul** — identidade visual do Angular Material a seguir.

---

## O que muda no planejamento atual

---

### 1. Novo perfil: `gestor`

**Requisito:** Gestor consegue alterar a reserva do estagiário (sala).

**Impacto:** A entidade `usuario` tinha apenas 3 perfis:
```
admin | estagiario | supervisor
```

Agora passa a ter 4:
```
admin | gestor | supervisor | estagiario
```

**Permissões por perfil:**

| Ação | Admin | Gestor | Supervisor | Estagiário |
|---|---|---|---|---|
| Criar/editar sala | ✅ | ✅ | ❌ | ❌ |
| Reservar sala (10 semanas) | ✅ | ✅ | ❌ | ✅ |
| Alterar reserva de outro | ✅ | ✅ | ❌ | ❌ |
| Ver histórico de consultas | ✅ | ✅ | ✅ | só as suas |
| Cadastrar paciente | ✅ | ✅ | ❌ | ✅ |
| Adicionar obs. delicada | ✅ | ✅ | ✅ | ✅ |

---

### 2. Reserva por 10 semanas consecutivas

**Requisito:** Estagiário reserva a sala no mesmo horário durante 10 semanas seguidas.

**Impacto:** Muda a entidade `agendamento`. Em vez de ser simplesmente `recorrente` ou `pontual`, precisa de:

```
tipo: 'recorrente_semanal' | 'ciclo_10_semanas' | 'pontual'
```

Adicionar campos na tabela `agendamento`:

| Campo novo | Tipo | Descrição |
|---|---|---|
| `total_semanas` | `TINYINT` | Número de semanas do ciclo (padrão: 10) |
| `data_inicio_ciclo` | `DATE` | Data da primeira sessão do ciclo |
| `data_fim_ciclo` | `DATE` | Calculada: data_inicio + (total_semanas × 7 dias) |

A lógica de geração das sessões muda: ao criar um agendamento de 10 semanas, o sistema gera automaticamente 10 registros na tabela `sessao`.

---

### 3. Horários em blocos fixos

**Requisito:** Reserva de salas por horário completo — 9h às 10h, 10h às 11h.

**Impacto:** Os slots deixam de ser flexíveis e passam a ser **blocos de 1 hora fixos**:

```
08:00–09:00
09:00–10:00
10:00–11:00
11:00–12:00
12:00–13:00
13:00–14:00
14:00–15:00
15:00–16:00
16:00–17:00
```

> Atenção: a planilha original tinha slots de 50 minutos (08:00–08:50). Confirmar com o cliente se muda para blocos de 1 hora ou mantém 50 min.

---

### 4. Estagiário só se cadastra com matrícula válida

**Requisito:** Só pode ter cadastro se tiver matrícula na faculdade.

**Impacto:** Já existe o campo `matricula` na entidade `estagiario`. O que muda é a **validação**:

- Campo `matricula` passa a ser **obrigatório** e **não pode ser nulo**
- Adicionar validação de formato da matrícula (ex: somente números, tamanho fixo)
- O admin/gestor é responsável por cadastrar o estagiário — o estagiário não se autocadastra

Sem mudança no schema, apenas na validação Zod:
```typescript
matricula: z.string().min(5).max(20).regex(/^\d+$/, 'Somente números')
```

---

### 5. Cadastro de paciente atualizado

**Requisito:** Nome, Idade, Telefone, E-mail. Se menor de idade → telefone do responsável.

**Impacto:** Atualizar entidade `paciente`:

| Campo | Antes | Depois |
|---|---|---|
| `nome` | ✅ existe | ✅ mantém |
| `data_nascimento` | ✅ existe | ✅ mantém (idade calculada) |
| `cpf` | ✅ existe | ✅ mantém |
| `telefone` | ✅ existe | ✅ mantém |
| `email` | ❌ não existia | ➕ adicionar `VARCHAR(150)` |
| `responsavel_nome` | ✅ existe | ✅ mantém |
| `responsavel_telefone` | ❌ não existia | ➕ adicionar `VARCHAR(20)` |

Regra: se `data_nascimento` indica menor de 18 anos → `responsavel_telefone` obrigatório.

---

### 6. Observação de casos delicados

**Requisito:** Observação de casos delicados.

**Impacto:** Adicionar campo na entidade `sessao` e/ou `agendamento`:

| Campo novo | Tabela | Tipo | Descrição |
|---|---|---|---|
| `caso_delicado` | `agendamento` | `BOOLEAN` | Marca o caso como sensível |
| `obs_delicada` | `agendamento` | `TEXT` | Descrição restrita — visível só para supervisor/gestor/admin |

**Importante:** esse campo precisa de controle de acesso — estagiário não pode ver a observação de outros, apenas a própria.

---

### 7. Lembrete de consulta para o paciente

**Requisito:** Paciente receber um lembrete de consulta.

**Impacto:** Nova funcionalidade — não estava no MVP original. Duas abordagens:

**MVP (simples):** exibir na tela um painel "consultas de hoje/amanhã" para o gestor ligar manualmente.

**Pós-MVP (automatizado):** integração com WhatsApp (Z-API ou Twilio) ou e-mail (Nodemailer) — disparado automaticamente X horas antes da sessão.

> Recomendação: deixar para o pós-MVP. Adicionar apenas o campo `email` no paciente agora para viabilizar no futuro.

---

### 8. Histórico de consultas

**Requisito:** Histórico de consultas.

**Impacto:** Já está coberto pela entidade `sessao` — cada sessão realizada é um registro com data, status e notas. O que precisa é de uma **tela de histórico** no frontend e um endpoint:

```
GET /api/pacientes/:id/historico
GET /api/estagiarios/:id/historico
```

Sem mudança no banco — apenas novos endpoints e tela.

---

### 9. Quantidade de pacientes na consulta

**Requisito:** Quantidade de pacientes na consulta.

**Impacto:** Já coberto pela tabela `agendamento_pacientes` — a contagem é um `COUNT(*)` dessa tabela por agendamento. Adicionar na resposta da grade semanal:

```json
{
  "agendamento_id": 5,
  "sala_nome": "Sala de Grupos",
  "total_pacientes": 8
}
```

Sem mudança no banco — apenas ajuste na query do repository.

---

### 10. Identidade visual — Psicologia SEP

**Requisito:** Nome "Psicologia SEP" + cor azul da psicologia.

**Impacto:** Apenas frontend (Brunelli):
- Nome do sistema: **Psicologia SEP**
- Cor primária Angular Material: `blue` / `#1565C0` (azul psicologia)
- Configurar no `theme.scss` do Angular

---

## Resumo das mudanças no banco de dados

### Tabela `usuario` — alterar ENUM de perfil
```sql
ALTER TABLE usuario MODIFY COLUMN perfil 
ENUM('admin', 'gestor', 'supervisor', 'estagiario') NOT NULL;
```

### Tabela `paciente` — adicionar campos
```sql
ALTER TABLE paciente 
ADD COLUMN email VARCHAR(150) AFTER telefone,
ADD COLUMN responsavel_telefone VARCHAR(20) AFTER responsavel_nome;
```

### Tabela `agendamento` — adicionar campos
```sql
ALTER TABLE agendamento
ADD COLUMN total_semanas TINYINT UNSIGNED DEFAULT 10,
ADD COLUMN data_inicio_ciclo DATE,
ADD COLUMN data_fim_ciclo DATE,
ADD COLUMN caso_delicado BOOLEAN DEFAULT FALSE,
ADD COLUMN obs_delicada TEXT,
MODIFY COLUMN tipo ENUM('recorrente_semanal', 'ciclo_10_semanas', 'pontual') NOT NULL;
```

---

## O que NÃO muda

- Estrutura de pastas do projeto
- Stack tecnológica
- Repository Pattern
- Validação com Zod
- Fluxo de autenticação JWT
- Entidades: `supervisor`, `estagiario`, `sala`, `agendamento_pacientes`, `sessao`
- Pipeline CI/CD (Brunelli)
- Docker setup (Brunelli)

---

## Próximos passos

1. **Victor:** atualizar as migrations existentes antes de rodar
2. **Victor:** criar migration nova para os campos adicionados
3. **Victor:** atualizar schemas Zod com novos campos obrigatórios
4. **Victor:** atualizar guards de permissão para incluir perfil `gestor`
5. **Brunelli:** configurar tema azul no Angular Material
6. **Brunelli:** criar tela de histórico de consultas
7. **Ambos:** atualizar `AGENTS.md` com os novos requisitos
