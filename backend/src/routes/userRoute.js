const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");

// Get current user's profile
router.get("/me", authMiddleware, userController.getProfile);

// Update profile (name/email)
router.put("/me", authMiddleware, userController.updateProfile);

// Change password
router.put("/me/password", authMiddleware, userController.changePassword);

// Deactivate account
router.post("/me/deactivate", authMiddleware, userController.deactivateAccount);

module.exports = router;
