const bcrypt = require("bcrypt");
const config = require("../config");
const ApiError = require("./apiError");

const SALT_ROUNDS = config.bcryptSaltRounds;

async function hashPassword(plainPassword) {
  if (
    !plainPassword ||
    typeof plainPassword !== "string" ||
    plainPassword.trim() === ""
  ) {
    throw new ApiError(400, "Password is required");
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function verifyPassword(plainPassword, hash) {
  if (
    !plainPassword ||
    typeof plainPassword !== "string" ||
    plainPassword.trim() === "" ||
    !hash ||
    typeof hash !== "string" ||
    hash.trim() === ""
  ) {
    throw new ApiError(400, "Password and hash are required");
  }
  return bcrypt.compare(plainPassword, hash);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
