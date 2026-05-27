const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "luohe-jwt-secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";
const APPID = process.env.WX_APPID;
const APPSECRET = process.env.WX_APPSECRET;

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

// 微信登录
async function wechatLogin(req, res) {
  try {
    const { code } = req.body;
    if (!code) {
      return res.send({ code: 400, msg: "缺少登录凭证code" });
    }

    // 调用微信接口换取 openid
    const wxRes = await axios.get("https://api.weixin.qq.com/sns/jscode2session", {
      params: {
        appid: APPID,
        secret: APPSECRET,
        js_code: code,
        grant_type: "authorization_code",
      },
    });

    const { openid, session_key, errcode, errmsg } = wxRes.data;
    if (errcode) {
      return res.send({ code: 500, msg: `微信登录失败: ${errmsg}` });
    }

    // 查找或创建用户
    let user = await User.findOne({ where: { openid } });
    const isNew = !user;

    if (!user) {
      user = await User.create({ openid, nickname: "研学用户" });
    }

    const token = generateToken(user);
    res.send({
      code: 0,
      msg: "登录成功",
      data: {
        token,
        user: sanitizeUser(user),
        isNewUser: isNew,
      },
    });
  } catch (err) {
    console.error("微信登录异常:", err);
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

    // 查找用户
    let user = await User.findOne({ where: { phone } });
    if (!user) {
      return res.send({ code: 400, msg: "手机号未注册" });
    }
    if (user.password !== password) {
      return res.send({ code: 400, msg: "密码错误" });
    }

    const token = generateToken(user);
    res.send({
      code: 0,
      msg: "登录成功",
      data: {
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (err) {
    console.error("手机登录异常:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

// 手机号注册
async function phoneRegister(req, res) {
  try {
    const { phone, password, nickname, role } = req.body;
    if (!phone || !password) {
      return res.send({ code: 400, msg: "请输入手机号和密码" });
    }

    const exist = await User.findOne({ where: { phone } });
    if (exist) {
      return res.send({ code: 400, msg: "该手机号已注册" });
    }

    const user = await User.create({
      phone,
      password,
      nickname: nickname || "研学用户",
      role: role || "student",
    });

    const token = generateToken(user);
    res.send({
      code: 0,
      msg: "注册成功",
      data: {
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (err) {
    console.error("注册异常:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

// 获取当前用户信息
async function getUserInfo(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.send({ code: 404, msg: "用户不存在" });
  }
  res.send({ code: 0, data: sanitizeUser(user) });
}

module.exports = { wechatLogin, phoneLogin, phoneRegister, getUserInfo };
