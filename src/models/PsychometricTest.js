const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const PsychometricTest = sequelize.define(
  "psychometricTest",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,

      references: {
        model: "courses",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    nombre: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    instrucciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    duracionMinutos: {
      type: DataTypes.INTEGER,
      allowNull: true,

      validate: {
        min: 1,
      },
    },

    intentosPermitidos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,

      validate: {
        min: 1,
      },
    },

    permiteReintento: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    requierePagoPorIntento: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    permiteContinuar: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    preguntasAleatorias: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,

      validate: {
        min: 1,
      },
    },

    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "psychometric_tests",
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["courseId"],
        name: "psychometric_tests_course_id_unique",
      },

      {
        fields: ["activo"],
      },
    ],
  }
);

module.exports = PsychometricTest;