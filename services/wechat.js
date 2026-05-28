const axios = require("axios");

const APPID = process.env.WX_APPID;
const APPSECRET = process.env.WX_APPSECRET;

// access_token 缓存
let _accessToken = null;
let _tokenExpireAt = 0;

async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpireAt) return _accessToken;

  const res = await axios.get("https://api.weixin.qq.com/cgi-bin/token", {
    params: {
      grant_type: "client_credential",
      appid: APPID,
      secret: APPSECRET,
    },
  });

  const { access_token, expires_in, errcode, errmsg } = res.data;
  if (errcode) throw new Error(`获取 access_token 失败: ${errmsg}`);

  _accessToken = access_token;
  // 提前 5 分钟过期
  _tokenExpireAt = Date.now() + (expires_in - 300) * 1000;
  return _accessToken;
}

// jscode2session — 拿 openid/session_key
async function jscode2session(code) {
  const res = await axios.get("https://api.weixin.qq.com/sns/jscode2session", {
    params: {
      appid: APPID,
      secret: APPSECRET,
      js_code: code,
      grant_type: "authorization_code",
    },
  });
  return res.data; // { openid, session_key, errcode?, errmsg? }
}

// 用 phoneCode 换手机号（需 access_token）
async function getPhoneNumber(phoneCode) {
  const token = await getAccessToken();
  const res = await axios.post(
    `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`,
    { code: phoneCode }
  );
  const { errcode, errmsg, phone_info } = res.data;
  if (errcode) throw new Error(`获取手机号失败: ${errmsg}`);
  return phone_info.purePhoneNumber; // 不带区号的纯手机号
}

module.exports = { getAccessToken, jscode2session, getPhoneNumber };
