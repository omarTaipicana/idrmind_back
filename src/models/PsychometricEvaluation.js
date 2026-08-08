const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const PsychometricEvaluation = sequelize.define(
  "psychometricEvaluation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    /*
     * Inscripción general del usuario
     * al curso de tipo test_psicotecnico.
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
     * Test psicotécnico que se aplicará.
     */
    testId: {
      type: DataTypes.UUID,
      allowNull: false,

      references: {
        model: "psychometric_tests",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },

    /*
     * Número histórico de evaluación.
     *
     * Primera evaluación = 1
     * Evaluación después de 6 meses = 2
     */
    numeroEvaluacion: {
      type: DataTypes.INTEGER,
      allowNull: false,

      validate: {
        min: 1,
      },
    },

    estado: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "pendiente_pago",

      validate: {
        isIn: [
          [
            "pendiente_pago",
            "pago_validado",
            "habilitada",
            "en_progreso",
            "completada",
            "anulada",
          ],
        ],
      },
    },

    /*
     * Fecha en que se habilita la evaluación.
     */
    fechaHabilitacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    /*
     * Momento en que inicia el test.
     */
    fechaInicio: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    /*
     * Momento en que termina.
     */
    fechaFinalizacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    /*
     * Versión del test aplicada.
     *
     * Sirve para conservar resultados antiguos
     * aunque posteriormente cambien preguntas.
     */
    testVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    /*
     * Puntaje general calculado.
     */
    puntajeTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    /*
     * Resumen completo del resultado.
     */
    resultado: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    /*
     * Personalidad/animal calculado.
     */
    personalityId: {
      type: DataTypes.UUID,
      allowNull: true,

      references: {
        model: "psychometric_personalities",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },

    /*
     * Indica si el usuario puede consultar
     * su informe final.
     */
    resultadoLiberado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    observacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "psychometric_evaluations",
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: [
          "inscripcionId",
          "testId",
          "numeroEvaluacion",
        ],
        name:
          "psychometric_evaluation_number_unique",
      },

      {
        fields: ["inscripcionId"],
      },

      {
        fields: ["testId"],
      },

      {
        fields: ["estado"],
      },

      {
        fields: ["personalityId"],
      },
    ],
  }
);

module.exports = PsychometricEvaluation;