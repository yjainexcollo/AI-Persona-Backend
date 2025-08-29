const { PrismaClient } = require("@prisma/client");
const { encrypt } = require("./src/utils/encrypt");
require("dotenv").config();

const prisma = new PrismaClient();

const hrisFinancePersona = {
  name: "HRIS Lead and Finance Ops/Controller",
  personalName: "Michael Rodriguez",
  description:
    "Experienced HRIS and Finance operations professional with expertise in HR technology systems, financial controls, and operational processes.",
  avatarUrl:
    "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  webhookUrl:
    "https://n8n-excollo.azurewebsites.net/webhook/HRIS-Lead-and-Finance-Ops-Controller",
  isActive: true,
};

async function seedHrisFinancePersona() {
  try {
    console.log(
      "🌱 Starting HRIS Lead and Finance Ops/Controller persona seeding (basic fields)..."
    );

    // Check if persona already exists
    const existing = await prisma.persona.findFirst({
      where: { name: { contains: "HRIS Lead" } },
    });

    // Check for encryption key
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("ENCRYPTION_KEY environment variable is required");
    }

    if (existing) {
      console.log(`⚠️  Persona already exists with ID: ${existing.id}`);
      console.log("Updating existing persona (basic fields only)...");

      const updated = await prisma.persona.update({
        where: { id: existing.id },
        data: {
          name: hrisFinancePersona.name,
          personalName: hrisFinancePersona.personalName,
          description: hrisFinancePersona.description,
          avatarUrl: hrisFinancePersona.avatarUrl,
          webhookUrl: encrypt(hrisFinancePersona.webhookUrl, encryptionKey),
          isActive: hrisFinancePersona.isActive,
        },
      });

      console.log(
        `✅ Updated HRIS Lead and Finance Ops/Controller Persona: ${updated.name}`
      );
      return updated;
    }

    // Create persona (basic fields only)
    const created = await prisma.persona.create({
      data: {
        name: hrisFinancePersona.name,
        personalName: hrisFinancePersona.personalName,
        description: hrisFinancePersona.description,
        avatarUrl: hrisFinancePersona.avatarUrl,
        webhookUrl: encrypt(hrisFinancePersona.webhookUrl, encryptionKey),
        isActive: hrisFinancePersona.isActive,
      },
    });

    console.log(`✅ Successfully created persona: ${created.name}`);
    console.log(`📋 Persona ID: ${created.id}`);
    console.log(`🔗 Webhook URL (raw): ${hrisFinancePersona.webhookUrl}`);

    return created;
  } catch (error) {
    console.error("❌ Error seeding HRIS Finance persona:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeder
seedHrisFinancePersona()
  .then(() => {
    console.log(
      "🎉 HRIS Lead and Finance Ops/Controller persona seeding completed!"
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 HRIS Finance persona seeding failed:", error);
    process.exit(1);
  });
