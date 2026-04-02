import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const email = "bhuvanesh@gradientx.in";
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    console.log("User found:", user.email);
  } else {
    console.log("User NOT found. Creating for testing...");
    // We need a tenant first
    const tenant = await prisma.tenant.findFirst();
    if (tenant) {
      const { hash } = require("bcryptjs");
      const password_hash = await hash("84892389", 10);
      await prisma.user.create({
        data: {
          email,
          name: "Bhuvanesh",
          password_hash,
          tenant_id: tenant.id,
          role: "ADMIN"
        }
      });
      console.log("User created successfully!");
    } else {
      console.log("No tenant found. Cannot create user.");
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
