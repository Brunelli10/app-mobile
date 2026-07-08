/**
 * Script de migração idempotente: converte sessões futuras com status REALIZADA → AGENDADA
 * 
 * Contexto: o sistema anteriormente criava sessões com status 'REALIZADA' para representar
 * sessões agendadas (que ainda não aconteceram). Agora o status correto é 'AGENDADA'.
 * Este script corrige apenas sessões com data >= hoje que ainda estão como REALIZADA.
 * 
 * Uso: npx ts-node src/scripts/migrate-status-agendada.ts
 * 
 * Seguro para rodar múltiplas vezes — só atualiza sessões futuras com REALIZADA.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  console.log('🔄 Iniciando migração: sessões futuras REALIZADA → AGENDADA...');
  console.log(`📅 Data de corte: ${hoje.toLocaleDateString('pt-BR')} (hoje)`);

  // Conta antes
  const countAntes = await prisma.sessao.count({
    where: {
      status: 'REALIZADA',
      dataSessao: { gte: hoje }
    }
  });

  console.log(`📊 Sessões futuras com status REALIZADA encontradas: ${countAntes}`);

  if (countAntes === 0) {
    console.log('✅ Nenhuma sessão para migrar. Banco já está atualizado.');
    return;
  }

  // Atualiza
  const result = await prisma.sessao.updateMany({
    where: {
      status: 'REALIZADA',
      dataSessao: { gte: hoje }
    },
    data: { status: 'AGENDADA' }
  });

  console.log(`✅ Migração concluída. ${result.count} sessão(ões) atualizada(s) para AGENDADA.`);

  // Verificação pós-migração
  const remaining = await prisma.sessao.count({
    where: {
      status: 'REALIZADA',
      dataSessao: { gte: hoje }
    }
  });

  if (remaining === 0) {
    console.log('✅ Verificação: nenhuma sessão futura com REALIZADA restante.');
  } else {
    console.error(`❌ ATENÇÃO: ainda existem ${remaining} sessões futuras com REALIZADA!`);
    process.exit(1);
  }

  // Info adicional
  const totalAgendadas = await prisma.sessao.count({ where: { status: 'AGENDADA' } });
  const totalRealizadas = await prisma.sessao.count({ where: { status: 'REALIZADA' } });
  console.log(`\n📊 Estado final do banco:`);
  console.log(`   - AGENDADA: ${totalAgendadas} sessões`);
  console.log(`   - REALIZADA: ${totalRealizadas} sessões (passadas, check-in feito)`);
}

main()
  .catch((e) => {
    console.error('❌ Erro na migração:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
