const express = require("express");
const router = express.Router();
const { wechatLogin, phoneLogin, phoneRegister } = require("../controllers/auth");
const { authMiddleware } = require("../middleware/auth");

// 微信登录
router.post("/wechat-login", wechatLogin);
// 手机号登录
router.post("/phone-login", phoneLogin);
// 手机号注册
router.post("/phone-register", phoneRegister);
// 获取当前用户信息（需登录）
router.get("/userinfo", authMiddleware, require("../controllers/auth").getUserInfo);

module.exports = router;
