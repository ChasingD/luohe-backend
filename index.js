require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB } = require("./db");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(morgan("tiny"));

// 首页
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 路由
app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/user"));
app.use("/api/student", require("./routes/student"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/config", require("./routes/config"));

// 健康检查
app.get("/api/health", (req, res) => {
  res.send({ code: 0, data: "ok" });
});

const port = process.env.PORT || 3000;

async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("服务启动成功，端口:", port);
  });
}

bootstrap();
