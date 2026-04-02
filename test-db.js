const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('Testing connection to Supabase...');
  try {
    const tenantsCount = await prisma.tenant.count();
    const activeCron = await prisma.$queryRaw`SELECT 1 as is_active`;
    
    console.log('✅ DATABASE IS LIVE AND RESPONDING!');
    console.log('✅ Current Tenants in DB:', tenantsCount);
    console.log('✅ Cron Keep-Alive Simulation Output:', activeCron);
  } catch (e) {
    console.error('❌ Connection Failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
