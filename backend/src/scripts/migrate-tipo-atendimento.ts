/**
 * Script de migração idempotente: converte tipoAtendimento INDIVIDUAL → ADULTO
 * 
 * Uso: npx ts-node src/scripts/migrate-tipo-atendimento.ts
 * 
 * Seguro para rodar múltiplas vezes — só atualiza registros que ainda têm INDIVIDUAL.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando migração: tipoAtendimento INDIVIDUAL → ADULTO...');

  const result = await prisma.$executeRaw`
    UPDATE "Paciente" 
    SET "tipoAtendimento" = 'ADULTO' 
    WHERE "tipoAtendimento" = 'INDIVIDUAL'
  `;

  console.log(`✅ Migração concluída. ${result} registro(s) atualizado(s).`);

  // Verificação pós-migração
  const remaining = await prisma.paciente.count({
    where: { tipoAtendimento: 'INDIVIDUAL' }
  });

  if (remaining === 0) {
    console.log('✅ Verificação: nenhum registro com INDIVIDUAL restante.');
  } else {
    console.error(`❌ ATENÇÃO: ainda existem ${remaining} registros com INDIVIDUAL!`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro na migração:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
