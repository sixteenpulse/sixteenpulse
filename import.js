const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const prisma = new PrismaClient();

async function runImport() {
  console.log("Reading db_dump.json...");
  const rawData = fs.readFileSync("db_dump.json", "utf-8");
  const data = JSON.parse(rawData);

  console.log("Importing data into Neon...");

  // Import in correct relational order to avoid foreign key errors
  
  if (data.Tenant?.length > 0) {
    await prisma.tenant.createMany({ data: data.Tenant, skipDuplicates: true });
    console.log("Imported Tenants");
  }

  if (data.User?.length > 0) {
    await prisma.user.createMany({ data: data.User, skipDuplicates: true });
    console.log("Imported Users");
  }

  if (data.PushSubscription?.length > 0) {
    await prisma.pushSubscription.createMany({ data: data.PushSubscription, skipDuplicates: true });
    console.log("Imported PushSubscriptions");
  }

  if (data.CalConnection?.length > 0) {
    await prisma.calConnection.createMany({ data: data.CalConnection, skipDuplicates: true });
    console.log("Imported CalConnections");
  }

  if (data.Client?.length > 0) {
    await prisma.client.createMany({ data: data.Client, skipDuplicates: true });
    console.log("Imported Clients");
  }

  if (data.ClientNote?.length > 0) {
    await prisma.clientNote.createMany({ data: data.ClientNote, skipDuplicates: true });
    console.log("Imported ClientNotes");
  }

  if (data.Audience?.length > 0) {
    await prisma.audience.createMany({ data: data.Audience, skipDuplicates: true });
    console.log("Imported Audiences");
  }

  if (data.Campaign?.length > 0) {
    await prisma.campaign.createMany({ data: data.Campaign, skipDuplicates: true });
    console.log("Imported Campaigns");
  }

  if (data.CampaignRecipient?.length > 0) {
    await prisma.campaignRecipient.createMany({ data: data.CampaignRecipient, skipDuplicates: true });
    console.log("Imported CampaignRecipients");
  }

  if (data.Booking?.length > 0) {
    await prisma.booking.createMany({ data: data.Booking, skipDuplicates: true });
    console.log("Imported Bookings");
  }

  if (data.SmtpConfig?.length > 0) {
    await prisma.smtpConfig.createMany({ data: data.SmtpConfig, skipDuplicates: true });
    console.log("Imported SmtpConfigs");
  }

  if (data.ReviewRequestTemplate?.length > 0) {
    await prisma.reviewRequestTemplate.createMany({ data: data.ReviewRequestTemplate, skipDuplicates: true });
    console.log("Imported ReviewRequestTemplates");
  }

  if (data.ReviewRequest?.length > 0) {
    await prisma.reviewRequest.createMany({ data: data.ReviewRequest, skipDuplicates: true });
    console.log("Imported ReviewRequests");
  }

  if (data.InternalFeedback?.length > 0) {
    await prisma.internalFeedback.createMany({ data: data.InternalFeedback, skipDuplicates: true });
    console.log("Imported InternalFeedbacks");
  }

  console.log("Import completed successfully!");
}

runImport()
  .catch((e) => {
    console.error("Error importing data:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
