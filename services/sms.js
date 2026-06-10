const Core = require("@alicloud/pop-core");

const {
  ALI_SMS_ACCESS_KEY_ID,
  ALI_SMS_ACCESS_KEY_SECRET,
  SMS_SIGN_NAME = "优辰星宇",
  SMS_TEMPLATE_CODE = "SMS_235476361",
} = process.env;

const enabled = !!(ALI_SMS_ACCESS_KEY_ID && ALI_SMS_ACCESS_KEY_SECRET && SMS_SIGN_NAME && SMS_TEMPLATE_CODE);

let client = null;
if (enabled) {
  client = new Core({
    accessKeyId: ALI_SMS_ACCESS_KEY_ID,
    accessKeySecret: ALI_SMS_ACCESS_KEY_SECRET,
    endpoint: "https://dysmsapi.aliyuncs.com",
    apiVersion: "2017-05-25",
  });
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendSms(phone, code) {
  if (!enabled) {
    console.log(`[SMS-DEV] phone=${phone} code=${code} (阿里云未配置，降级到控制台)`);
    return { ok: true, dev: true };
  }

  const params = {
    RegionId: "cn-hangzhou",
    PhoneNumbers: phone,
    SignName: SMS_SIGN_NAME,
    TemplateCode: SMS_TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code }),
  };

  const res = await client.request("SendSms", params, { method: "POST" });
  if (res.Code !== "OK") {
    throw new Error(res.Message || "短信发送失败");
  }
  return { ok: true };
}

module.exports = { generateCode, sendSms, enabled };
