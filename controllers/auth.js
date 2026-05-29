const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const User = require("../models/User");
const SmsCode = require("../models/SmsCode");
const { generateCode, sendSms } = require("../services/sms");
const { jscode2session, getPhoneNumber } = require("../services/wechat");

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
    realName: user.realName,
    gender: user.gender,
    identity: user.identity,
    teacherType: user.teacherType,
    school: user.school,
    orgName: user.orgName,
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
    const { phone, scene = "login" } = req.body;
    if (!PHONE_RE.test(phone || "")) {
      return res.send({ code: 400, msg: "手机号格式错误" });
    }
    if (!["login", "reset"].includes(scene)) {
      return res.send({ code: 400, msg: "场景参数错误" });
    }

    // 节流
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

// 微信登录（自动注册，首次获取手机号+头像昵称）
async function wechatLogin(req, res) {
  try {
    const { code, phoneCode, role, avatar, nickname } = req.body;
    if (!code) return res.send({ code: 400, msg: "缺少登录凭证code" });

    const wxData = await jscode2session(code);
    const { openid, errcode, errmsg } = wxData;
    if (errcode) return res.send({ code: 500, msg: `微信登录失败: ${errmsg}` });

    let user = await User.findOne({ where: { openid } });
    const isNew = !user;

    // 拿手机号（可选，只在首次或用户未绑定时拉）
    let phone = user && user.phone;
    if (phoneCode && !phone) {
      try {
        phone = await getPhoneNumber(phoneCode);
      } catch (err) {
        console.warn("获取手机号失败:", err.message);
      }
    }

    if (!user) {
      user = await User.create({
        openid,
        phone: phone || null,
        nickname: nickname || "研学用户",
        avatar: avatar || "/images/default-avatar.png",
        role: ["student", "teacher"].includes(role) ? role : "student",
      });
    } else {
      // 更新已有用户的手机号/头像/昵称/角色（如果传了且当前为空或可更新）
      let updated = false;
      if (phone && !user.phone) {
        user.phone = phone;
        updated = true;
      }
      if (avatar && (!user.avatar || user.avatar === "/images/default-avatar.png")) {
        user.avatar = avatar;
        updated = true;
      }
      if (nickname && user.nickname === "研学用户") {
        user.nickname = nickname;
        updated = true;
      }
      // 允许用户切换角色（教师↔学生）
      if (["student", "teacher"].includes(role) && user.role !== role) {
        user.role = role;
        updated = true;
      }
      if (updated) await user.save();
    }

    const token = generateToken(user);
    res.send({
      code: 0,
      msg: isNew ? "注册成功" : "登录成功",
      data: { token, user: sanitizeUser(user), isNewUser: isNew },
    });
  } catch (err) {
    console.error("微信登录异常:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

// 手机号验证码登录（自动注册）
async function phoneLogin(req, res) {
  try {
    const { phone, code, role } = req.body;
    if (!PHONE_RE.test(phone || "")) {
      return res.send({ code: 400, msg: "手机号格式错误" });
    }
    if (!code) return res.send({ code: 400, msg: "请输入验证码" });

    const valid = await consumeCode(phone, "login", code);
    if (!valid) return res.send({ code: 400, msg: "验证码错误或已过期" });

    let user = await User.findOne({ where: { phone } });
    const isNew = !user;

    if (!user) {
      user = await User.create({
        phone,
        nickname: "研学用户",
        role: ["student", "teacher"].includes(role) ? role : "student",
      });
    }

    const token = generateToken(user);
    res.send({
      code: 0,
      msg: isNew ? "注册成功" : "登录成功",
      data: { token, user: sanitizeUser(user), isNewUser: isNew },
    });
  } catch (err) {
    console.error("手机登录异常:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

// 获取当前用户信息
async function getUserInfo(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) return res.send({ code: 404, msg: "用户不存在" });
  res.send({ code: 0, data: sanitizeUser(user) });
}

module.exports = { sendSmsCode, wechatLogin, phoneLogin, getUserInfo };
