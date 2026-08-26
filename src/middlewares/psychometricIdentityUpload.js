const multer = require("multer");

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const MAX_IMAGE_SIZE =
  3 * 1024 * 1024;

/* =========================================================
   ALMACENAMIENTO EN MEMORIA

   La imagen NO se guarda aquí en disco.

   Multer solamente la mantiene temporalmente
   en req.file.buffer para que posteriormente
   psychometricIdentity.controllers.js decida
   dónde almacenarla de forma privada.
========================================================= */

const storage =
  multer.memoryStorage();

/* =========================================================
   FILTRO DE ARCHIVOS

   Esta validación es solamente una primera capa.

   El controller vuelve a validar la firma real
   del archivo leyendo sus bytes, por lo que no
   confiamos únicamente en mimetype.
========================================================= */

const fileFilter = (
  req,
  file,
  callback
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (
    !allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    const error =
      new Error(
        "Solo se permiten fotografías en formato JPG, PNG o WEBP."
      );

    error.statusCode = 400;
    error.code =
      "UNSUPPORTED_IMAGE_TYPE";

    return callback(
      error,
      false
    );
  }

  return callback(
    null,
    true
  );
};

/* =========================================================
   MULTER
========================================================= */

const identityUpload =
  multer({
    storage,

    limits: {
      /*
       * Máximo 3 MB.
       */
      fileSize:
        MAX_IMAGE_SIZE,

      /*
       * Solo esperamos una fotografía.
       */
      files: 1,

      /*
       * Reducimos campos adicionales
       * para evitar bodies excesivos.
       */
      fields: 10,
    },

    fileFilter,
  });

/* =========================================================
   MIDDLEWARE DE CAPTURA

   El frontend debe enviar FormData con:

   photo            -> archivo
   consentAccepted  -> true
========================================================= */

const uploadIdentityPhoto =
  identityUpload.single(
    "photo"
  );

/* =========================================================
   MANEJO CONTROLADO DE ERRORES DE MULTER

   Esto permite devolver JSON consistente al frontend
   en lugar de dejar que multer propague un error genérico.
========================================================= */

const handleIdentityUpload = (
  req,
  res,
  next
) => {
  uploadIdentityPhoto(
    req,
    res,
    (error) => {
      if (!error) {
        return next();
      }

      /* ===============================================
         ARCHIVO DEMASIADO GRANDE
      =============================================== */

      if (
        error instanceof
          multer.MulterError &&
        error.code ===
          "LIMIT_FILE_SIZE"
      ) {
        return res
          .status(413)
          .json({
            message:
              "La fotografía supera el tamaño máximo permitido de 3 MB.",

            code:
              "PHOTO_TOO_LARGE",
          });
      }

      /* ===============================================
         MÁS DE UN ARCHIVO
      =============================================== */

      if (
        error instanceof
          multer.MulterError &&
        (
          error.code ===
            "LIMIT_FILE_COUNT" ||
          error.code ===
            "LIMIT_UNEXPECTED_FILE"
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Solo se permite una fotografía por verificación.",

            code:
              "INVALID_PHOTO_COUNT",
          });
      }

      /* ===============================================
         DEMASIADOS CAMPOS
      =============================================== */

      if (
        error instanceof
          multer.MulterError &&
        error.code ===
          "LIMIT_FIELD_COUNT"
      ) {
        return res
          .status(400)
          .json({
            message:
              "La solicitud contiene demasiados campos.",

            code:
              "TOO_MANY_FIELDS",
          });
      }

      /* ===============================================
         ERROR PERSONALIZADO DEL fileFilter
      =============================================== */

      if (
        error.statusCode
      ) {
        return res
          .status(
            error.statusCode
          )
          .json({
            message:
              error.message,

            code:
              error.code ||
              "IDENTITY_UPLOAD_ERROR",
          });
      }

      console.error(
        "Error procesando fotografía de identidad:",
        error
      );

      return res
        .status(400)
        .json({
          message:
            "No fue posible procesar la fotografía enviada.",

          code:
            "IDENTITY_UPLOAD_ERROR",
        });
    }
  );
};

/* =========================================================
   EXPORTACIONES
========================================================= */

module.exports = {
  handleIdentityUpload,
};