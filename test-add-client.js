const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTestClient() {
    try {
        const tenant = await prisma.tenant.findFirst({ where: { name: "Port Theraphy" } });
        if (tenant) {
            // Check if exists
            const existing = await prisma.client.findFirst({ where: { tenant_id: tenant.id, email: "bhuvanesh@gradientx.in" } });
            if (!existing) {
                await prisma.client.create({
                    data: {
                        tenant_id: tenant.id,
                        name: "Bhuvanesh (Test)",
                        email: "bhuvanesh@gradientx.in",
                        phone: "1234567890"
                    }
                });
                console.log("Added test client bhuvanesh@gradientx.in to Port Theraphy");
            } else {
                console.log("Test client already exists");
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
addTestClient();
