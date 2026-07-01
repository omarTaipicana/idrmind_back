const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const EvaluationAnswer = sequelize.define("evaluationAnswer", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  responseId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: "Evaluación a la que pertenece la respuesta.",
  },

  questionId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: "Pregunta respondida.",
  },

  value: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment:
      "Valor de la respuesta. Puede ser 1-5 para preguntas tipo escala o texto para preguntas abiertas.",
  },
});

module.exports = EvaluationAnswer;