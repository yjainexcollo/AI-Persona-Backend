/**
 * Seed Routes - Database seeding endpoints (use only once in production)
 */

const express = require("express");
const router = express.Router();
const prisma = require("../utils/prisma");
const { encrypt } = require("../utils/encrypt");
const logger = require("../utils/logger");

/**
 * GET /api/seed/personas - Get personas without authentication (for testing)
 */
router.get("/personas", async (req, res) => {
  try {
    const personas = await prisma.persona.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        personalName: true,
        personaRole: true,
        about: true,
        traits: true,
        painPoints: true,
        coreExpertise: true,
        communicationStyle: true,
        keyResponsibility: true,
        description: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      message: "Personas retrieved successfully",
      data: personas,
    });
  } catch (error) {
    logger.error("Error fetching personas:", error);
    res.status(500).json({
      error: "Failed to fetch personas",
      details: error.message,
    });
  }
});

/**
 * POST /api/seed/personas - Seed personas into database
 */
router.post("/personas", async (req, res) => {
  try {
    logger.info("Starting persona seeding...");

    const personas = [
      {
        name: "HR Ops / Payroll Manager",
        personalName: "Sarah Chen",
        personaRole: "Payroll Manager",
        about: "Experienced HR operations and payroll professional with deep expertise in end-to-end payroll processing",
        traits: ["Detail-oriented", "Compliance-focused", "Process-driven"],
        painPoints: ["Complex payroll regulations", "Manual data entry", "Compliance tracking"],
        coreExpertise: ["Payroll Processing", "Statutory Compliance", "Employee Data Management"],
        communicationStyle: "Professional and precise",
        keyResponsibility: ["End-to-end payroll processing", "Regulatory compliance", "Employee records management"],
        description: "Experienced HR operations and payroll professional",
        avatarUrl: "https://plus.unsplash.com/premium_photo-1658527049634-15142565537a?q=80&w=776&auto=format&fit=crop",
        webhookUrl: "https://n8n-excollo.azurewebsites.net/webhook/HR-Ops-Payroll-Manager",
        isActive: true,
      },
      {
        name: "HRIS / Finance Support",
        personalName: "Michael Rodriguez",
        personaRole: "HRIS Specialist",
        about: "Technical specialist in HR Information Systems and financial operations",
        traits: ["Analytical", "Tech-savvy", "Problem-solver"],
        painPoints: ["System integrations", "Data accuracy", "Reporting complexities"],
        coreExpertise: ["HRIS Management", "Financial Systems", "Data Analysis"],
        communicationStyle: "Technical and solution-oriented",
        keyResponsibility: ["HRIS administration", "Financial reporting", "System integrations"],
        description: "Technical specialist in HR Information Systems",
        avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=774&auto=format&fit=crop",
        webhookUrl: "https://n8n-excollo.azurewebsites.net/webhook/HRIS-Finance-Support",
        isActive: true,
      },
    ];

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return res.status(400).json({ error: "ENCRYPTION_KEY not configured" });
    }

    const results = [];

    for (const persona of personas) {
      // Check if persona already exists
      const existing = await prisma.persona.findFirst({
        where: { name: { contains: persona.name.split("/")[0].trim() } },
      });

      if (existing) {
        logger.info(`Persona already exists: ${persona.name}`);
        results.push({ name: persona.name, status: "already_exists", id: existing.id });
        continue;
      }

      // Encrypt webhook URL
      const encryptedWebhookUrl = encrypt(persona.webhookUrl);

      // Create persona
      const created = await prisma.persona.create({
        data: {
          ...persona,
          webhookUrl: encryptedWebhookUrl,
        },
      });

      logger.info(`Persona created: ${persona.name} (ID: ${created.id})`);
      results.push({ name: persona.name, status: "created", id: created.id });
    }

    res.status(200).json({
      message: "Persona seeding completed",
      results,
    });
  } catch (error) {
    logger.error("Error seeding personas:", error);
    res.status(500).json({
      error: "Failed to seed personas",
      details: error.message,
    });
  }
});

module.exports = router;
