const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const PsychometricQuestion = sequelize.define(
  "psychometricQuestion",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    /*
     * Sección o bloque al que pertenece.
     *
     * Ejemplos:
     * - Animodo
     * - Colores de comunicación
     * - Tipos de cerebro
     * - Forma negociadora
     * - VAK
     */
    sectionId: {
      type: DataTypes.UUID,
      allowNull: false,

      references: {
        model: "psychometric_sections",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    /*
     * Texto visible de la pregunta.
     */
    pregunta: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    /*
     * Tipo de componente que mostrará el frontend.
     */
    tipoRespuesta: {
      type: DataTypes.STRING(50),
      allowNull: false,

      validate: {
        isIn: [
          [
            "si_no",
            "escala_bipolar",
            "escala_1_5",
            "seleccion_unica",
            "seleccion_multiple",
            "seleccion_ponderada",
          ],
        ],
      },
    },

    /*
     * Posición de la pregunta dentro de su sección.
     */
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,

      validate: {
        min: 1,
      },
    },

    obligatoria: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    /*
     * Valores utilizados por preguntas de escala.
     *
     * Ejemplos:
     * escala 1 a 5
     * escala bipolar 1 a 6
     */
    valorMinimo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    valorMaximo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    /*
     * Cantidad de opciones que debe seleccionar.
     *
     * Selección única:
     * mínimo 1, máximo 1
     *
     * Selección ponderada:
     * mínimo 2, máximo 2
     */
    seleccionesMinimas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,

      validate: {
        min: 1,
      },
    },

    seleccionesMaximas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,

      validate: {
        min: 1,
      },
    },

    /*
     * Texto adicional para explicar cómo responder.
     */
    instrucciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    /*
     * Permite agregar configuraciones especiales
     * sin crear nuevas columnas.
     *
     * Ejemplo:
     * {
     *   "etiquetaIzquierda": "Pensar",
     *   "etiquetaDerecha": "Sentir",
     *   "puntajePrimeraSeleccion": 3,
     *   "puntajeSegundaSeleccion": 1
     * }
     */
    configuracion: {
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
    tableName: "psychometric_questions",
    timestamps: true,

    indexes: [
      /*
       * No puede haber dos preguntas con el mismo
       * orden dentro de una sección.
       */
      {
        unique: true,
        fields: ["sectionId", "orden"],
        name:
          "psychometric_question_section_order_unique",
      },

      {
        fields: ["sectionId"],
      },

      {
        fields: ["tipoRespuesta"],
      },

      {
        fields: ["activo"],
      },
    ],
  }
);

module.exports = PsychometricQuestion;