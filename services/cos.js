const COS = require("cos-nodejs-sdk-v5");
const axios = require("axios");

const BUCKET = "7072-prod-d0gd1s92safa7f719-1437344973";
const REGION = "ap-shanghai";

// Cache access_token (expires in 7200s)
let tokenCache = { token: null, expires: 0 };

async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expires) {
    return tokenCache.token;
  }
  const appid = process.env.WX_APPID;
  const secret = process.env.WX_APPSECRET;
  if (!appid || !secret) throw new Error("未配置 WX_APPID / WX_APPSECRET");

  const res = await axios.get("https://api.weixin.qq.com/cgi-bin/token", {
    params: { grant_type: "client_credential", appid, secret },
  });
  const data = res.data;
  if (data.errcode) throw new Error(`获取access_token失败: ${data.errmsg}`);
  tokenCache = { token: data.access_token, expires: Date.now() + (data.expires_in - 300) * 1000 };
  return tokenCache.token;
}

// Get temporary COS credentials via cloud base API
async function getCosCredentials() {
  const token = await getAccessToken();
  const envId = process.env.CLOUD_ENV_ID || "prod-d0gd1s92safa7f719";
  const res = await axios.post(
    "https://api.weixin.qq.com/tcb/getcoscredential",
    { env: envId },
    { params: { access_token: token } }
  );
  const data = res.data;
  if (data.errcode) throw new Error(`获取COS凭证失败: ${data.errmsg}`);
  return {
    secretId: data.tmp_secret_id,
    secretKey: data.tmp_secret_key,
    token: data.tmp_token,
    expiredTime: data.expired_time,
  };
}

// Upload base64 image to COS
async function uploadImage(base64) {
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

  const creds = await getCosCredentials();

  const cos = new COS({
    SecretId: creds.secretId,
    SecretKey: creds.secretKey,
    SecurityToken: creds.token,
  });

  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: key,
        Body: buffer,
        ContentType: mime,
      },
      (err) => {
        if (err) return reject(err);
        resolve("https://" + BUCKET + ".cos." + REGION + ".myqcloud.com/" + key);
      }
    );
  });
}

module.exports = { uploadImage };
