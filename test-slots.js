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

async function testSlots() {
    const connection = await prisma.calConnection.findFirst({
        where: { status: 'CONNECTED' }
    });

    if (!connection) return console.log("No connection.");

    const apiKey = decrypt(connection.access_token);
    const baseUrl = apiKey.startsWith("calid_") ? "https://api.cal.id" : "https://api.cal.com/v1";
    let headers = { "Content-Type": "application/json" };
    if (apiKey.startsWith("calid_")) headers["Authorization"] = `Bearer ${apiKey}`;

    // Fetch Event types first to get ID
    const evRes = await fetch(`${baseUrl}/event-types${!apiKey.startsWith("calid_") ? `?apiKey=${apiKey}` : ''}`, { headers });
    const evData = await evRes.json();
    const eventTypeId = (apiKey.startsWith("calid_") ? (evData.data || []) : (evData.event_types || []))[0].id;

    // Test /slots endpoint
    // Format required for slots: startTime and endTime in ISO or YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    let url = `${baseUrl}/slots?eventTypeId=${eventTypeId}&startTime=${today}&endTime=${tomorrow}&start=${today}&end=${tomorrow}`;
    if (!apiKey.startsWith("calid_")) url += `&apiKey=${apiKey}`;

    console.log(`Fetching: ${url}`);
    const result = await fetch(url, { headers });
    const data = await result.json();

    console.log("Slots Payload:");
    console.log(JSON.stringify(data, null, 2).substring(0, 1000));
}

testSlots().finally(() => prisma.$disconnect());
