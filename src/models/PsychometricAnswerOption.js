const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const PsychometricAnswerOption = sequelize.define(
  "psychometricAnswerOption",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    /*
     * Respuesta principal a la que pertenece
     * esta selección.
     */
    answerId: {
      type: DataTypes.UUID,
      allowNull: false,

      references: {
        model: "psychometric_answers",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    /*
     * Opción seleccionada por el usuario.
     */
    optionId: {
      type: DataTypes.UUID,
      allowNull: false,

      references: {
        model: "psychometric_options",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },

    /*
     * Orden de preferencia de la opción.
     *
     * Ejemplo para colores de comunicación:
     * prioridad 1 → 3 puntos
     * prioridad 2 → 1 punto
     */
    prioridad: {
      type: DataTypes.INTEGER,
      allowNull: true,

      validate: {
        min: 1,
      },
    },

    /*
     * Puntaje efectivo asignado a esta selección.
     *
     * Se guarda el puntaje aplicado en ese momento
     * para conservar el resultado histórico aunque
     * luego cambie la configuración del test.
     */
    puntajeAplicado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    /*
     * Categoría histórica a la que sumó.
     *
     * Ejemplos:
     * VISUAL
     * AUDITIVO
     * KINESTESICO
     * AMARILLO
     * AZUL
     * ROJO
     * VERDE
     */
    categoriaResultado: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "psychometric_answer_options",
    timestamps: true,

    indexes: [
      /*
       * Una misma opción no puede repetirse dentro
       * de la misma respuesta.
       */
      {
        unique: true,
        fields: ["answerId", "optionId"],
        name:
          "psychometric_answer_option_unique",
      },

      {
        fields: ["answerId"],
      },

      {
        fields: ["optionId"],
      },

      {
        fields: ["categoriaResultado"],
      },
    ],
  }
);

module.exports = PsychometricAnswerOption;