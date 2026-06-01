import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { telegram_bot_token: { not: null } }
  });

  const dbToken = tenant?.telegram_bot_token || "";
  const hardcodedToken = "8857459366:AAETwVlN8APkDRgJkdcMBA3bG-rq_BrWamQ";

  console.log("Token in database length:", dbToken.length);
  console.log("Correct token length:", hardcodedToken.length);
  
  if (dbToken !== hardcodedToken) {
      console.log("Tokens do NOT match!");
      console.log("DB Token:       ", dbToken);
      console.log("Hardcoded Token:", hardcodedToken);
  } else {
      console.log("Tokens match exactly!");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
