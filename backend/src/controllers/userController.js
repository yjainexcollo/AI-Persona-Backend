const userService = require("../services/userService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

// GET /api/users/me
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) throw new ApiError(401, "Authentication required");
  const profile = await userService.getProfile(userId);
  res.status(200).json({ status: "success", data: { user: profile } });
});

// PUT /api/users/me
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) throw new ApiError(401, "Authentication required");
  const { name, email } = req.body;
  const user = await userService.updateProfile(userId, { name, email });
  res
    .status(200)
    .json({ status: "success", message: "Profile updated", data: { user } });
});

// PUT /api/users/me/password
const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) throw new ApiError(401, "Authentication required");
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    throw new ApiError(400, "Current and new password are required");
  await userService.changePassword(userId, currentPassword, newPassword);
  res
    .status(200)
    .json({ status: "success", message: "Password changed successfully" });
});

// POST /api/users/me/deactivate
const deactivateAccount = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) throw new ApiError(401, "Authentication required");
  await userService.deactivateAccount(userId);
  res.status(200).json({ status: "success", message: "Account deactivated" });
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
};
