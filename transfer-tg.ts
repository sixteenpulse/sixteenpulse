import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find the tenant that has the telegram bot token
    const sourceTenant = await prisma.tenant.findFirst({
        where: { telegram_bot_token: { not: null } }
    });

    if (!sourceTenant) {
        console.log("No tenant has a bot token configured.");
        return;
    }

    console.log(`Source Tenant (with bot token): ${sourceTenant.name} (${sourceTenant.id})`);

    // Find the user that has the telegram chat id in the source tenant
    const sourceUser = await prisma.user.findFirst({
        where: { tenant_id: sourceTenant.id, telegram_chat_id: { not: null } }
    });

    console.log(`Source User (with chat ID): ${sourceUser?.email} (${sourceUser?.telegram_chat_id})`);

    // Find the tenant that has the active Cal.com connection
    // We'll look for 180 Tattoo Studio or the most recently used connection
    const targetConnection = await prisma.calConnection.findFirst({
        where: { status: "CONNECTED" },
        orderBy: { created_at: "desc" },
        include: { tenant: true }
    });

    if (!targetConnection) {
        console.log("No active Cal.com connections found.");
        return;
    }

    const targetTenant = targetConnection.tenant;
    console.log(`Target Tenant (with Cal.com): ${targetTenant.name} (${targetTenant.id})`);

    if (sourceTenant.id === targetTenant.id) {
        console.log("The Cal.com connection and the Telegram bot are already on the same tenant!");
        // Maybe the bot token is on the right tenant but the user chat ID is missing?
        return;
    }

    // Transfer the Bot Token to the Target Tenant
    await prisma.tenant.update({
        where: { id: targetTenant.id },
        data: { telegram_bot_token: sourceTenant.telegram_bot_token }
    });
    console.log(`Copied Bot Token to ${targetTenant.name}`);

    // Transfer the Chat ID to the target user (same email, different tenant)
    if (sourceUser) {
        const targetUser = await prisma.user.findUnique({
            where: { email: sourceUser.email }
        });
        
        if (targetUser) {
            await prisma.user.update({
                where: { id: targetUser.id },
                data: { telegram_chat_id: sourceUser.telegram_chat_id }
            });
            console.log(`Copied Chat ID to user ${targetUser.email} in ${targetTenant.name}`);
        } else {
             // Find any admin user in target tenant
             const fallbackUser = await prisma.user.findFirst({
                 where: { tenant_id: targetTenant.id }
             });
             if (fallbackUser) {
                  await prisma.user.update({
                      where: { id: fallbackUser.id },
                      data: { telegram_chat_id: sourceUser.telegram_chat_id }
                  });
                  console.log(`Copied Chat ID to fallback user ${fallbackUser.email} in ${targetTenant.name}`);
             }
        }
    }
    
    console.log("Transfer complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
