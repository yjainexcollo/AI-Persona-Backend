// src/graphql/context.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async ({ req }) => {
  // Extract user from request (e.g., JWT, session) in future
  return {
    prisma,
    req,
    // user: ... (add user extraction logic here)
  };
};
