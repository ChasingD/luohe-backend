const express = require("express");
const router = express.Router();
const { sendSmsCode, wechatLogin, wechatRegister, phoneLogin, phoneRegister, getUserInfo } = require("../controllers/auth");
const { authMiddleware } = require("../middleware/auth");

// 发送短信验证码
router.post("/send-sms-code", sendSmsCode);
// 微信登录
router.post("/wechat-login", wechatLogin);
// 微信注册
router.post("/wechat-register", wechatRegister);
// 手机号登录
router.post("/phone-login", phoneLogin);
// 手机号注册
router.post("/phone-register", phoneRegister);
// 获取当前用户信息（需登录）
router.get("/userinfo", authMiddleware, getUserInfo);

module.exports = router;
