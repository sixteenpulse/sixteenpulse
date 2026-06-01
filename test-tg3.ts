import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const connection = await prisma.calConnection.findFirst({
        where: { status: "CONNECTED" },
        include: { tenant: true }
    });
    
    console.log("FIRST CONNECTION:");
    console.log("Tenant ID:", connection?.tenant_id);
    console.log("Tenant Bot Token:", connection?.tenant?.telegram_bot_token);
    
    const users = await prisma.user.findMany({
        where: { tenant_id: connection?.tenant_id },
        select: { id: true, telegram_chat_id: true }
    });
    console.log("USERS for this tenant:", users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
