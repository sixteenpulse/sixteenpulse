import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { telegram_bot_token: { not: null } }
  });
  
  const user = await prisma.user.findFirst({
    where: { telegram_chat_id: { not: null } }
  });

  console.log("Tenant bot token:", tenant?.telegram_bot_token ? "EXISTS" : "MISSING");
  console.log("User chat ID:", user?.telegram_chat_id);

  if (tenant?.telegram_bot_token && user?.telegram_chat_id) {
    const tgToken = tenant.telegram_bot_token;
    const chatId = user.telegram_chat_id;
    const message = "Test message from CLI";
    const url = `https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;
    
    console.log("Sending to URL:", url.replace(tgToken, 'HIDDEN_TOKEN'));
    
    const res = await fetch(url);
    const data = await res.json();
    console.log("Telegram Response:", data);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
