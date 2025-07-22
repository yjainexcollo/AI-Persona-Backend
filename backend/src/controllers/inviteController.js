const inviteService = require("../services/inviteService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

const sendInvite = asyncHandler(async (req, res) => {
  const { email, workspaceId, role } = req.body;
  // Require authentication and workspace context (e.g., from authMiddleware)
  const createdById = req.user && req.user.id;
  if (!createdById) throw new ApiError(401, "Authentication required");
  if (!email || !workspaceId)
    throw new ApiError(400, "Email and workspaceId are required");
  const invite = await inviteService.sendInvite({
    email,
    workspaceId,
    role,
    createdById,
  });
  res
    .status(200)
    .json({ status: "success", message: "Invite sent", data: { invite } });
});

const acceptInvite = asyncHandler(async (req, res) => {
  const { token, userId } = req.body;
  // userId can be from req.user (if logged in) or from body (if signup flow)
  const resolvedUserId = userId || (req.user && req.user.id);
  if (!token || !resolvedUserId)
    throw new ApiError(400, "Token and userId are required");
  const invite = await inviteService.acceptInvite(token, resolvedUserId);
  res
    .status(200)
    .json({ status: "success", message: "Invite accepted", data: { invite } });
});

module.exports = {
  sendInvite,
  acceptInvite,
};
