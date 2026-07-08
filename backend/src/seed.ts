import 'dotenv/config';
import { prisma } from './utils/prisma';
import bcrypt from 'bcryptjs';


async function main() {
  // ─── 1. Conta ROOT ──────────────────────────────────────────────────────────
  const rootEmail = 'root@clinica.com';
  let rootUser = await prisma.usuario.findUnique({ where: { email: rootEmail } });

  if (rootUser) {
    console.log('✅ Conta ROOT já existe, pulando criação.');
  } else {
    const hashedPassword = await bcrypt.hash('root123', 10);
    rootUser = await prisma.usuario.create({
      data: {
        nome: 'Administrador Supremo (ROOT)',
        email: rootEmail,
        senhaHash: hashedPassword,
        perfil: 'ROOT',
        status: 'ATIVO',
      }
    });
    console.log(`✅ Conta ROOT criada! ID: ${rootUser.id} | Email: ${rootEmail} | Senha: root123`);
  }

  // ─── 2. Salas Iniciais ───────────────────────────────────────────────────────
  const salasCount = await prisma.sala.count();
  if (salasCount > 0) {
    console.log(`✅ Salas já existem (${salasCount} encontradas), pulando criação.`);
  } else {
    await prisma.sala.createMany({
      data: [
        { nome: 'Sala Infantil', tipo: 'LUDICA',      capacidade: 3,  ativa: true },
        { nome: 'Sala 1',        tipo: 'INDIVIDUAL',  capacidade: 2,  ativa: true },
        { nome: 'Sala 2',        tipo: 'INDIVIDUAL',  capacidade: 2,  ativa: true },
        { nome: 'Sala Grupos',   tipo: 'GRUPO',       capacidade: 10, ativa: true },
      ]
    });
    console.log('✅ Salas iniciais criadas: Sala Infantil, Sala 1, Sala 2, Sala Grupos.');
  }

  // ─── 3. Configuração Padrão ──────────────────────────────────────────────────
  await prisma.configuracao.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, horarioInicio: '08:00', horarioFim: '22:00', diasFuncionamento: '[1,2,3,4,5]' }
  });
  console.log('✅ Configuração padrão verificada/criada.');

  // ─── 4. Estagiário Padrão ────────────────────────────────────────────────────
  const estagiarioEmail = 'estagiario@clinica.com';
  let estagiarioUser = await prisma.usuario.findUnique({ where: { email: estagiarioEmail } });
  let estagiarioRecord;

  if (estagiarioUser) {
    console.log('✅ Usuário Estagiário já existe.');
    estagiarioRecord = await prisma.estagiario.findUnique({ where: { usuarioId: estagiarioUser.id } });
  } else {
    const hashedPassword = await bcrypt.hash('senha123', 10);
    estagiarioUser = await prisma.usuario.create({
      data: {
        nome: 'Estagiário de Testes',
        email: estagiarioEmail,
        senhaHash: hashedPassword,
        perfil: 'ESTAGIARIO',
        status: 'ATIVO',
        estagiario: {
          create: {
            matricula: 'EST-12345',
            cargaHorariaSemanal: 20,
            dataInicio: new Date(),
            ativo: true
          }
        }
      }
    });
    estagiarioRecord = await prisma.estagiario.findUnique({ where: { usuarioId: estagiarioUser.id } });
    console.log(`✅ Estagiário padrão criado! Email: ${estagiarioEmail} | Senha: senha123`);
  }

  // ─── 5. Paciente Padrão ─────────────────────────────────────────────────────
  const pacienteEmail = 'paciente@clinica.com';
  let pacienteUser = await prisma.usuario.findUnique({ where: { email: pacienteEmail } });
  let pacienteRecord;

  if (pacienteUser) {
    console.log('✅ Usuário Paciente já existe.');
    pacienteRecord = await prisma.paciente.findUnique({ where: { usuarioId: pacienteUser.id } });
  } else {
    const hashedPassword = await bcrypt.hash('senha123', 10);
    pacienteUser = await prisma.usuario.create({
      data: {
        nome: 'Paciente de Testes',
        email: pacienteEmail,
        senhaHash: hashedPassword,
        perfil: 'PACIENTE',
        status: 'ATIVO',
        paciente: {
          create: {
            nome: 'Paciente de Testes',
            dataNascimento: new Date('1995-10-25'),
            cpf: '12345678901',
            telefone: '11987654321',
            tipoAtendimento: 'ADULTO',
            ativo: true
          }
        }
      }
    });
    pacienteRecord = await prisma.paciente.findUnique({ where: { usuarioId: pacienteUser.id } });
    console.log(`✅ Paciente padrão criado! Email: ${pacienteEmail} | Senha: senha123`);
  }

  // ─── 6. Agendamento e Sessão de Teste ───────────────────────────────────────
  if (estagiarioRecord && pacienteRecord) {
    const agendamentoExistente = await prisma.agendamento.findFirst({
      where: { estagiarioId: estagiarioRecord.id }
    });

    if (agendamentoExistente) {
      console.log('✅ Agendamento de testes já existe.');
    } else {
      const sala = await prisma.sala.findFirst({ where: { ativa: true } });
      if (sala) {
        // Criar agendamento
        const agendamento = await prisma.agendamento.create({
          data: {
            salaId: sala.id,
            estagiarioId: estagiarioRecord.id,
            diaSemana: new Date().getDay(), // Dia de hoje
            horarioInicio: '14:00',
            horarioFim: '15:00',
            tipo: 'UNICO',
            status: 'CONFIRMADO',
            pacientes: {
              create: {
                pacienteId: pacienteRecord.id
              }
            }
          }
        });

        // Criar sessão de hoje
        const dataSessao = new Date();
        dataSessao.setHours(14, 0, 0, 0);

        await prisma.sessao.create({
          data: {
            agendamentoId: agendamento.id,
            salaId: sala.id,
            horarioInicio: '14:00',
            dataSessao: dataSessao,
            status: 'REALIZADA',
            registradoPorId: rootUser!.id,
            notas: 'Primeira sessão realizada com sucesso. Paciente participativo e comunicativo.'
          }
        });

        console.log('✅ Agendamento e Sessão de teste criados com sucesso!');
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
