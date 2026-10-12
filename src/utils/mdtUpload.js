const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const dir = path.join(__dirname, "../../uploads/certificados_tmp");
fs.mkdirSync(dir, { recursive: true });
module.exports = multer({
  storage: multer.diskStorage({ destination: dir, filename: (_, __, cb) => cb(null, `mdt-${crypto.randomUUID()}.zip`) }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_, file, cb) => cb(null, /\.zip$/i.test(file.originalname) && ["application/zip", "application/x-zip-compressed", "application/octet-stream"].includes(file.mimetype)),
});
