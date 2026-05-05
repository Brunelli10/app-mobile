# Checkpoint & Contexto: Transição de Sessões

**Data do Ponto de Salvamento:** Abril de 2026
**Objetivo do Arquivo:** Documento central para ser alimentado na IA na próxima sessão, garantindo que o Contexto Arquitetural e a priorização não sejam perdidos.

---

## 1. O Que Foi Construído e Fechado (Status Atual)

O projeto migrou de um MVP visual para um Motor Sistêmico pesado.
1. **Banco de Dados Elevado (Prisma):** Rodamos a migração (`db push`) onde a tabela `Paciente` recebeu a Injeção Fiel de `usuarioId`. Isso permite futuramente que o Aplicativo tenha Login exclusivo de Pacientes.
2. **Sistema de Colisões Ativo:** Rota `/agendamentos` não aceita Double-Booking. Se cruzarem mesma data/hora, ela barra (Status 400).
3. **Bloqueio da Faculdade (RBAC):** `SalaDetailsScreen` não permite solicitar mais do que `10 Semanas` num agendamento.
4. **Visão Túnel do Paciente vs Gestor:** O Backend de `Agenda` checa o Token. Se for "GESTOR", a inteligência libera todos os dados da clínica. Se for aluno, só manda as reservas dele próprio.
5. **Automação de Faltas (Motor Crítico):** A Rota de Check-in (`sessoes.controller.ts`) foi programada para ler históricos. Se o aluno (estatigiário) informar 2 faltas consecutivas, as reservas futuras daquela cadeira caem automaticamente para desafogar a agenda oficial universitária.

---

## 2. 🚨 Bugs Conhecidos para a Próxima Sprint

1. **Problema de Roteamento de Abas:** 
   - **Descrição:** Ao clicar na Aba de "Agenda" (ou qualquer aba adjacente que não seja o Start/Dashboard), ocorre um crash/erro de React Navigation.
   - **Causa Provável:** Na tentativa de plugar a aba exclusiva do `SessaoDetailsScreen`, criei o `AgendaNavigator` dentro de `AppTabs.tsx` e posso ter esquecido algum invólucro ou tipagem do Native Stack. 
   - **Ação Imediata (Next Time):** Debugar `AppTabs.tsx` e o Flow do `AgendaNavigator` antes de qualquer outra coisa.

---

## 3. Os Próximos Passos Gerais (Onde Paramos)

Assim que o Bug de Navegação for morto (Item 2), pularemos cirurgicamente e definitivamente para a construção visual do **Nível 3**:

1. **Bifurcação Mestra (RootNavigator):** Mexer no roteador principal para fazer a triagem baseada no AuthStore. Se o perfil for `PACIENTE`, redirecionar para um arquivo fantasma que precisamos criar: `PacienteTabs.tsx` evitando que ele corrompa o dashboard universitário.
2. **App do Paciente (O Ouro):** Criar a `SessoesDoPacienteScreen.tsx` onde a única coisa que um paciente pode ler e tocar será: Qual dia/sala ele precisa ir, e qual Estagiário foi destinado. Ele terá o botão apenas de Confirmar Ida.
3. **Motor de Reforço (Substituição de Estagiário):** Interface pequena e rápida no App de Gestor para passar a Sessão para o Estagiário Substituto quando alguém ficar doente (preenchendo a coluna `estagiarioSubstitutoId` que foi montada pela inteligência de software original no Banco).
