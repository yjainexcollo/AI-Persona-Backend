/**
 * Seed 5 Production Personas with Encrypted Webhook URLs
 * 
 * This script creates/updates 5 personas with their corresponding n8n webhook URLs.
 * Webhook URLs are encrypted using ENCRYPTION_KEY before storage.
 * 
 * Note: The following personas have been deactivated and are not included:
 * - HRIS Lead and Finance Ops/Controller
 * - HR Ops / Payroll Manager
 * - Chief Financial Officer
 * 
 * Usage:
 *   npm run seed:personas
 * 
 * Features:
 *   - Idempotent (safe to run multiple times)
 *   - Upserts by slug (stable identifier)
 *   - Encrypts webhook URLs
 *   - Validates ENCRYPTION_KEY
 *   - Transaction-safe
 */

const { PrismaClient } = require("@prisma/client");
const { encrypt } = require("../src/utils/encrypt");

const prisma = new PrismaClient();

// Validate ENCRYPTION_KEY
function validateEncryptionKey() {
    if (!process.env.ENCRYPTION_KEY) {
        console.error("❌ ENCRYPTION_KEY environment variable is not set");
        console.error("   Please set ENCRYPTION_KEY in your .env file");
        process.exit(1);
    }

    console.log("✅ ENCRYPTION_KEY found");
}

// Define 5 personas with their n8n webhook URLs and avatar URLs
// Removed personas: HRIS Lead, HR Ops/Payroll Manager, CFO (deactivated)
// Note: All webhook URLs must include /chat/ in the path for validation
const PERSONAS = [
    {
        name: "Chief Business Officer",
        slug: "chief-business-officer",
        personalName: "Jennifer Park",
        personaRole: "Chief Business Officer (CBO)",
        webhookUrlRaw: "https://n8n-excollo.azurewebsites.net/webhook/chat/Chief-Business-Officer",
        avatarUrl: "/avatars/chief-business-officer.png",
        about: "Business strategy expert driving operational excellence and partnerships",
        communicationStyle: "Strategic and collaborative",
    },
    {
        name: "Head of Revenue Operations and Growth Strategy",
        slug: "head-revenue-ops-growth-strategy",
        personalName: "Marcus Foster",
        personaRole: "Head of Revenue Operations and Growth Strategy",
        webhookUrlRaw: "https://n8n-excollo.azurewebsites.net/webhook/chat/Head-of-revenue-Operations-and-Growth-Strategy",
        avatarUrl: "/avatars/head-revenue-ops-growth-strategy.png",
        about: "Revenue optimization expert focused on scalable growth strategies",
        communicationStyle: "Results-driven and analytical",
    },
    {
        name: "Chief Marketing Officer",
        slug: "chief-marketing-officer",
        personalName: "Lisa Martinez",
        personaRole: "Chief Marketing Officer (CMO)",
        webhookUrlRaw: "https://n8n-excollo.azurewebsites.net/webhook/chat/Chief-Marketing-Officer",
        avatarUrl: "/avatars/chief-marketing-officer.png",
        about: "Marketing leader driving brand strategy and customer acquisition",
        communicationStyle: "Creative and customer-focused",
    },
    {
        name: "Chief Executive Officer",
        slug: "chief-executive-officer",
        personalName: "Robert Anderson",
        personaRole: "Chief Executive Officer (CEO)",
        webhookUrlRaw: "https://n8n-excollo.azurewebsites.net/webhook/chat/Chief-Executive-Officer",
        avatarUrl: "/avatars/chief-executive-officer.png",
        about: "Visionary leader setting company direction and culture",
        communicationStyle: "Visionary and inspiring",
    },
    {
        name: "Chief Product Officer",
        slug: "chief-product-officer",
        personalName: "Emily Zhang",
        personaRole: "Chief Product Officer (CPO)",
        webhookUrlRaw: "https://n8n-excollo.azurewebsites.net/webhook/chat/Chief-Product-Officer",
        avatarUrl: "/avatars/chief-product-officer.png",
        about: "Product strategy expert focused on innovation and user experience",
        communicationStyle: "User-centric and innovative",
    },
];

async function seedPersonas() {
    console.log("\n🌱 Starting Persona Seeding...\n");

    // Validate environment
    validateEncryptionKey();

    const results = {
        created: [],
        updated: [],
        errors: [],
    };

    try {
        // Use transaction for atomicity
        await prisma.$transaction(async (tx) => {
            for (const personaData of PERSONAS) {
                try {
                    console.log(`Processing: ${personaData.name}...`);

                    // Encrypt webhook URL
                    const encryptedWebhookUrl = encrypt(
                        personaData.webhookUrlRaw,
                        process.env.ENCRYPTION_KEY
                    );

                    // Prepare data for upsert
                    const data = {
                        name: personaData.name,
                        slug: personaData.slug,
                        personalName: personaData.personalName,
                        personaRole: personaData.personaRole,
                        webhookUrl: encryptedWebhookUrl,
                        avatarUrl: personaData.avatarUrl || null,
                        about: personaData.about,
                        communicationStyle: personaData.communicationStyle,
                        isActive: true,
                    };

                    // Upsert by slug (stable identifier)
                    const persona = await tx.persona.upsert({
                        where: { slug: personaData.slug },
                        update: {
                            ...data,
                            updatedAt: new Date(),
                        },
                        create: data,
                    });

                    // Track result
                    const wasCreated = persona.createdAt.getTime() === persona.updatedAt.getTime();
                    if (wasCreated) {
                        results.created.push({
                            id: persona.id,
                            name: persona.name,
                            slug: persona.slug,
                        });
                        console.log(`  ✅ Created: ${persona.name} (${persona.id})`);
                    } else {
                        results.updated.push({
                            id: persona.id,
                            name: persona.name,
                            slug: persona.slug,
                        });
                        console.log(`  🔄 Updated: ${persona.name} (${persona.id})`);
                    }

                } catch (error) {
                    console.error(`  ❌ Error processing ${personaData.name}:`, error.message);
                    results.errors.push({
                        name: personaData.name,
                        error: error.message,
                    });
                }
            }
        });

        // Print summary
        console.log("\n" + "=".repeat(60));
        console.log("📊 Seeding Summary");
        console.log("=".repeat(60));
        console.log(`✅ Created: ${results.created.length} personas`);
        console.log(`🔄 Updated: ${results.updated.length} personas`);
        console.log(`❌ Errors:  ${results.errors.length} personas`);
        console.log("=".repeat(60) + "\n");

        if (results.created.length > 0) {
            console.log("Created Personas:");
            results.created.forEach((p) => {
                console.log(`  - ${p.name} (${p.slug})`);
                console.log(`    ID: ${p.id}`);
            });
            console.log();
        }

        if (results.updated.length > 0) {
            console.log("Updated Personas:");
            results.updated.forEach((p) => {
                console.log(`  - ${p.name} (${p.slug})`);
                console.log(`    ID: ${p.id}`);
            });
            console.log();
        }

        if (results.errors.length > 0) {
            console.log("Errors:");
            results.errors.forEach((e) => {
                console.log(`  - ${e.name}: ${e.error}`);
            });
            console.log();
        }

        console.log("✅ Persona seeding completed successfully!\n");

    } catch (error) {
        console.error("\n❌ Fatal error during seeding:");
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run seeding
seedPersonas()
    .catch((error) => {
        console.error("Unhandled error:", error);
        process.exit(1);
    });
