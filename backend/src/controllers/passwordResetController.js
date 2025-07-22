const passwordResetService = require("../services/passwordResetService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");
  await passwordResetService.requestPasswordReset(email);
  // Always return success for security (do not reveal if user exists)
  res
    .status(200)
    .json({
      status: "success",
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    throw new ApiError(400, "Token and new password are required");
  await passwordResetService.resetPassword(token, newPassword);
  res
    .status(200)
    .json({
      status: "success",
      message: "Password has been reset successfully.",
    });
});

module.exports = {
  requestPasswordReset,
  resetPassword,
};
