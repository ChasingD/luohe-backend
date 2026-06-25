const express = require("express");
const router = express.Router();
const { getAppConfig } = require("../controllers/config");

// 获取应用配置（管理后台地址、pan 地址等）—— 无需鉴权
router.get("/", getAppConfig);

module.exports = router;
