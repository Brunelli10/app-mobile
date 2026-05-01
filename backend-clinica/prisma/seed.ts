import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.sala.createMany({
    data: [
      { nome: 'Sala Infantil', tipo: 'LUDICA', capacidade: 3, ativa: true },
      { nome: 'Sala 1', tipo: 'INDIVIDUAL', capacidade: 2, ativa: true },
      { nome: 'Sala 2', tipo: 'INDIVIDUAL', capacidade: 2, ativa: true },
      { nome: 'Sala Grupos', tipo: 'GRUPO', capacidade: 10, ativa: true },
    ]
  })
  console.log("Database seeded successfully with base Rooms!")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
  })
