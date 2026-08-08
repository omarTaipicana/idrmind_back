const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const Pagos = sequelize.define(
  "pagos",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    /*
     * Inscripción general del usuario.
     *
     * Se utiliza tanto para cursos normales
     * como para el test psicométrico.
     */
    inscripcionId: {
      type: DataTypes.UUID,
      allowNull: false,

      references: {
        model: "inscripcions",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    /*
     * Evaluación psicométrica específica que se paga.
     *
     * Para pagos normales de cursos será null.
     */
    psychometricEvaluationId: {
      type: DataTypes.UUID,
      allowNull: true,

      references: {
        model: "psychometric_evaluations",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },

    /*
     * Permite diferenciar pagos normales
     * de pagos correspondientes al test.
     */
    tipoPago: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "curso",

      validate: {
        isIn: [
          [
            "curso",
            "test_psicometrico",
          ],
        ],
      },
    },

    /*
     * URL del comprobante subido.
     */
    pagoUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    /*
     * Sigla o código del curso.
     *
     * Ejemplo:
     * iehia
     * test_psicotecnico
     */
    curso: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    cert_emp: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    cert_mdt: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    cert_int: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    valorDepositado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    porcentajeIva: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    iva: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    entidad: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    idDeposito: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    confirmacion: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    verificado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    distintivo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    moneda: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    entregado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    observacion: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    usuarioEdicion: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    facturaUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    /* =========================================
       CONTÍFICO
    ========================================= */

    contificoDocumentoId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    contificoDocumentoNumero: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    contificoEstado: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    contificoAutorizacion: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    contificoUrlRide: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    contificoUrlXml: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    contificoFirmado: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    contificoEmailEnviado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    contificoEmailEnviadoAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "pagos",
    timestamps: true,

    indexes: [
      {
        fields: ["inscripcionId"],
      },

      {
        fields: ["psychometricEvaluationId"],
      },

      {
        fields: ["tipoPago"],
      },

      {
        fields: ["curso"],
      },

      {
        fields: ["verificado"],
      },

      {
        fields: ["createdAt"],
      },

      /*
       * Acelera la validación que ya haces
       * por entidad e identificador de depósito.
       *
       * No lo hacemos unique porque actualmente
       * ambos campos permiten null y tu controlador
       * ya realiza la validación correspondiente.
       */
      {
        fields: [
          "entidad",
          "idDeposito",
        ],
      },
    ],
  }
);

module.exports = Pagos;