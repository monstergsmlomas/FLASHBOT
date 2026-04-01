import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query'],
});

async function main() {
  // Mostrar qué DB está usando
  const count = await prisma.tenant.count();
  console.log(`Total de Tenants en la DB: ${count}`);

  if (count === 0) {
    console.log('⚠️ La base de datos no tiene ningún Tenant.');
    console.log('   Verificá que DATABASE_URL en .env apunte a la DB correcta (producción/Render).');
    return;
  }

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) return;

  console.log(`📦 Tenant: ${tenant.name} (id: ${tenant.id})`);
  console.log(`   Módulos actuales: [${tenant.modules.join(', ')}]`);

  if (tenant.modules.includes('repairs')) {
    console.log(`✅ El módulo "repairs" ya está activado.`);
    return;
  }

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: { modules: { push: 'repairs' } },
  });

  console.log(`✅ Módulo "repairs" activado.`);
  console.log(`   Módulos nuevos: [${updated.modules.join(', ')}]`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
