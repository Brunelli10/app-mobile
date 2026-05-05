import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const rootEmail = 'root@clinica.com';
  
  const existingRoot = await prisma.usuario.findUnique({
    where: { email: rootEmail }
  });

  if (existingRoot) {
    console.log('Conta ROOT já existe!');
    return;
  }

  const hashedPassword = await bcrypt.hash('root123', 10);

  const user = await prisma.usuario.create({
    data: {
      nome: 'Administrador Supremo (ROOT)',
      email: rootEmail,
      senhaHash: hashedPassword,
      perfil: 'ROOT'
    }
  });

  console.log(`Conta ROOT criada com sucesso! ID: ${user.id}`);
  console.log(`Email: ${rootEmail} | Senha: root123`);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
