const adminService = require("../services/adminService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

// GET /api/admin/users
const listUsers = asyncHandler(async (req, res) => {
  const { skip, take, search } = req.query;
  const result = await adminService.listUsers({
    skip: skip ? parseInt(skip) : 0,
    take: take ? parseInt(take) : 20,
    search: search || "",
  });
  res.status(200).json({ status: "success", ...result });
});

// GET /api/admin/users/:id
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await adminService.getUser(id);
  res.status(200).json({ status: "success", user });
});

// POST /api/admin/users/:id/activate
const activateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await adminService.activateUser(id);
  res.status(200).json({ status: "success", message: "User activated", user });
});

// POST /api/admin/users/:id/deactivate
const deactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await adminService.deactivateUser(id);
  res
    .status(200)
    .json({ status: "success", message: "User deactivated", user });
});

// GET /api/admin/workspaces
const listWorkspaces = asyncHandler(async (req, res) => {
  const { skip, take, search } = req.query;
  const result = await adminService.listWorkspaces({
    skip: skip ? parseInt(skip) : 0,
    take: take ? parseInt(take) : 20,
    search: search || "",
  });
  res.status(200).json({ status: "success", ...result });
});

// GET /api/admin/workspaces/:id
const getWorkspace = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const workspace = await adminService.getWorkspace(id);
  res.status(200).json({ status: "success", workspace });
});

// POST /api/admin/workspaces/:id/activate
const activateWorkspace = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const workspace = await adminService.activateWorkspace(id);
  res
    .status(200)
    .json({ status: "success", message: "Workspace activated", workspace });
});

// POST /api/admin/workspaces/:id/deactivate
const deactivateWorkspace = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const workspace = await adminService.deactivateWorkspace(id);
  res
    .status(200)
    .json({ status: "success", message: "Workspace deactivated", workspace });
});

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getStats();
  res.status(200).json({ status: "success", stats });
});

module.exports = {
  listUsers,
  getUser,
  activateUser,
  deactivateUser,
  listWorkspaces,
  getWorkspace,
  activateWorkspace,
  deactivateWorkspace,
  getStats,
};
