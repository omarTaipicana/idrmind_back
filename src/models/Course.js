const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const Course = sequelize.define("course", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  nombre: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sigla: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  objetivo: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  tipo: {
    type: DataTypes.ENUM(
      "curso",
      "test_psicotecnico"
    ),
    allowNull: false,
    defaultValue: "curso",
  },

  precio_emp: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  precio_mdt: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  precio_int: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  vigente: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  contificoProductoId: {
    type: DataTypes.STRING,
    allowNull: true,
  },

});

module.exports = Course;
