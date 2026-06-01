const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const prisma = new PrismaClient();

async function dump() {
  console.log("Dumping data from Supabase...");

  const data = {};

  data.Tenant = await prisma.tenant.findMany();
  data.User = await prisma.user.findMany();
  data.PushSubscription = await prisma.pushSubscription.findMany();
  data.CalConnection = await prisma.calConnection.findMany();
  data.Booking = await prisma.booking.findMany();
  data.Client = await prisma.client.findMany();
  data.ClientNote = await prisma.clientNote.findMany();
  data.Audience = await prisma.audience.findMany();
  data.Campaign = await prisma.campaign.findMany();
  data.CampaignRecipient = await prisma.campaignRecipient.findMany();
  data.SmtpConfig = await prisma.smtpConfig.findMany();
  data.ReviewRequestTemplate = await prisma.reviewRequestTemplate.findMany();
  data.ReviewRequest = await prisma.reviewRequest.findMany();
  data.InternalFeedback = await prisma.internalFeedback.findMany();

  fs.writeFileSync("db_dump.json", JSON.stringify(data, null, 2));

  console.log("Dump successful! Data saved to db_dump.json");
}

dump()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
