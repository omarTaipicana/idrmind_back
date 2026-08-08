const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const PsychometricOption = sequelize.define(
  "psychometricOption",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    questionId: {
      type: DataTypes.UUID,
      allowNull: false,

      references: {
        model: "psychometric_questions",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    /*
     * Texto visible de la opción.
     */
    texto: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    /*
     * Código interno.
     *
     * Ejemplos:
     * A, B, C
     * V, A, K
     * LOGICO, RETADOR...
     */
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    /*
     * Categoría a la que suma.
     *
     * Ejemplos:
     * VISUAL
     * AUDITIVO
     * KINESTESICO
     * AMARILLO
     * AZUL
     * ROJO
     * VERDE
     */
    categoriaResultado: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    /*
     * Puntaje fijo de la opción, cuando aplique.
     */
    puntaje: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    /*
     * Información adicional para cálculos especiales.
     */
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "psychometric_options",
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["questionId", "orden"],
        name:
          "psychometric_option_order_unique",
      },

      {
        fields: ["questionId"],
      },

      {
        fields: ["categoriaResultado"],
      },
    ],
  }
);

module.exports = PsychometricOption;