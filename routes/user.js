const express = require("express");
const router = express.Router();
const { getProfile, updateProfile } = require("../controllers/user");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

module.exports = router;
