const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const sequelize = require(
  "../utils/connection"
);

const catchError = require(
  "../utils/catchError"
);

/* =========================================================
   MODELOS
========================================================= */

const PsychometricAccessToken = require(
  "../models/PsychometricAccessToken"
);

const PsychometricEvaluation = require(
  "../models/PsychometricEvaluation"
);

const PsychometricIdentityVerification = require(
  "../models/PsychometricIdentityVerification"
);

/* =========================================================
   CONFIGURACIÓN
========================================================= */

/*
 * Carpeta privada.
 *
 * IMPORTANTE:
 * No colocar dentro de:
 *
 * public/
 * dist/
 * frontend/
 *
 * porque las fotografías no deben ser accesibles
 * directamente mediante URL pública.
 */
const IDENTITY_STORAGE_ROOT =
  path.resolve(
    __dirname,
    "../private_storage/psychometric_identity"
  );

/*
 * Máximo 3 MB por fotografía.
 *
 * La cámara del frontend posteriormente comprimirá
 * la imagen antes de enviarla.
 */
const MAX_IMAGE_SIZE =
  3 * 1024 * 1024;

/*
 * Versión del consentimiento.
 *
 * Si posteriormente cambiamos el texto legal,
 * incrementamos esta versión.
 */
const CURRENT_CONSENT_VERSION =
  "1.0";

/* =========================================================
   CREAR CARPETA PRIVADA
========================================================= */

const ensurePrivateStorage =
  async () => {
    await fs.promises.mkdir(
      IDENTITY_STORAGE_ROOT,
      {
        recursive: true,
        mode: 0o700,
      }
    );
  };

/* =========================================================
   HASH TOKEN
========================================================= */

const hashAccessToken = (
  token
) => {
  return crypto
    .createHash("sha256")
    .update(
      String(
        token || ""
      ).trim()
    )
    .digest("hex");
};

/* =========================================================
   HASH DEL ARCHIVO
========================================================= */

const calculateFileHash = (
  buffer
) => {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
};

/* =========================================================
   OBTENER IP
========================================================= */

const getClientIp = (
  req
) => {
  /*
   * req.ip será correcto detrás de Apache/Nginx
   * siempre que Express tenga configurado
   * correctamente trust proxy.
   */

  if (req.ip) {
    return String(
      req.ip
    ).slice(
      0,
      100
    );
  }

  const forwarded =
    req.headers[
      "x-forwarded-for"
    ];

  if (forwarded) {
    return String(
      forwarded
    )
      .split(",")[0]
      .trim()
      .slice(
        0,
        100
      );
  }

  return (
    req.socket
      ?.remoteAddress ||
    null
  );
};

/* =========================================================
   VALIDAR TOKEN Y OBTENER EVALUACIÓN
========================================================= */

const getEvaluationByToken =
  async (
    token,
    transaction = null
  ) => {
    if (
      !token ||
      !String(
        token
      ).trim()
    ) {
      const error =
        new Error(
          "El código de acceso es requerido."
        );

      error.statusCode =
        400;

      error.code =
        "TOKEN_REQUIRED";

      throw error;
    }

    const tokenHash =
      hashAccessToken(
        token
      );

    const access =
      await PsychometricAccessToken.findOne(
        {
          where: {
            tokenHash,
            activo: true,
            purpose: "test",
          },

          include: [
            {
              model:
                PsychometricEvaluation,

              as:
                "evaluation",
            },
          ],

          transaction,
        }
      );

    if (!access) {
      const error =
        new Error(
          "El enlace del test no es válido o ya no está activo."
        );

      error.statusCode =
        404;

      error.code =
        "INVALID_ACCESS_TOKEN";

      throw error;
    }

    if (
      access.revokedAt
    ) {
      const error =
        new Error(
          "El enlace del test fue revocado."
        );

      error.statusCode =
        410;

      error.code =
        "REVOKED_ACCESS_TOKEN";

      throw error;
    }

    if (
      !access.expiresAt ||
      new Date(
        access.expiresAt
      ).getTime() <
        Date.now()
    ) {
      const error =
        new Error(
          "El enlace del test ha expirado."
        );

      error.statusCode =
        410;

      error.code =
        "EXPIRED_ACCESS_TOKEN";

      throw error;
    }

    const evaluation =
      access.evaluation;

    if (!evaluation) {
      const error =
        new Error(
          "No se encontró la evaluación asociada al enlace."
        );

      error.statusCode =
        404;

      error.code =
        "EVALUATION_NOT_FOUND";

      throw error;
    }

    if (
      evaluation.estado ===
      "anulada"
    ) {
      const error =
        new Error(
          "La evaluación fue anulada."
        );

      error.statusCode =
        410;

      error.code =
        "EVALUATION_CANCELLED";

      throw error;
    }

    if (
      evaluation.estado ===
      "completada"
    ) {
      const error =
        new Error(
          "La evaluación ya fue completada."
        );

      error.statusCode =
        409;

      error.code =
        "EVALUATION_COMPLETED";

      throw error;
    }

    if (
      ![
        "habilitada",
        "pago_validado",
        "en_progreso",
      ].includes(
        evaluation.estado
      )
    ) {
      const error =
        new Error(
          "La evaluación no está habilitada para realizar verificaciones de identidad."
        );

      error.statusCode =
        409;

      error.code =
        "EVALUATION_NOT_AVAILABLE";

      throw error;
    }

    return {
      access,
      evaluation,
    };
  };

/* =========================================================
   DETECTAR TIPO REAL DE IMAGEN

   No confiamos únicamente en file.mimetype porque
   viene informado por el cliente.
========================================================= */

const detectImageType = (
  buffer
) => {
  if (
    !Buffer.isBuffer(
      buffer
    ) ||
    buffer.length < 12
  ) {
    return null;
  }

  /*
   * JPEG
   * FF D8 FF
   */
  if (
    buffer[0] ===
      0xff &&
    buffer[1] ===
      0xd8 &&
    buffer[2] ===
      0xff
  ) {
    return {
      mimeType:
        "image/jpeg",

      extension:
        "jpg",
    };
  }

  /*
   * PNG
   * 89 50 4E 47
   */
  if (
    buffer[0] ===
      0x89 &&
    buffer[1] ===
      0x50 &&
    buffer[2] ===
      0x4e &&
    buffer[3] ===
      0x47
  ) {
    return {
      mimeType:
        "image/png",

      extension:
        "png",
    };
  }

  /*
   * WEBP
   *
   * RIFF....WEBP
   */
  const riff =
    buffer
      .subarray(
        0,
        4
      )
      .toString(
        "ascii"
      );

  const webp =
    buffer
      .subarray(
        8,
        12
      )
      .toString(
        "ascii"
      );

  if (
    riff === "RIFF" &&
    webp === "WEBP"
  ) {
    return {
      mimeType:
        "image/webp",

      extension:
        "webp",
    };
  }

  return null;
};

/* =========================================================
   VALIDAR ARCHIVO
========================================================= */

const validatePhotoFile = (
  file
) => {
  if (
    !file ||
    !file.buffer
  ) {
    const error =
      new Error(
        "Debes capturar una fotografía antes de continuar."
      );

    error.statusCode =
      400;

    error.code =
      "PHOTO_REQUIRED";

    throw error;
  }

  if (
    !Buffer.isBuffer(
      file.buffer
    )
  ) {
    const error =
      new Error(
        "El archivo recibido no es válido."
      );

    error.statusCode =
      400;

    error.code =
      "INVALID_PHOTO";

    throw error;
  }

  if (
    file.buffer.length <=
    0
  ) {
    const error =
      new Error(
        "La fotografía recibida está vacía."
      );

    error.statusCode =
      400;

    error.code =
      "EMPTY_PHOTO";

    throw error;
  }

  if (
    file.buffer.length >
    MAX_IMAGE_SIZE
  ) {
    const error =
      new Error(
        "La fotografía supera el tamaño máximo permitido de 3 MB."
      );

    error.statusCode =
      413;

    error.code =
      "PHOTO_TOO_LARGE";

    throw error;
  }

  const imageType =
    detectImageType(
      file.buffer
    );

  if (!imageType) {
    const error =
      new Error(
        "El archivo recibido no corresponde a una imagen válida."
      );

    error.statusCode =
      400;

    error.code =
      "UNSUPPORTED_IMAGE";

    throw error;
  }

  return imageType;
};

/* =========================================================
   NORMALIZAR BOOLEAN
========================================================= */

const normalizeBoolean = (
  value
) => {
  if (
    value === true ||
    value === "true" ||
    value === "1" ||
    value === 1
  ) {
    return true;
  }

  return false;
};

/* =========================================================
   GENERAR NOMBRE PRIVADO
========================================================= */

const generateStorageName = ({
  captureType,
  extension,
}) => {
  const random =
    crypto
      .randomBytes(24)
      .toString("hex");

  return `${captureType}_${Date.now()}_${random}.${extension}`;
};

/* =========================================================
   GUARDAR ARCHIVO PRIVADO
========================================================= */

const savePrivatePhoto =
  async ({
    evaluationId,
    captureType,
    extension,
    buffer,
  }) => {
    await ensurePrivateStorage();

    /*
     * Una carpeta independiente por evaluación.
     */
    const evaluationFolder =
      path.join(
        IDENTITY_STORAGE_ROOT,
        String(
          evaluationId
        )
      );

    await fs.promises.mkdir(
      evaluationFolder,
      {
        recursive: true,
        mode: 0o700,
      }
    );

    const filename =
      generateStorageName({
        captureType,
        extension,
      });

    const absolutePath =
      path.join(
        evaluationFolder,
        filename
      );

    await fs.promises.writeFile(
      absolutePath,
      buffer,
      {
        mode: 0o600,
        flag: "wx",
      }
    );

    /*
     * Guardamos solamente una clave relativa.
     *
     * Nunca guardamos absolutePath en BD.
     */
    const storageKey =
      path
        .relative(
          IDENTITY_STORAGE_ROOT,
          absolutePath
        )
        .replace(
          /\\/g,
          "/"
        );

    return {
      absolutePath,
      storageKey,
    };
  };

/* =========================================================
   ELIMINAR ARCHIVO SI FALLA LA TRANSACCIÓN
========================================================= */

const removePrivateFile =
  async (
    absolutePath
  ) => {
    if (
      !absolutePath
    ) {
      return;
    }

    try {
      await fs.promises.unlink(
        absolutePath
      );
    } catch (
      error
    ) {
      if (
        error.code !==
        "ENOENT"
      ) {
        console.error(
          "No fue posible eliminar fotografía huérfana:",
          error
        );
      }
    }
  };

/* =========================================================
   CREAR CAPTURA
========================================================= */

const createIdentityVerification =
  async ({
    req,
    captureType,
  }) => {
    const {
      token,
    } = req.params;

    /* =====================================================
       CONSENTIMIENTO
    ===================================================== */

    const consentAccepted =
      normalizeBoolean(
        req.body
          ?.consentAccepted
      );

    if (
      !consentAccepted
    ) {
      const error =
        new Error(
          "Debes aceptar la autorización de captura antes de continuar."
        );

      error.statusCode =
        400;

      error.code =
        "IDENTITY_CONSENT_REQUIRED";

      throw error;
    }

    /* =====================================================
       VALIDAR FOTO
    ===================================================== */

    const imageType =
      validatePhotoFile(
        req.file
      );

    /* =====================================================
       TRANSACCIÓN
    ===================================================== */

    const transaction =
      await sequelize.transaction();

    let savedFile = null;

    try {
      const {
        evaluation,
      } =
        await getEvaluationByToken(
          token,
          transaction
        );

      /* ===================================================
         VALIDAR CAPTURA FINAL
      =================================================== */

      if (
        captureType ===
        "final"
      ) {
        const initial =
          await PsychometricIdentityVerification.findOne(
            {
              where: {
                evaluationId:
                  evaluation.id,

                captureType:
                  "initial",
              },

              transaction,
            }
          );

        if (!initial) {
          const error =
            new Error(
              "No existe una verificación inicial de identidad para esta evaluación."
            );

          error.statusCode =
            409;

          error.code =
            "INITIAL_IDENTITY_REQUIRED";

          throw error;
        }
      }

      /* ===================================================
         HASH
      =================================================== */

      const fileHash =
        calculateFileHash(
          req.file.buffer
        );

      /* ===================================================
         EVITAR GUARDAR EXACTAMENTE LA MISMA FOTO DOS VECES
      =================================================== */

      const duplicatedPhoto =
        await PsychometricIdentityVerification.findOne(
          {
            where: {
              evaluationId:
                evaluation.id,

              captureType,

              fileHash,
            },

            transaction,
          }
        );

      if (
        duplicatedPhoto
      ) {
        await transaction.rollback();

        return {
          duplicated:
            true,

          verification:
            duplicatedPhoto,

          evaluation,
        };
      }

      /* ===================================================
         GUARDAR ARCHIVO PRIVADO
      =================================================== */

      savedFile =
        await savePrivatePhoto({
          evaluationId:
            evaluation.id,

          captureType,

          extension:
            imageType.extension,

          buffer:
            req.file.buffer,
        });

      /* ===================================================
         IP / USER AGENT
      =================================================== */

      const ipAddress =
        getClientIp(
          req
        );

      const userAgent =
        String(
          req.headers[
            "user-agent"
          ] || ""
        ).slice(
          0,
          2000
        ) || null;

      const now =
        new Date();

      /* ===================================================
         CREAR VERIFICACIÓN
      =================================================== */

      const verification =
        await PsychometricIdentityVerification.create(
          {
            evaluationId:
              evaluation.id,

            captureType,

            /*
             * Por ahora la evidencia quedó capturada.
             *
             * No usamos "verified" porque todavía
             * no existe comparación biométrica.
             */
            status:
              "captured",

            storageProvider:
              "local_private",

            storageKey:
              savedFile.storageKey,

            storageAssetId:
              null,

            mimeType:
              imageType
                .mimeType,

            fileSize:
              req.file
                .buffer
                .length,

            fileHash,

            capturedAt:
              now,

            consentAccepted:
              true,

            consentAt:
              now,

            consentVersion:
              CURRENT_CONSENT_VERSION,

            ipAddress,

            userAgent,

            /*
             * Futuro reconocimiento facial.
             */
            faceDetected:
              null,

            faceCount:
              null,

            faceMatchScore:
              null,

            faceMatchPassed:
              null,

            /*
             * Futuro liveness.
             */
            livenessChecked:
              false,

            livenessScore:
              null,

            livenessPassed:
              null,

            reviewedBy:
              null,

            reviewedAt:
              null,

            reviewNotes:
              null,

            metadata: {
              originalFileName:
                req.file
                  ?.originalname ||
                null,

              clientMimeType:
                req.file
                  ?.mimetype ||
                null,

              serverDetectedMimeType:
                imageType
                  .mimeType,

              source:
                "web_camera",

              captureVersion:
                "1.0",
            },

            /*
             * Lo dejamos NULL de momento.
             *
             * Posteriormente podemos aplicar una
             * política automática de retención.
             */
            retentionUntil:
              null,
          },

          {
            transaction,
          }
        );

      /* ===================================================
         INICIAR EVALUACIÓN

         Solo la captura inicial marca el inicio real.
      =================================================== */

      if (
        captureType ===
          "initial" &&
        evaluation.estado !==
          "en_progreso"
      ) {
        await evaluation.update(
          {
            estado:
              "en_progreso",

            fechaInicio:
              evaluation
                .fechaInicio ||
              now,
          },

          {
            transaction,
          }
        );
      }

      await transaction.commit();

      return {
        duplicated:
          false,

        verification,

        evaluation,
      };
    } catch (
      error
    ) {
      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }

      /*
       * Si el archivo llegó a disco pero la BD falló,
       * eliminamos el archivo para evitar residuos.
       */
      if (
        savedFile
          ?.absolutePath
      ) {
        await removePrivateFile(
          savedFile.absolutePath
        );
      }

      throw error;
    }
  };

/* =========================================================
   CAPTURA INICIAL
   POST /psychometric/access/:token/identity
========================================================= */

const captureInitialIdentity =
  catchError(
    async (
      req,
      res
    ) => {
      try {
        const result =
          await createIdentityVerification(
            {
              req,
              captureType:
                "initial",
            }
          );

        const verification =
          result.verification;

        return res
          .status(
            result.duplicated
              ? 200
              : 201
          )
          .json({
            message:
              result.duplicated
                ? "La fotografía de identidad ya había sido registrada."
                : "Verificación inicial de identidad registrada correctamente.",

            identityVerification: {
              id:
                verification.id,

              captureType:
                verification
                  .captureType,

              status:
                verification
                  .status,

              completed:
                true,

              capturedAt:
                verification
                  .capturedAt,

              consentAccepted:
                verification
                  .consentAccepted,

              consentVersion:
                verification
                  .consentVersion,
            },

            evaluation: {
              id:
                result
                  .evaluation
                  .id,

              estado:
                "en_progreso",

              fechaInicio:
                result
                  .evaluation
                  .fechaInicio ||
                verification
                  .capturedAt,
            },
          });
      } catch (
        error
      ) {
        console.error(
          "Error registrando verificación inicial de identidad:",
          error
        );

        return res
          .status(
            error.statusCode ||
            500
          )
          .json({
            message:
              error.message ||
              "No fue posible registrar la verificación de identidad.",

            code:
              error.code ||
              "IDENTITY_VERIFICATION_ERROR",
          });
      }
    }
  );

/* =========================================================
   CAPTURA FINAL
   POST /psychometric/access/:token/identity/final
========================================================= */

const captureFinalIdentity =
  catchError(
    async (
      req,
      res
    ) => {
      try {
        const result =
          await createIdentityVerification(
            {
              req,
              captureType:
                "final",
            }
          );

        const verification =
          result.verification;

        return res
          .status(
            result.duplicated
              ? 200
              : 201
          )
          .json({
            message:
              result.duplicated
                ? "La fotografía final ya había sido registrada."
                : "Verificación final de identidad registrada correctamente.",

            identityVerification: {
              id:
                verification.id,

              captureType:
                verification
                  .captureType,

              status:
                verification
                  .status,

              completed:
                true,

              capturedAt:
                verification
                  .capturedAt,

              consentAccepted:
                verification
                  .consentAccepted,

              consentVersion:
                verification
                  .consentVersion,
            },
          });
      } catch (
        error
      ) {
        console.error(
          "Error registrando verificación final de identidad:",
          error
        );

        return res
          .status(
            error.statusCode ||
            500
          )
          .json({
            message:
              error.message ||
              "No fue posible registrar la verificación final de identidad.",

            code:
              error.code ||
              "IDENTITY_VERIFICATION_ERROR",
          });
      }
    }
  );

/* =========================================================
   EXPORTACIONES
========================================================= */

module.exports = {
  captureInitialIdentity,
  captureFinalIdentity,
};