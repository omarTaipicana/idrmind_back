const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const PsychometricPersonality = sequelize.define(
  "psychometricPersonality",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    /*
     * Número del 1 al 60.
     */
    numero: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,

      validate: {
        min: 1,
        max: 60,
      },
    },

    /*
     * Código interno de la combinación.
     *
     * Ejemplo:
     * ABEJA_AMARILLO_VERDE
     */
    codigo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },

    /*
     * Animal principal.
     */
    animal: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    /*
     * Color de la cabeza.
     * Determina el tipo de cerebro.
     */
    colorCabeza: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },

    /*
     * Tipo de cerebro según el color de cabeza.
     *
     * PENSANTE
     * EMOCIONAL
     * REPTILIANO
     */
    tipoCerebro: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    /*
     * Color del pecho.
     * Determina el tipo de comunicación.
     */
    colorPecho: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },

    /*
     * Tipo de comunicación según el pecho.
     *
     * LOGICO
     * EMOCIONAL
     * RETADOR
     * VISIONARIO
     */
    tipoComunicacion: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    /*
     * Nombre completo del resultado.
     *
     * Ejemplo:
     * ABEJA PENSANTE VISIONARIO
     */
    nombre: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    /*
     * Imagen previamente definida.
     * Incluye animal, color de cabeza y pecho.
     */
    imagenUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    formaPensar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    formaAprender: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    descripcionComunicacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "psychometric_personalities",
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: [
          "animal",
          "colorCabeza",
          "colorPecho",
        ],
        name:
          "psychometric_personality_combination_unique",
      },

      {
        fields: ["animal"],
      },

      {
        fields: ["tipoCerebro"],
      },

      {
        fields: ["tipoComunicacion"],
      },
    ],
  }
);

module.exports = PsychometricPersonality;