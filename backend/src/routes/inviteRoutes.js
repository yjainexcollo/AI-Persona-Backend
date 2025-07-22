const express = require("express");
const router = express.Router();
const inviteController = require("../controllers/inviteController");
const authMiddleware = require("../middlewares/authMiddleware");
const permissionMiddleware = require("../middlewares/permissionMiddleware");

// Send invite (protected, only users with 'invite_user' permission)
router.post(
  "/send",
  authMiddleware,
  permissionMiddleware("invite_user"),
  inviteController.sendInvite
);

// Accept invite (public)
router.post("/accept", inviteController.acceptInvite);

module.exports = router;
