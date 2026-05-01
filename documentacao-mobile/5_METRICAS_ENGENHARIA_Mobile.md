# Relatório de Diagnóstico Clínico (Engenharia de Software)

Análise Qualitativa e Quantitativa do estado atual do MVP da Clínica de Psicologia SEP, dividida por camadas arquiteturais, revelando o que está blindado e o que corre risco clínico.

---

## 1. Métrica Quantitativa (Prontidão do Sistema Geral)
**Progresso Global Estimado do MVP:** 🟢 **78% Pronto**

### Distribuição Vertical
- **Banco de Dados (SQLite/Prisma):** `95% Concluído` 
  - *Status:* Excelente. Estrutura relacional robusta. O único gargalo final de 5% é exatamente a migração do App do Paciente que autorizamos agora.
- **Backend (Node.js/Express):** `80% Concluído`
  - *Status:* Motor Físico ligado. Double-booking travado, RBAC de 10 Semanas ativo. Abandono por 2 faltas sucessivas validado. Falta apenas o CRUD de Pacientes.
- **Frontend Clínico (Gestor/Estagiário):** `75% Concluído`
  - *Status:* Fluxos Core finalizados. Área Segura nativa implementada. Check-in de Falta funcional. O que falta é a visualização e gestão da lista crua de pacientes (Aba Pacientes do menu).
- **Frontend Paciente (Isolamento):** `0% Concluído`
  - *Status:* Será construído AGORA (Nível 3).
- **Qualidade (Quality Assurance - QA):** `60% Concluído`
  - *Status:* Documentamos os planos de quebra e aplicamos Restrições Formais na UI e Backend. Faltam ser rodados testes automatizados end-to-end ou beta-testing humano prolongado.

---

## 2. Análise Qualitativa (Onde Estamos)
**Forte / À Frente do Prazo:**
- A Lógica de Anti-Colisão (Double Booking) e cancelamentos automáticos está absurdamente acima da linha da base. Muitos softwares universitários têm recepcionistas validando colisões manualmente numa planilha. Aqui, o Node.js derruba requisições hackers imediatamente.
- O Banco Prisma foi uma vitória de engenharia inicial ímpar. O uso de chaves estrangeiras garante integridade dos registros CRP do Estagiário.

**Fraco / Atrás do Prazo:**
- O lado final da ponta ("Cadastrar os dados de Maria, CPF, Nascimento"): ainda não está no aplicativo propriamente dito. O motor ainda guarda o nome dos pacientes no campo provisório de Texto Livre (`observacoes`).

---

## 3. O Próximo "Master Plan" Tático
Com a autorização para aplicarmos a Cirurgia de Banco de Dados de Nível 3, este é o percurso linear de onde iremos agora:

1.  **Imediato (Database):** Injetar `usuarioId` na tabela de paciente e disparar o script de formatação `npx prisma db push`.
2.  **Imediato (Controller):** Ajustar o sistema de Autenticação (`auth.controller.ts`) para gerar Token de Paciente e vincular ao Prontuário.
3.  **Segunda Fase (Frontend Split):** Interromper o fluxo do `RootNavigator` para bifurcar a navegação AppTabs vs PacienteTabs, garantindo que Pacientes nunca, em hipótese remota alguma, acessem Agendas das Salas Clínicas.
4.  **Encerramento do MVP Base:** Liberar a primeira versão instalável via APK (Android) / TestFlight (iOS) para avaliação da Faculdade.
