const { PrismaClient } = require("@prisma/client");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env.test") });

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.TEST_DATABASE_URL ||
        "postgresql://test:test@localhost:5433/aipersona_test",
    },
  },
});

async function setupTestDatabase() {
  try {
    console.log("🔧 Setting up test database...");

    // Connect to test database
    await testPrisma.$connect();
    console.log("✅ Connected to test database");

    // Run migrations
    const { execSync } = require("child_process");
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    });
    console.log("✅ Applied migrations to test database");

    // Generate Prisma client
    execSync("npx prisma generate", { stdio: "inherit" });
    console.log("✅ Generated Prisma client");

    console.log("🎉 Test database setup complete!");
  } catch (error) {
    console.error("❌ Error setting up test database:", error);
    process.exit(1);
  } finally {
    await testPrisma.$disconnect();
  }
}

if (require.main === module) {
  setupTestDatabase();
}

module.exports = setupTestDatabase;
