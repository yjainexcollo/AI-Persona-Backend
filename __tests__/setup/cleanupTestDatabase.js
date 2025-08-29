const { PrismaClient } = require("@prisma/client");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.TEST_DATABASE_URL ||
        "postgresql://test:test@localhost:5432/aipersona_test",
    },
  },
});

async function cleanupTestDatabase() {
  try {
    console.log("🧹 Cleaning up test database...");

    // Connect to test database
    await testPrisma.$connect();
    console.log("✅ Connected to test database");

    // Clean all tables
    await testPrisma.$transaction([
      testPrisma.auditEvent.deleteMany(),
      testPrisma.session.deleteMany(),
      testPrisma.emailVerification.deleteMany(),
      testPrisma.passwordResetToken.deleteMany(),
      testPrisma.reaction.deleteMany(),
      testPrisma.messageEdit.deleteMany(),
      testPrisma.message.deleteMany(),
      testPrisma.file.deleteMany(),
      testPrisma.sharedLink.deleteMany(),
      testPrisma.conversation.deleteMany(),
      testPrisma.personaFavourite.deleteMany(),
      testPrisma.persona.deleteMany(),
      testPrisma.user.deleteMany(),
      testPrisma.workspaceDeletion.deleteMany(),
      testPrisma.workspace.deleteMany(),
    ]);

    console.log("✅ Test database cleaned successfully");
  } catch (error) {
    console.error("❌ Error cleaning test database:", error);
    process.exit(1);
  } finally {
    await testPrisma.$disconnect();
  }
}

if (require.main === module) {
  cleanupTestDatabase();
}

module.exports = cleanupTestDatabase;
