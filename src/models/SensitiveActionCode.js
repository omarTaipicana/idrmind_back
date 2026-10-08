const { DataTypes } = require('sequelize');
const sequelize = require('../utils/connection');
module.exports = sequelize.define('sensitiveActionCode', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  evaluationId: { type: DataTypes.UUID, allowNull: false },
  codeHash: { type: DataTypes.STRING(64), allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  consumedAt: { type: DataTypes.DATE, allowNull: true },
}, { indexes: [{ fields: ['userId', 'evaluationId'] }] });
