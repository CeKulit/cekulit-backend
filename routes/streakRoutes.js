const express = require("express");
const router = express.Router();
const streakController = require("../controllers/streakController");
const authenticateToken = require("../middlewares/authenticateToken");

router.post("/", authenticateToken, streakController.updateStreak);

module.exports = router;