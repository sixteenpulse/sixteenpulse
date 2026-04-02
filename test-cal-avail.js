require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

function decrypt(encrypted) {
    const ALGORITHM = "aes-256-gcm";
    const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
    const [ivB64, authTagB64, ciphertext] = encrypted.split(":");

    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}

async function testAvailability() {
    console.log("Fetching active connections...");
    const connections = await prisma.calConnection.findMany({
        where: { status: 'CONNECTED' },
        take: 2 // get up to 2 strictly to avoid logging too many
    });

    if (connections.length === 0) {
        console.log("No connections found.");
        return;
    }

    const today = new Date().toISOString().split("T")[0];

    for (const conn of connections) {
        const apiKey = decrypt(conn.access_token);
        const baseUrl = apiKey.startsWith("calid_") ? "https://api.cal.id" : "https://api.cal.com/v1";

        console.log(`\n\n=== Testing connection for Tenant ${conn.tenant_id} (Type: ${apiKey.startsWith('calid_') ? 'Cal.id' : 'Cal.com'}) ===`);

        let headers = { "Content-Type": "application/json" };
        let url = `${baseUrl}/event-types`;

        if (apiKey.startsWith("calid_")) {
            headers["Authorization"] = `Bearer ${apiKey}`;
        } else {
            url += `?apiKey=${apiKey}`;
        }

        console.log(`-> Fetching Event Types...`);
        const evRes = await fetch(url, { headers });
        const evData = await evRes.json();

        const eventTypes = apiKey.startsWith("calid_") ? (evData.data || []) : (evData.event_types || []);
        if (eventTypes.length === 0) {
            console.log("No event types found, cannot test availability.");
            continue;
        }

        const eventTypeId = eventTypes[0].id;
        console.log(`Found EventType ID: ${eventTypeId}`);

        let availUrl = `${baseUrl}/availability?dateFrom=${today}&dateTo=${today}&eventTypeId=${eventTypeId}`;
        if (!apiKey.startsWith("calid_")) {
            availUrl += `&apiKey=${apiKey}`;
        }

        console.log(`-> Fetching Availability from ${availUrl}`);
        const result = await fetch(availUrl, { headers });
        const availData = await result.json();

        console.log("\nAvailability Payload:");
        console.log(JSON.stringify(availData, null, 2).slice(0, 1500) + "... (truncated)");
    }
}

testAvailability().finally(() => prisma.$disconnect());
