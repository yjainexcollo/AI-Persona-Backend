/**
 * AuthController - Handles HTTP requests for authentication.
 * Uses asyncHandler for error forwarding and calls authService methods.
 * Returns standardized API responses from the service layer.
 *
 * Extensible for logout, OAuth, email verification, etc.
 */

const authService = require("../services/authService");
const asyncHandler = require("../utils/asyncHandler");

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  const response = await authService.register({ email, password, name });
  res.status(201).json(response);
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const response = await authService.login({ email, password });
  res.status(200).json(response);
});

// POST /api/auth/refresh
const refreshTokens = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const response = await authService.refreshTokens({ refreshToken });
  res.status(200).json(response);
});

module.exports = {
  register,
  login,
  refreshTokens,
};
