const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const PsychometricIdentityVerification = sequelize.define(
  "psychometricIdentityVerification",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    /* =====================================================
       EVALUACIÓN
    ===================================================== */

    evaluationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    /* =====================================================
       TIPO DE CAPTURA
       
       initial = antes de iniciar el test
       final   = antes de finalizar
       extra   = futuras verificaciones adicionales
    ===================================================== */

    captureType: {
      type: DataTypes.ENUM(
        "initial",
        "final",
        "extra"
      ),
      allowNull: false,
      defaultValue: "initial",
    },

    /* =====================================================
       ESTADO DE LA VERIFICACIÓN

       captured        -> foto recibida
       pending_review  -> pendiente de revisión
       verified        -> validada
       rejected        -> rechazada
    ===================================================== */

    status: {
      type: DataTypes.ENUM(
        "captured",
        "pending_review",
        "verified",
        "rejected"
      ),
      allowNull: false,
      defaultValue: "captured",
    },

    /* =====================================================
       ALMACENAMIENTO PRIVADO

       Evitamos depender directamente de una URL pública.
       storageProvider podría ser:
       cloudinary, local, s3, etc.
    ===================================================== */

    storageProvider: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    storageKey: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },

    /*
     * Si en algún momento necesitamos una referencia
     * interna adicional del proveedor.
     */
    storageAssetId: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

    /* =====================================================
       INFORMACIÓN DEL ARCHIVO
    ===================================================== */

    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    /*
     * Hash SHA-256.
     *
     * Sirve para comprobar posteriormente que el archivo
     * almacenado no fue sustituido o alterado.
     */
    fileHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },

    /* =====================================================
       CAPTURA
    ===================================================== */

    capturedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    /* =====================================================
       CONSENTIMIENTO

       Registramos que el participante aceptó la captura.
    ===================================================== */

    consentAccepted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    consentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    consentVersion: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    /* =====================================================
       TRAZABILIDAD
    ===================================================== */

    ipAddress: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /* =====================================================
       FUTURA VERIFICACIÓN FACIAL
       
       Por ahora quedan NULL.
    ===================================================== */

    faceDetected: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },

    faceCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    faceMatchScore: {
      type: DataTypes.DECIMAL(6, 5),
      allowNull: true,
    },

    faceMatchPassed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },

    /* =====================================================
       FUTURA PRUEBA DE VIDA / LIVENESS
    ===================================================== */

    livenessChecked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    livenessScore: {
      type: DataTypes.DECIMAL(6, 5),
      allowNull: true,
    },

    livenessPassed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },

    /* =====================================================
       REVISIÓN MANUAL FUTURA
    ===================================================== */

    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    reviewNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /* =====================================================
       INFORMACIÓN ADICIONAL

       JSONB nos permite agregar datos técnicos futuros
       sin alterar inmediatamente la estructura.
    ===================================================== */

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },

    /* =====================================================
       RETENCIÓN / PRIVACIDAD

       Nos permitirá posteriormente borrar fotografías
       automáticamente después del período establecido.
    ===================================================== */

    retentionUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName:
      "psychometric_identity_verifications",

    timestamps: true,

    /*
     * No elimina físicamente inmediatamente.
     * Sequelize utilizará deletedAt.
     */
    paranoid: true,

    indexes: [
      {
        fields: ["evaluationId"],
      },

      {
        fields: [
          "evaluationId",
          "captureType",
        ],
      },

      {
        fields: ["status"],
      },

      {
        fields: ["capturedAt"],
      },
    ],
  }
);

module.exports =
  PsychometricIdentityVerification;