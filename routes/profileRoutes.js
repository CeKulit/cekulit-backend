const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const authenticateToken = require("../middlewares/authenticateToken");

module.exports = (upload, gcs, bucketName) => {
  router.get("/", authenticateToken, profileController.getProfile);
  router.put("/", upload.single("avatar"), authenticateToken, profileController.updateProfile(upload, gcs, bucketName));
  return router;
};