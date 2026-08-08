const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const PsychometricAnswer = sequelize.define(
  "psychometricAnswer",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    /*
     * Evaluación histórica a la que pertenece
     * esta respuesta.
     */
    evaluationId: {
      type: DataTypes.UUID,
      allowNull: false,

      references: {
        model: "psychometric_evaluations",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    /*
     * Pregunta respondida.
     */
    questionId: {
      type: DataTypes.UUID,
      allowNull: false,

      references: {
        model: "psychometric_questions",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },

    /*
     * Respuesta numérica.
     *
     * Se usa para:
     * - escala 1 a 5
     * - escala bipolar
     * - valores calculados
     */
    valorNumerico: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    /*
     * Respuesta booleana para preguntas:
     * - Sí
     * - No
     */
    valorBooleano: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },

    /*
     * Permite guardar texto si posteriormente
     * aparece alguna pregunta abierta.
     */
    valorTexto: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /*
     * Puntaje total calculado para esta pregunta.
     *
     * En selección ponderada podría ser:
     * 3 + 1 = 4
     */
    puntajeCalculado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    /*
     * Tiempo utilizado para responder esta pregunta.
     * Se almacena en segundos.
     */
    tiempoSegundos: {
      type: DataTypes.INTEGER,
      allowNull: true,

      validate: {
        min: 0,
      },
    },

    /*
     * Información adicional de cálculo.
     *
     * Ejemplo:
     * {
     *   "sentir": 4,
     *   "pensar": 2
     * }
     */
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "psychometric_answers",
    timestamps: true,

    indexes: [
      /*
       * Una evaluación solamente puede tener
       * una respuesta principal por pregunta.
       */
      {
        unique: true,
        fields: ["evaluationId", "questionId"],
        name:
          "psychometric_answer_evaluation_question_unique",
      },

      {
        fields: ["evaluationId"],
      },

      {
        fields: ["questionId"],
      },
    ],
  }
);

module.exports = PsychometricAnswer;