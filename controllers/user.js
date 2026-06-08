const User = require("../models/User");

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

// GET /api/user/profile
async function getProfile(req, res) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.send({ code: 404, msg: "用户不存在" });
    res.send({ code: 0, data: sanitizeUser(user) });
  } catch (err) {
    console.error("getProfile error:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

// PUT /api/user/profile
async function updateProfile(req, res) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.send({ code: 404, msg: "用户不存在" });

    const allowed = ["nickname", "avatar", "realName", "gender", "identity", "teacherType", "school", "orgName"];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) user[key] = req.body[key];
    });
    await user.save();
    res.send({ code: 0, msg: "保存成功", data: sanitizeUser(user) });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

// DELETE /api/user/account
async function deleteAccount(req, res) {
  try {
    const Student = require("../models/Student");
    await Student.destroy({ where: { userId: req.user.id } });
    await User.destroy({ where: { id: req.user.id } });
    res.send({ code: 0, msg: "账号已注销" });
  } catch (err) {
    console.error("deleteAccount error:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

module.exports = { getProfile, updateProfile, deleteAccount };
