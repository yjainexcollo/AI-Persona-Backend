const jwt = require("jsonwebtoken");
const config = require("../config");
const ApiError = require("./apiError");
const apiResponse = require("./apiResponse");

/**
 * JWT utility for signing and verifying JSON Web Tokens (access and refresh tokens).
 * Uses config for secret and expiry. Handles errors robustly.
 *
 * Usage:
 *   const jwtUtil = require('./jwt');
 *   const accessToken = jwtUtil.signToken({ userId });
 *   const refreshToken = jwtUtil.signRefreshToken({ userId });
 *   const payload = jwtUtil.verifyToken(accessToken);
 *   const refreshPayload = jwtUtil.verifyRefreshToken(refreshToken);
 */

function signToken(payload, options = {}) {
  const opts = {
    expiresIn: options.expiresIn || config.jwtExpiresIn,
    ...options,
  };
  const token = jwt.sign(payload, config.jwtSecret, opts);
  if (options.apiResponse) {
    return apiResponse({ data: { token }, message: "Token generated" });
  }
  return token;
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired access token");
  }
}

function signRefreshToken(payload, options = {}) {
  const opts = {
    expiresIn: options.expiresIn || config.jwtRefreshExpiresIn,
    ...options,
  };
  return jwt.sign(payload, config.jwtSecret, opts);
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
}

module.exports = {
  signToken,
  verifyToken,
  signRefreshToken,
  verifyRefreshToken,
};
