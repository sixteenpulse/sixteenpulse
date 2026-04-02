const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.calConnection.updateMany({
    where: {
      name: {
        contains: 'Cal.id'
      }
    },
    data: {
      name: "Booking System Calendar"
    }
  });
  console.log('Updated records:', result.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
