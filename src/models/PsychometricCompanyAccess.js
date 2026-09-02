const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const PsychometricCompanyAccess = sequelize.define(
  "psychometricCompanyAccess",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
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

    /*
     * Nunca guardamos el token original.
     * Guardamos únicamente SHA-256.
     */
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },

    /*
     * Por ahora lo dejamos sin expiración obligatoria.
     * Si deseas caducidad automática luego,
     * basta con asignar una fecha.
     */
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    firstUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    accessCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    ultimoEnvioAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    cantidadEnvios: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "psychometric_company_accesses",
    timestamps: true,

    indexes: [
      {
        fields: ["empresaId"],
      },
      {
        fields: ["activo"],
      },
      {
        fields: ["expiresAt"],
      },
    ],
  }
);

module.exports = PsychometricCompanyAccess;
