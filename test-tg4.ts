import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const connections = await prisma.calConnection.findMany({
        where: { status: "CONNECTED" },
        orderBy: { created_at: "desc" },
        include: { tenant: true }
    });
    
    console.log(`Found ${connections.length} connected connections:`);
    for (const c of connections) {
        console.log(`- Connection ID: ${c.id}`);
        console.log(`  Tenant ID: ${c.tenant_id}`);
        console.log(`  Tenant Name: ${c.tenant.name}`);
        console.log(`  Cal Account ID: ${c.cal_account_id}`);
        console.log(`  Bot Token: ${c.tenant.telegram_bot_token ? "YES" : "NO"}`);
        console.log(`  Created At: ${c.created_at}`);
        console.log("-----------------------------------------");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
