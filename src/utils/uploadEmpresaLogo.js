const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* =========================================================
   CARPETA DE LOGOS DE EMPRESAS
========================================================= */

const uploadPath = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "empresas",
  "logos"
);

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, {
    recursive: true,
  });
}

/* =========================================================
   CONFIGURACIÓN DE MULTER
========================================================= */

const uploadEmpresaLogo = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:.]/g, "")
        .slice(0, 15);

      const ext = path
        .extname(file.originalname)
        .toLowerCase();

      const baseName = path
        .basename(file.originalname, ext)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "") || "empresa";

      const uniqueName = `${baseName}_${timestamp}${ext}`;

      cb(null, uniqueName);
    },
  }),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "Solo se permiten imágenes JPG, PNG o WEBP."
      )
    );
  },
});

/* =========================================================
   GENERAR URL DEL LOGO
========================================================= */

const generateEmpresaLogoUrl = (req, res, next) => {
  if (req.file) {
    const forwardedProto =
      req.headers["x-forwarded-proto"];

    const protocol = forwardedProto
      ? String(forwardedProto)
          .split(",")[0]
          .trim()
      : req.protocol;

    const host = req.get("host");

    const filePath = path.join(
      "uploads",
      "empresas",
      "logos",
      req.file.filename
    );

    req.fileUrl = `${protocol}://${host}/${filePath.replace(/\\/g, "/")}`;
  }

  next();
};

module.exports = {
  uploadEmpresaLogo,
  generateEmpresaLogoUrl,
};
