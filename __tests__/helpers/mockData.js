const bcrypt = require("bcrypt");

const mockData = {
  users: {
    valid: {
      email: "test@example.com",
      password: "TestPassword123!",
      name: "Test User",
    },
    invalid: {
      email: "invalid-email",
      password: "weak",
      name: "",
    },
    admin: {
      email: "admin@example.com",
      password: "AdminPassword123!",
      name: "Admin User",
      role: "ADMIN",
    },
  },

  workspaces: {
    valid: {
      name: "Test Workspace",
      domain: "test.com",
      timezone: "UTC",
      locale: "en",
    },
  },

  personas: {
    valid: {
      name: "Test Persona",
      description: "Test Description",
      webhookUrl: "https://test.com/webhook",
      isActive: true,
    },
  },

  conversations: {
    valid: {
      title: "Test Conversation",
      visibility: "PRIVATE",
    },
  },

  messages: {
    valid: {
      content: "Hello, this is a test message",
      role: "USER",
    },
  },
};

module.exports = mockData;
