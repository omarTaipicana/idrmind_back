const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const PsychometricSection = sequelize.define(
  "psychometricSection",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    testId: {
      type: DataTypes.UUID,
      allowNull: false,

      references: {
        model: "psychometric_tests",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    /*
     * Código interno estable.
     *
     * No debe cambiar aunque cambie el nombre visible.
     */
    codigo: {
      type: DataTypes.STRING(80),
      allowNull: false,
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

    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    /*
     * Identifica cómo se calcula este bloque.
     *
     * La lógica real estará en un servicio del backend.
     */
    tipoCalculo: {
      type: DataTypes.STRING(80),
      allowNull: false,

      validate: {
        isIn: [
          [
            "animodo_ejes",
            "comunicacion_colores",
            "cerebro_tres_dimensiones",
            "negociacion_puntaje",
            "vak_predominante",
            "persistencia_compuesta",
          ],
        ],
      },
    },

    /*
     * Configuración adicional sin tener que
     * crear nuevas columnas para cada bloque.
     */
    configuracion: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    obligatoria: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "psychometric_sections",
    timestamps: true,

    indexes: [
      {
        unique: true,
        fields: ["testId", "codigo"],
        name:
          "psychometric_section_test_code_unique",
      },

      {
        unique: true,
        fields: ["testId", "orden"],
        name:
          "psychometric_section_test_order_unique",
      },

      {
        fields: ["testId"],
      },

      {
        fields: ["tipoCalculo"],
      },

      {
        fields: ["activo"],
      },
    ],
  }
);

module.exports = PsychometricSection;