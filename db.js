require("dotenv").config();
const { Sequelize, DataTypes } = require("sequelize");

const {
  MYSQL_USERNAME = "root",
  MYSQL_PASSWORD = "mS2Ag2Yx",
  MYSQL_ADDRESS = "localhost:3306",
  MYSQL_DATABASE = "luohe",
} = process.env;

const [host, port = "3306"] = MYSQL_ADDRESS.split(":");

const sequelize = new Sequelize(MYSQL_DATABASE, MYSQL_USERNAME, MYSQL_PASSWORD, {
  host,
  port,
  dialect: "mysql",
  logging: console.log,
});

// 自动创建数据库（如不存在）
async function ensureDatabase() {
  const mysql = require("mysql2/promise");
  const conn = await mysql.createConnection({
    host,
    port,
    user: MYSQL_USERNAME,
    password: MYSQL_PASSWORD,
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
}

// 数据库初始化
async function init() {
  await ensureDatabase();
  await sequelize.authenticate();
  // 加载模型并同步表结构
  require("./models/User");
  require("./models/SmsCode");
  require("./models/Student");
  await sequelize.sync();
  console.log("数据库连接成功，表已同步");
}

module.exports = {
  init,
  sequelize,
  Sequelize,
  DataTypes,
};
