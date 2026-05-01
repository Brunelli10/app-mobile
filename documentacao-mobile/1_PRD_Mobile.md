# Product Requirements Document (PRD) – App Clínica (Mobile)

## 1. Visão Geral do Produto
O aplicativo móvel da **Psicologia SEP** nasce para modernizar e blindar contra falhas a gestão de atendimento de pacientes e alocação de salas da clínica de psicologia. Substituindo a "planilha visual", o app garante agendamentos ágeis, proteção de dados e autonomia para todos os perfis da unidade.

## 2. Púbico Alvo e Perfis (Os Atores)

### 2.1 Estagiário (Atendente principal)
*   **O que precisa:** Encontrar salas vazias e reservar sem medo de chocar com outro colega. Reportar a falta de pacientes e acessar a agenda diária rapidamente.
*   **Restrições:** Só pode ver dados atrelados a ele mesmo. Não se autocadastra.

### 2.2 Gestor (Administrador Operacional)
*   **O que precisa:** Resolver problemas de forma rápida. Se um paciente cancelar o plano, o gestor entra no app e cancela todo o bloco de reservas da sala com um clique, liberando-a.
*   **Poderes:** Modifica qualquer agendamento e enxerga relatórios gerenciais e dados sensíveis.

### 2.3 Supervisor
*   **O que precisa:** Um "Raio-X". Precisa entrar rapidamente na conta de um estagiário e avaliar e validar as observações colocadas.

## 3. Funcionalidades Essenciais (MVP)

1.  **Exploração Visual (Grade Semanal):** 
    *   *Como Gestor/Estagiário, quero ver todas as 7 salas e seus status de segunda a sábado (slots de 1h).*
2.  **A "Bala de Prata" do Agendamento (10 Semanas):**
    *   *Como Estagiário, preciso selecionar minha sala, meu paciente, e escolher habilitar o Switch "Reservar por 10 semanas".* O sistema e app calcularão 10 ocorrências consecutivas e travarão a sala.
3.  **Triage de Check-in em 1-click:**
    *   *Como Estagiário, ao terminar a consulta, entro no app, não preciso digitar nada, aperto apenas "✔ Atendido" ou "✖ Faltou" para liberar os cálculos do backend.*
4.  **Cofre de Informações Delicadas:**
    *   Uma caixa de texto protegida apenas para usuários autorizados lerem as observações "psi" (sigilosas) do paciente.

## 4. Requisitos Não Funcionais Críticos
*   **Offline/Conectividade:** Exibir pop-up "Sem conexão com a internet" e travar interações (para evitar um double-booking invisível).
*   **Rapidez:** Da Home Screen até o "Check-in" do paciente devem ocorrer, no máximo, 2 cliques.
*   **Responsividade UI:** Interface precisa ser amigável para dedos usando um celular com uma mão (Componentes largos). Branco e **Azul Psicologia (#1565C0)** sendo dominantes.
