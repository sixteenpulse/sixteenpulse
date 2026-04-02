const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const tenants = await prisma.tenant.findMany();
        let changed = 0;
        for (let t of tenants) {
            const aud = await prisma.audience.findMany({ where: { tenant_id: t.id } });
            console.log(`Tenant ${t.id} has ${aud.length} audiences`);
            if (aud.length === 0) {
                await prisma.audience.create({
                    data: {
                        tenant_id: t.id,
                        name: "All Clients",
                        description: "Every client automatically added",
                        rules: {}
                    }
                });
                console.log("Created ALL CLIENTS audience");
                changed++;
            }
        }
        console.log(`Done. Changed ${changed}`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
check();
