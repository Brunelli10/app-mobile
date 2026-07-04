import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ─── 1. Conta ROOT ──────────────────────────────────────────────────────────
  const rootEmail = 'root@clinica.com';
  const existingRoot = await prisma.usuario.findUnique({ where: { email: rootEmail } });

  if (existingRoot) {
    console.log('✅ Conta ROOT já existe, pulando criação.');
  } else {
    const hashedPassword = await bcrypt.hash('root123', 10);
    const user = await prisma.usuario.create({
      data: {
        nome: 'Administrador Supremo (ROOT)',
        email: rootEmail,
        senhaHash: hashedPassword,
        perfil: 'ROOT',
        status: 'ATIVO',
      }
    });
    console.log(`✅ Conta ROOT criada! ID: ${user.id} | Email: ${rootEmail} | Senha: root123`);
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
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
