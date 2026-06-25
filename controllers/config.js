/**
 * 配置控制器
 * 返回小程序运行时需要的动态配置（管理后台地址、pan 地址等）
 * 这些值通过云托管环境变量注入，无需修改代码或重新审核
 */
async function getAppConfig(req, res) {
  try {
    res.send({
      code: 0,
      data: {
        adminBaseUrl: process.env.ADMIN_BASE_URL || "",
        panBaseUrl: process.env.PAN_BASE_URL || "",
      },
    });
  } catch (err) {
    console.error("获取配置异常:", err);
    res.send({ code: 500, msg: "服务器异常" });
  }
}

module.exports = { getAppConfig };
