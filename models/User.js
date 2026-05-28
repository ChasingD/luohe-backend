const { sequelize, DataTypes } = require("../db");

const User = sequelize.define("User", {
  openid: {
    type: DataTypes.STRING(64),
    unique: true,
    allowNull: true,
    comment: "微信openid",
  },
  phone: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: true,
    comment: "手机号",
  },
  password: {
    type: DataTypes.STRING(128),
    allowNull: true,
    comment: "密码（bcrypt）",
  },
  nickname: {
    type: DataTypes.STRING(64),
    allowNull: true,
    defaultValue: "研学用户",
  },
  avatar: {
    type: DataTypes.STRING(256),
    allowNull: true,
    defaultValue: "/images/default-avatar.png",
  },
  role: {
    type: DataTypes.ENUM("student", "teacher"),
    defaultValue: "student",
    comment: "用户角色",
  },
  realName: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: "真实姓名",
  },
  gender: {
    type: DataTypes.ENUM("male", "female"),
    allowNull: true,
    comment: "性别",
  },
  identity: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: "家长身份：mother/father/grandparent/other",
  },
}, {
  tableName: "users",
});

module.exports = User;
