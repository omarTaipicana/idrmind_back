const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const PsychometricAccessToken = sequelize.define(
  "psychometricAccessToken",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

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
     * Nunca guardamos el código original.
     * Guardamos únicamente su hash.
     */
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    /*
     * Primer momento en que se abrió el enlace.
     */
    firstUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    /*
     * Último acceso realizado.
     */
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    /*
     * Cantidad de veces que se utilizó el enlace.
     */
    accessCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    purpose: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "test",

      validate: {
        isIn: [
          [
            "test",
            "payment",
            "result",
          ],
        ],
      },
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
    tableName: "psychometric_access_tokens",
    timestamps: true,

    indexes: [
      {
        fields: ["evaluationId"],
      },

      {
        fields: ["expiresAt"],
      },

      {
        fields: ["activo"],
      },
    ],
  }
);

module.exports = PsychometricAccessToken;