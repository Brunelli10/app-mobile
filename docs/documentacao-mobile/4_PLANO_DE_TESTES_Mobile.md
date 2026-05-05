# Plano de Testes de Qualidade (QA) - Clínica Mobile

Este documento formaliza os fluxos críticos de negócio que foram recém implementados. Estes passos garantem que nenhum pilar arquitetural da faculdade seja ferido em produção.

## 1. Teste de Blindagem de Agendamento (Regra de 10 Semanas)
**Objetivo:** Garantir que o sistema rejeita tecnicamente qualquer exigência fora das normas acadêmicas.
- [ ] Mapear o caminho até o `Dashboard` > Clicar sobre qualquer "Sala Principal".
- [ ] Ao abrir `SalaDetailsScreen`, tente clicar intensamente no botão de **"+" (Mais Semanas)** no contador.
- [ ] **Resultado Esperado:** O contador deve paralisar e cravar em `10`. O sistema não permitirá selecionar `11` nem enviará número maior pro servidor.

## 2. Teste do Motor Anti-Colisão (Double Booking)
**Objetivo:** Evitar choque frontal de sala. Dois estagiários não podem ocupar a mesma sala no mesmo dia/hora.
- [ ] Pegue uma Sala "X" e reserve para as **14:00**, no Ciclo de 1 Semana.
- [ ] Assim que bater *'Sucesso'*, saia, refaça o fluxo na mesa Sala "X" e tente reservar novamente às **14:00**.
- [ ] **Resultado Esperado:** A tela do App deve subir um Alerta Vermelho com a mensagem *"A sala não está disponível em todas as semanas. Conflito no dia [DATA] às 14:00"*.

## 3. Teste do Muro RBAC (Gestor vs Estagiário)
**Objetivo:** Estagiários precisam sofrer de "visão-túnel", enxergando apenas seus próprios pacientes.
- [ ] Certifique-se de que sua conta no Banco de Dados SQLite tem o `perfil: "ESTAGIARIO"`.
- [ ] Faça um agendamento novo e vá para Aba **Agenda**.
- [ ] **Resultado Esperado:** A lista deve renderizar **somente as sessões** onde o usuário da própria conta efetuou a reserva.
- [ ] (Avançado) Vá no Banco e altere sua conta para `perfil: "GESTOR"`. Atualize o aplicativo. O Gestor deverá visualizar os blocos da faculdade inteira.

## 4. Teste Operacional de Check-in (SessaoDetails)
**Objetivo:** Provar o fluxo terminal de atendimento, gerando o relatório final para as Sessoes.
- [ ] Vá até a Aba **Agenda**.
- [ ] Clique/Toque diretamente sobre *qualquer cartão branco de sessão agendada*.
- [ ] O app deverá engatilhar a navegação (Stack Secundário) rasgando uma tela profunda `SessaoDetailsScreen`.
- [ ] Cheque se o **Nome do Paciente** aparece corretamente renderizado na tela principal.
- [ ] Pressione no grande botão Verde (✔️ Paciente Compareceu). A Tarja Superior deve atualizar instantaneamente de *"REALIZADA (aguardando)"* para **"CONCLUIDA"**.

## 5. Auditoria de Hardware (Estética Inset)
**Objetivo:** Confirmar que o layout não espreme os dedos de celulares Modernos.
- [ ] Em um celular de formato novo (como o iPhone com Dynamic Island e barra de repouso embaixo), visualize a `Bottom Tab Bar`.
- [ ] **Resultado Esperado:** A base preta inferior da barra tem que "respirar", criando um Padding seguro onde os ícones flutuam longe da base do aparelho físico da maçã.
