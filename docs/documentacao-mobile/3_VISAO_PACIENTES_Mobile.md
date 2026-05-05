# Visão Futura: Acesso do Paciente (Paciente View)

## 1. Visão Geral
Atualmente, o aplicativo contempla os papéis operacionais (Gestor, Supervisor e Estagiário). No entanto, está planejado que os **Pacientes** também tenham uma interface dedicada para reduzir telefonemas e o atrito na comunicação clínica.

## 2. O Que o Paciente Poderá Fazer?
### Tela Inicial (Dashboard do Paciente)
*   **Próximas Sessões:** Ver o calendário das consultas confirmadas (apenas as dele).
*   **Aviso de Faltas (Justificativa In-App):** Se o paciente sabe que não poderá ir, ele próprio aperta um botão "Desmarcar Próxima a Sessão". O aplicativo imediatamente libera o slot daquela semana para a Clínica.
*   **Histórico e Comparecimento:** Visualizar se o seu ciclo de 10 Semanas já está acabando (barra de progresso).

### Telas de Notificações
*   **Alertas de Remanejamento:** Caso o estagiário fique doente, a clínica aciona o cancelamento, e o app do paciente recebe uma notificação Push avisando, evitando que ele gaste passagem/transporte na data errada.
*   **Avaliação Pós-Sessão:** Feedback direto após a sessão se desejar pontuar algo sobre a estrutura da sala.

## 3. Restrições Arquitetônicas
- Pacientes NUNCA poderão visualizar os nomes ou perfis de outros pacientes.
- O Paciente *não pode agendar sozinho*. O agendamento é feito sempre pelo Estagiário ou Gestor. O app do paciente serve unicamente para visualização, cancelamento pontual e transparência de horários.
- A base de dados (`Paciente` e `AgendamentoPaciente` no Prisma) já sustenta toda essa lógica relacional; só a interface ainda será construída.
