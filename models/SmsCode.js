const { sequelize, DataTypes } = require("../db");

const SmsCode = sequelize.define("SmsCode", {
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: "手机号",
  },
  code: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: "验证码",
  },
  scene: {
    type: DataTypes.ENUM("register", "login", "reset"),
    allowNull: false,
    defaultValue: "register",
    comment: "场景",
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: "过期时间",
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: "是否已使用",
  },
}, {
  tableName: "sms_codes",
  indexes: [{ fields: ["phone", "scene"] }],
});

module.exports = SmsCode;
