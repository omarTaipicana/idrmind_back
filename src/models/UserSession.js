const { DataTypes } = require('sequelize');
const sequelize = require('../utils/connection');
module.exports = sequelize.define('userSession', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  lastActivityAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  revokedAt: { type: DataTypes.DATE, allowNull: true },
}, { indexes: [{ fields: ['userId'] }] });
