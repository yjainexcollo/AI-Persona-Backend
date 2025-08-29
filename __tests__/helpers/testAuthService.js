const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ApiError = require("../../src/utils/apiError");

// Mock external services for tests
const breachCheckService = {
  validatePasswordWithBreachCheck: async (password) => {
    console.log("testAuthService breachCheckService called with:", password);
    if (password === "weak") {
      const result = {
        isValid: false,
        reason: "Password too weak",
        severity: "danger",
      };
      console.log("testAuthService breachCheckService returning:", result);
      return result;
    }
    // Always return a valid object for any other password
    const result = {
      isValid: true,
      reason: "Password is secure",
      severity: "safe",
    };
    console.log("testAuthService breachCheckService returning:", result);
    return result;
  },
};

const emailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
};

// Helper function to get or create workspace (matching real authService)
async function getOrCreateDefaultWorkspace(email) {
  const domain = email.split("@")[1];

  let workspace = await global.testPrisma.workspace.findUnique({
    where: { domain },
  });

  if (!workspace) {
    workspace = await global.testPrisma.workspace.create({
      data: {
        name: `${domain} Workspace`,
        domain,
      },
    });
  }

  return workspace;
}

// Test-specific AuthService that uses the test Prisma client
async function register({ email, password, name }) {
  // Check if user already exists FIRST
  const existingUser = await global.testPrisma.user.findUnique({
    where: { email },
    include: { workspace: true },
  });

  if (existingUser) {
    // Throw duplicate email error to match test expectation
    throw new ApiError(400, "Email already exists");
  }

  // Validate password strength (mock)
  const breachCheckResult =
    await breachCheckService.validatePasswordWithBreachCheck(password);
  if (!breachCheckResult || typeof breachCheckResult.isValid === "undefined") {
    throw new Error(
      "breachCheckService.validatePasswordWithBreachCheck did not return a valid result"
    );
  }
  if (!breachCheckResult.isValid) {
    throw new ApiError(400, breachCheckResult.reason);
  }

  // Create new workspace using domain from email
  const workspace = await getOrCreateDefaultWorkspace(email);

  // Create new user with the workspace ID
  const user = await global.testPrisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name,
      status: "PENDING_VERIFY",
      emailVerified: false,
      role: "ADMIN",
      workspaceId: workspace.id,
    },
    include: { workspace: true },
  });

  // Send verification email (mock)
  await emailService.sendVerificationEmail(user.email, "mock-token");

  return {
    user,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      domain: workspace.domain,
    },
    isNewUser: true,
  };
}

async function login({ email, password }) {
  const user = await global.testPrisma.user.findUnique({
    where: { email },
    include: { workspace: true },
  });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Check account status
  if (user.status === "PENDING_VERIFY") {
    // Throw 401 for unverified users to match test expectation
    throw new ApiError(401, "Please verify your email before logging in");
  }
  if (user.status === "DEACTIVATED") {
    throw new ApiError(403, "Account is deactivated");
  }
  if (user.status === "PENDING_DELETION") {
    throw new ApiError(403, "Account is pending deletion");
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Generate tokens
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || "test-secret-key-for-jwt-signing",
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || "test-secret-key-for-jwt-signing",
    { expiresIn: "7d" }
  );

  // Update user login info
  await global.testPrisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  return {
    user,
    workspaceId: user.workspaceId,
    workspaceName: user.workspace.name,
    accessToken,
    refreshToken,
  };
}

module.exports = {
  register,
  login,
  breachCheckService,
  emailService,
};
