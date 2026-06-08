const express = require("express");
const path = require("path");
const COS = require("cos-nodejs-sdk-v5");

const Bucket = "7072-prod-d0gd1s92safa7f719-1437344973";
const Region = "ap-shanghai";

const router = express.Router();

// POST /api/upload/avatar  { file: "base64..." }
router.post("/avatar", function (req, res) {
  const { file } = req.body || {};
  if (!file) return res.send({ code: 400, msg: "请提供文件" });

  let base64 = file;
  let mime = "image/jpeg";
  let ext = ".jpg";
  const mimeMatch = base64.match(/^data:(image\/\w+);base64,(.+)$/);
  if (mimeMatch) {
    mime = mimeMatch[1];
    base64 = mimeMatch[2];
    if (mime === "image/png") ext = ".png";
    else if (mime === "image/gif") ext = ".gif";
    else if (mime === "image/webp") ext = ".webp";
  }

  const buffer = Buffer.from(base64, "base64");
  const key = "uploads/" + Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;

  const secretId = process.env.TENCENTCLOUD_SECRETID;
  const secretKey = process.env.TENCENTCLOUD_SECRETKEY;

  if (!secretId || !secretKey) {
    return res.send({ code: 500, msg: "未配置对象存储密钥" });
  }

  const cos = new COS({
    SecretId: secretId,
    SecretKey: secretKey,
  });

  cos.putObject(
    {
      Bucket: Bucket,
      Region: Region,
      Key: key,
      Body: buffer,
      ContentType: mime,
    },
    function (err, data) {
      if (err) {
        console.error("COS upload error:", err);
        return res.send({ code: 500, msg: "上传失败: " + (err.message || err) });
      }
      const url = "https://" + Bucket + ".cos." + Region + ".myqcloud.com/" + key;
      res.send({ code: 0, msg: "上传成功", data: url });
    }
  );
});

module.exports = router;
