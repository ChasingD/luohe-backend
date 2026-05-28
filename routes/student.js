const express = require("express");
const router = express.Router();
const { getStudent, updateStudent } = require("../controllers/student");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);
router.get("/", getStudent);
router.put("/", updateStudent);

module.exports = router;
