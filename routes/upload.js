const express = require("express");
const { uploadImage } = require("../services/cos");

const router = express.Router();

// POST /api/upload/avatar  { file: "base64..." }
router.post("/avatar", async function (req, res) {
  const { file } = req.body || {};
  if (!file) return res.send({ code: 400, msg: "请提供文件" });

  try {
    const url = await uploadImage(file);
    res.send({ code: 0, msg: "上传成功", data: url });
  } catch (err) {
    console.error("upload error:", err.message || err);
    res.send({ code: 500, msg: "上传失败: " + (err.message || err) });
  }
});

module.exports = router;
