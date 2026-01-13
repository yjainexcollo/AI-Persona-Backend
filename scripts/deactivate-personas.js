/**
 * Deactivate Specific Personas
 * 
 * This script deactivates 3 personas by setting their isActive flag to false.
 * Deactivated personas will not appear in the frontend but their data is preserved.
 * 
 * Personas to deactivate:
 * - HRIS Lead and Finance Ops/Controller
 * - HR Ops / Payroll Manager
 * - Chief Financial Officer
 * 
 * Usage:
 *   node scripts/deactivate-personas.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const personasToDeactivate = [
  "hris-lead-finance-ops-controller",
  "hr-ops-payroll-manager",
  "chief-financial-officer",
];

async function deactivatePersonas() {
  console.log("\n🔄 Starting Persona Deactivation...\n");

  try {
    // First, check which personas exist
    const existingPersonas = await prisma.persona.findMany({
      where: {
        slug: { in: personasToDeactivate },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    });

    if (existingPersonas.length === 0) {
      console.log("⚠️  No personas found to deactivate.");
      console.log("   Checked slugs:", personasToDeactivate.join(", "));
      return;
    }

    // Deactivate personas in a transaction
    const results = await prisma.$transaction(
      personasToDeactivate.map((slug) =>
        prisma.persona.updateMany({
          where: { slug },
          data: { isActive: false },
        })
      )
    );

    // Print summary
    console.log("=".repeat(60));
    console.log("📊 Deactivation Summary");
    console.log("=".repeat(60));
    
    let totalDeactivated = 0;
    results.forEach((result, index) => {
      const slug = personasToDeactivate[index];
      const persona = existingPersonas.find((p) => p.slug === slug);
      
      if (result.count > 0) {
        console.log(`✅ Deactivated: ${persona?.name || slug} (${result.count} persona)`);
        totalDeactivated += result.count;
      } else {
        console.log(`⚠️  Not found: ${slug}`);
      }
    });

    console.log(`\nTotal deactivated: ${totalDeactivated} personas`);
    console.log("=".repeat(60) + "\n");
    console.log("✅ Persona deactivation completed!");
    console.log("   These personas will no longer appear in the frontend.\n");

  } catch (error) {
    console.error("\n❌ Error during deactivation:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run deactivation
deactivatePersonas()
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });

