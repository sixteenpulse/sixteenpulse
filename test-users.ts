import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const boldLabsUsers = await prisma.user.findMany({
        where: { tenant_id: "cmpv0vydo0000kw04xi2exdpi" }
    });
    console.log("Bold Labs users:", boldLabsUsers.map(u => ({ id: u.id, tg: u.telegram_chat_id })));
    
    const tattooUsers = await prisma.user.findMany({
        where: { tenant_id: "cmp72w4390000l10465m8zogk" }
    });
    console.log("180 Tattoo Studio users:", tattooUsers.map(u => ({ id: u.id, tg: u.telegram_chat_id })));
    
    const allRecentBookings = await prisma.booking.findMany({
        orderBy: { created_at: "desc" },
        take: 5
    });
    console.log("Recent Bookings:", allRecentBookings.map(b => ({ id: b.id, tenant: b.tenant_id, name: b.attendee_name })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
