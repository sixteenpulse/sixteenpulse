require('dotenv').config({ path: 'e:/CAL ID APP/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    console.log("URL:", process.env.DATABASE_URL?.substring(0, 30));
    const result = await prisma.calConnection.updateMany({
        where: { name: { contains: 'Cal.id' } },
        data: { name: "Booking System Calendar" }
    });
    console.log("Updated count:", result.count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
