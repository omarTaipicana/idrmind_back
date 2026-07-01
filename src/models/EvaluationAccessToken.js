const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const EvaluationAccessToken = sequelize.define("evaluationAccessToken", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },

  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  courseId: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  inscripcionId: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  usedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = EvaluationAccessToken;