const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const tenants = await prisma.tenant.findMany();
        for (let t of tenants) {
            const clients = await prisma.client.findMany({ where: { tenant_id: t.id } });
            console.log(`Tenant ${t.name} (id: ${t.id}) has ${clients.length} clients`);
            if (clients.length > 0) {
                console.log("Sample client email:", clients[0].email);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
check();
