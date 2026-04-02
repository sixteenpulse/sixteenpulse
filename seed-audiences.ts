import { prisma } from "./src/lib/prisma";

async function seed() {
    const tenants = await prisma.tenant.findMany();
    for (const t of tenants) {
        // Check if all clients audience already exists
        const exists = await prisma.audience.findFirst({
            where: { tenant_id: t.id, name: "All Clients" }
        });
        if (!exists) {
            await prisma.audience.create({
                data: {
                    tenant_id: t.id,
                    name: "All Clients",
                    description: "Automatically includes every client in your database",
                    rules: {}
                }
            });
            console.log(`Created All Clients audience for tenant ${t.id}`);
        }
    }
}

seed().catch(console.error);
