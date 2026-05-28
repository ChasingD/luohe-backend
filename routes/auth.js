const express = require("express");
const router = express.Router();
const { sendSmsCode, wechatLogin, phoneLogin, getUserInfo } = require("../controllers/auth");
const { authMiddleware } = require("../middleware/auth");

// 发送短信验证码
router.post("/send-sms-code", sendSmsCode);
// 微信登录（首次自动注册）
router.post("/wechat-login", wechatLogin);
// 手机号验证码登录（首次自动注册）
router.post("/phone-login", phoneLogin);
// 获取当前用户信息（需登录）
router.get("/userinfo", authMiddleware, getUserInfo);

module.exports = router;
