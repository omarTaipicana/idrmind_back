const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const EmpresaSeccion = sequelize.define(
  "empresaSeccion",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    empresaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "empresas",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "El nombre de la sección es obligatorio.",
        },
      },
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    responsable: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    correo: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: {
        isEmail: {
          msg: "El correo de la sección no es válido.",
        },
      },
    },

    telefono: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "empresa_secciones",
    timestamps: true,

    indexes: [
      {
        fields: ["empresaId"],
      },
      {
        unique: true,
        fields: ["empresaId", "nombre"],
        name: "empresa_seccion_nombre_unique",
      },
    ],
  }
);

module.exports = EmpresaSeccion;