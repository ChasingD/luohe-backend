const COS = require('cos-nodejs-sdk-v5')
const multer = require('multer')
const path = require('path')

const cos = new COS({
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
})

const BUCKET = process.env.COS_BUCKET || 'luohe-1306177896'
const REGION = process.env.COS_REGION || 'ap-guangzhou'

// Multer — accept single file with field name "file"
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

// POST /api/upload/avatar
async function uploadAvatar(req, res) {
  // Run multer inline (single file, field name "file")
  upload.single('file')(req, res, function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.send({ code: 400, msg: '文件过大，最大5MB' })
      }
      return res.send({ code: 400, msg: err.message || '上传失败' })
    }

    if (!req.file) {
      return res.send({ code: 400, msg: '请选择文件' })
    }

    const ext = path.extname(req.file.originalname) || '.jpg'
    const key = 'avatars/' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext

    cos.putObject({
      Bucket: BUCKET,
      Region: REGION,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
    }, function (cosErr, data) {
      if (cosErr) {
        console.error('COS upload error:', cosErr)
        return res.send({ code: 500, msg: '上传到对象存储失败' })
      }
      const url = 'https://' + BUCKET + '.cos.' + REGION + '.myqcloud.com/' + key
      res.send({ code: 0, data: { url } })
    })
  })
}

module.exports = { uploadAvatar }
