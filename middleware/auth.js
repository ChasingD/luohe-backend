const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "luohe-jwt-secret";

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.send({ code: 401, msg: "未登录" });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.send({ code: 401, msg: "登录已过期" });
  }
}

module.exports = { authMiddleware };
