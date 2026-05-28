const Student = require("../models/Student");

// GET /api/student
async function getStudent(req, res) {
  try {
    const student = await Student.findOne({ where: { userId: req.user.id } });
    res.send({ code: 0, data: student || null });
  } catch (err) {
    console.error("getStudent error:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

// PUT /api/student (upsert)
async function updateStudent(req, res) {
  try {
    const { name, gender, school, grade, className, phone } = req.body;
    const [student] = await Student.upsert({
      userId: req.user.id,
      name,
      gender,
      school,
      grade,
      className,
      phone,
    });
    res.send({ code: 0, msg: "保存成功", data: student });
  } catch (err) {
    console.error("updateStudent error:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

module.exports = { getStudent, updateStudent };
