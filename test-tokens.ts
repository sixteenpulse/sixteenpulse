import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true, telegram_bot_token: true }
    });
    
    console.log("Tenants:");
    for (const t of tenants) {
        console.log(`- ${t.name}: Bot Token: ${t.telegram_bot_token ? "YES" : "NO"} (ID: ${t.id})`);
    }
    
    const latestBookings = await prisma.booking.findMany({
        orderBy: { created_at: "desc" },
        take: 3,
        include: { tenant: true }
    });
    
    console.log("\nLatest 3 Bookings:");
    for (const b of latestBookings) {
        console.log(`- ${b.attendee_name} in ${b.tenant.name} (Created: ${b.created_at})`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
