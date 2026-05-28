const tencentcloud = require("tencentcloud-sdk-nodejs-sms");

const {
  TENCENT_SECRET_ID,
  TENCENT_SECRET_KEY,
  SMS_SDK_APP_ID,
  SMS_SIGN_NAME,
  SMS_TEMPLATE_ID,
  SMS_REGION = "ap-guangzhou",
} = process.env;

const enabled = !!(TENCENT_SECRET_ID && TENCENT_SECRET_KEY && SMS_SDK_APP_ID && SMS_TEMPLATE_ID);

let client = null;
if (enabled) {
  const SmsClient = tencentcloud.sms.v20210111.Client;
  client = new SmsClient({
    credential: { secretId: TENCENT_SECRET_ID, secretKey: TENCENT_SECRET_KEY },
    region: SMS_REGION,
    profile: { httpProfile: { endpoint: "sms.tencentcloudapi.com" } },
  });
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendSms(phone, code) {
  if (!enabled) {
    console.log(`[SMS-DEV] phone=${phone} code=${code} (腾讯云未配置，降级到控制台)`);
    return { ok: true, dev: true };
  }

  const params = {
    PhoneNumberSet: [`+86${phone}`],
    SmsSdkAppId: SMS_SDK_APP_ID,
    SignName: SMS_SIGN_NAME,
    TemplateId: SMS_TEMPLATE_ID,
    TemplateParamSet: [code, "5"],
  };

  const res = await client.SendSms(params);
  const status = res.SendStatusSet && res.SendStatusSet[0];
  if (!status || status.Code !== "Ok") {
    throw new Error(status ? status.Message : "短信发送失败");
  }
  return { ok: true };
}

module.exports = { generateCode, sendSms, enabled };

