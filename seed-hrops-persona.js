const { PrismaClient } = require("@prisma/client");
const { encrypt } = require("./src/utils/encrypt");
require("dotenv").config();

const prisma = new PrismaClient();

const hrOpsPersona = {
  name: "HR Ops / Payroll Manager",
  personalName: "Sarah Chen",
  description:
    "Experienced HR operations and payroll professionals with deep expertise in end-to-end payroll processing, statutory compliance, and employee data management.",
  avatarUrl:
    "https://plus.unsplash.com/premium_photo-1658527049634-15142565537a?q=80&w=776&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  webhookUrl:
    "https://n8n-excollo.azurewebsites.net/webhook/HR-Ops-Payroll-Manager",
  isActive: true,
};

async function seedHrOpsPersona() {
  try {
    console.log(
      "🌱 Starting HR Ops / Payroll Manager persona seeding (basic fields)..."
    );

    // Check if HR Ops persona already exists
    const existingHrOps = await prisma.persona.findFirst({
      where: {
        name: {
          contains: "HR Ops",
        },
      },
    });

    // Check for encryption key
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("ENCRYPTION_KEY environment variable is required");
    }

    if (existingHrOps) {
      console.log(
        `⚠️  HR Ops persona already exists with ID: ${existingHrOps.id}`
      );
      console.log("Updating existing HR Ops persona (basic fields only)...");

      // Update only basic fields
      const updatedPersona = await prisma.persona.update({
        where: { id: existingHrOps.id },
        data: {
          name: hrOpsPersona.name,
          personalName: hrOpsPersona.personalName,
          description: hrOpsPersona.description,
          avatarUrl: hrOpsPersona.avatarUrl,
          webhookUrl: encrypt(hrOpsPersona.webhookUrl, encryptionKey),
          isActive: hrOpsPersona.isActive,
        },
      });

      console.log(
        `✅ Updated HR Ops / Payroll Manager Persona: ${updatedPersona.name}`
      );
      return updatedPersona;
    }

    // Create HR Ops persona with encrypted webhook URL (basic fields only)
    const createdPersona = await prisma.persona.create({
      data: {
        name: hrOpsPersona.name,
        personalName: hrOpsPersona.personalName,
        description: hrOpsPersona.description,
        avatarUrl: hrOpsPersona.avatarUrl,
        webhookUrl: encrypt(hrOpsPersona.webhookUrl, encryptionKey),
        isActive: hrOpsPersona.isActive,
      },
    });

    console.log(
      `✅ Successfully created HR Ops persona: ${createdPersona.name}`
    );
    console.log(`📋 Persona ID: ${createdPersona.id}`);
    console.log(`🔗 Webhook URL (raw): ${hrOpsPersona.webhookUrl}`);

    return createdPersona;
  } catch (error) {
    console.error("❌ Error seeding HR Ops persona:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeder
seedHrOpsPersona()
  .then(() => {
    console.log("🎉 HR Ops / Payroll Manager persona seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 HR Ops persona seeding failed:", error);
    process.exit(1);
  });
