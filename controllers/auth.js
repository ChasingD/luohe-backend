const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const { Op } = require("sequelize");
const User = require("../models/User");
const SmsCode = require("../models/SmsCode");
const { generateCode, sendSms } = require("../services/sms");

const JWT_SECRET = process.env.JWT_SECRET || "luohe-jwt-secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";
const APPID = process.env.WX_APPID;
const APPSECRET = process.env.WX_APPSECRET;

const PHONE_RE = /^1[3-9]\d{9}$/;
const CODE_TTL_MIN = 5;
const SEND_INTERVAL_SEC = 60;

function generateToken(user) {
  return jwt.sign(
    { id: user.id, openid: user.openid, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    openid: user.openid,
    phone: user.phone,
    nickname: user.nickname,
    avatar: user.avatar,
    role: user.role,
  };
}

async function consumeCode(phone, scene, code) {
  const record = await SmsCode.findOne({
    where: {
      phone,
      scene,
      code,
      used: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["createdAt", "DESC"]],
  });
  if (!record) return false;
  record.used = true;
  await record.save();
  return true;
}

// 发送短信验证码
async function sendSmsCode(req, res) {
  try {
    const { phone, scene = "register" } = req.body;
    if (!PHONE_RE.test(phone || "")) {
      return res.send({ code: 400, msg: "手机号格式错误" });
    }
    if (!["register", "login", "reset"].includes(scene)) {
      return res.send({ code: 400, msg: "场景参数错误" });
    }

    if (scene === "register") {
      const exist = await User.findOne({ where: { phone } });
      if (exist) return res.send({ code: 400, msg: "该手机号已注册" });
    }
    if (scene === "login" || scene === "reset") {
      const exist = await User.findOne({ where: { phone } });
      if (!exist) return res.send({ code: 400, msg: "手机号未注册" });
    }

    const last = await SmsCode.findOne({
      where: { phone, scene },
      order: [["createdAt", "DESC"]],
    });
    if (last) {
      const elapsed = (Date.now() - new Date(last.createdAt).getTime()) / 1000;
      if (elapsed < SEND_INTERVAL_SEC) {
        return res.send({
          code: 429,
          msg: `请 ${Math.ceil(SEND_INTERVAL_SEC - elapsed)} 秒后再试`,
        });
      }
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);

    await sendSms(phone, code);
    await SmsCode.create({ phone, scene, code, expiresAt });

    res.send({ code: 0, msg: "验证码已发送", data: { ttl: CODE_TTL_MIN * 60 } });
  } catch (err) {
    console.error("发送验证码异常:", err);
    res.send({ code: 500, msg: err.message || "服务器异常" });
  }
}

// 微信登录
async function wechatLogin(req, res) {
  try {
    const { code } = req.body;
    if (!code) return res.send({ code: 400, msg: "缺少登录凭证code" });

    const wxRes = await axios.get("https://api.weixin.qq.com/sns/jscode2session", {
      params: { appid: APPID, secret: APPSECRET, js_code: code, grant_type: "authorization_code" },
    });

    const { openid, errcode, errmsg } = wxRes.data;
    if (errcode) return res.send({ code: 500, msg: `微信登录失败: ${errmsg}` });

    const user = await User.findOne({ where: { openid } });
    if (!user) {
      return res.send({
        code: 1001,
        msg: "用户未注册",
        data: { needRegister: true, openid },
      });
    }

    const token = generateToken(user);
    res.send({
      code: 0,
      msg: "登录成功",
      data: { token, user: sanitizeUser(user), isNewUser: false },
    });
  } catch (err) {
    console.error("微信登录异常:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

// 微信注册
async function wechatRegister(req, res) {
  try {
    const { code, role, nickname, avatar } = req.body;
    if (!code) return res.send({ code: 400, msg: "缺少登录凭证code" });
    if (role && !["student", "teacher"].includes(role)) {
      return res.send({ code: 400, msg: "角色参数错误" });
    }

    const wxRes = await axios.get("https://api.weixin.qq.com/sns/jscode2session", {
      params: { appid: APPID, secret: APPSECRET, js_code: code, grant_type: "authorization_code" },
    });

    const { openid, errcode, errmsg } = wxRes.data;
    if (errcode) return res.send({ code: 500, msg: `微信授权失败: ${errmsg}` });

    const exist = await User.findOne({ where: { openid } });
    if (exist) {
      return res.send({ code: 400, msg: "该微信号已注册，请直接登录" });
    }

    const user = await User.create({
      openid,
      nickname: nickname || "研学用户",
      avatar: avatar || undefined,
      role: role || "student",
    });

    const token = generateToken(user);
    res.send({
      code: 0,
      msg: "注册成功",
      data: { token, user: sanitizeUser(user), isNewUser: true },
    });
  } catch (err) {
    console.error("微信注册异常:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

// 手机号密码登录
async function phoneLogin(req, res) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.send({ code: 400, msg: "请输入手机号和密码" });
    }

    const user = await User.findOne({ where: { phone } });
    if (!user) return res.send({ code: 400, msg: "手机号未注册" });

    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) return res.send({ code: 400, msg: "密码错误" });

    const token = generateToken(user);
    res.send({ code: 0, msg: "登录成功", data: { token, user: sanitizeUser(user) } });
  } catch (err) {
    console.error("手机登录异常:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

// 手机号注册
async function phoneRegister(req, res) {
  try {
    const { phone, password, code, nickname, role } = req.body;

    if (!PHONE_RE.test(phone || "")) {
      return res.send({ code: 400, msg: "手机号格式错误" });
    }
    if (!password || password.length < 6 || password.length > 20) {
      return res.send({ code: 400, msg: "密码长度需 6-20 位" });
    }
    if (!code) return res.send({ code: 400, msg: "请输入验证码" });
    if (role && !["student", "teacher"].includes(role)) {
      return res.send({ code: 400, msg: "角色参数错误" });
    }

    const exist = await User.findOne({ where: { phone } });
    if (exist) return res.send({ code: 400, msg: "该手机号已注册" });

    const valid = await consumeCode(phone, "register", code);
    if (!valid) return res.send({ code: 400, msg: "验证码错误或已过期" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      phone,
      password: hash,
      nickname: nickname || "研学用户",
      role: role || "student",
    });

    const token = generateToken(user);
    res.send({
      code: 0,
      msg: "注册成功",
      data: { token, user: sanitizeUser(user) },
    });
  } catch (err) {
    console.error("注册异常:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

// 获取当前用户信息
async function getUserInfo(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) return res.send({ code: 404, msg: "用户不存在" });
  res.send({ code: 0, data: sanitizeUser(user) });
}

module.exports = { sendSmsCode, wechatLogin, wechatRegister, phoneLogin, phoneRegister, getUserInfo };
