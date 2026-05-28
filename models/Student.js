const { sequelize, DataTypes } = require("../db");

const Student = sequelize.define("Student", {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    comment: "关联用户ID",
  },
  name: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: "学生姓名",
  },
  gender: {
    type: DataTypes.ENUM("male", "female"),
    allowNull: true,
    comment: "性别",
  },
  school: {
    type: DataTypes.STRING(128),
    allowNull: true,
    comment: "学校",
  },
  grade: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: "年级",
  },
  className: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: "班级",
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: "联系手机号",
  },
}, {
  tableName: "students",
});

module.exports = Student;
