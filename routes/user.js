const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, deleteAccount } = require("../controllers/user");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.delete("/account", deleteAccount);

module.exports = router;
