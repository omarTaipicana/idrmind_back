const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const PsychometricEvaluation = sequelize.define(
  "psychometricEvaluation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    /*
     * Inscripción general del usuario
     * al curso de tipo test_psicotecnico.
     */
    inscripcionId: {
      type: DataTypes.UUID,
      allowNull: false,

      references: {
        model: "inscripcions",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    /*
     * Test psicotécnico aplicado.
     *
     * El mismo test puede ser realizado por:
     * - múltiples empresas
     * - múltiples secciones
     * - personas individuales
     */
    testId: {
      type: DataTypes.UUID,
      allowNull: false,

      references: {
        model: "psychometric_tests",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },

    /*
     * Número histórico de evaluación.
     *
     * Ejemplo:
     * primera evaluación = 1
     * segunda evaluación = 2
     */
    numeroEvaluacion: {
      type: DataTypes.INTEGER,
      allowNull: false,

      validate: {
        min: 1,
      },
    },

    /*
     * Estado del flujo.
     */
    estado: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "pendiente_pago",

      validate: {
        isIn: [
          [
            "pendiente_pago",
            "pago_validado",
            "habilitada",
            "en_progreso",
            "completada",
            "anulada",
          ],
        ],
      },
    },

    /*
     * Fecha en que se habilita la evaluación.
     */
    fechaHabilitacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    /*
     * Momento real de inicio del test.
     */
    fechaInicio: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    /*
     * Momento de finalización.
     */
    fechaFinalizacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    /*
     * Versión del test aplicada.
     *
     * Permite conservar resultados históricos
     * aunque el test cambie después.
     */
    testVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,

      validate: {
        min: 1,
      },
    },

    /*
     * Puntaje general calculado.
     */
    puntajeTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    /*
     * Resultado completo calculado.
     *
     * Aquí ya guardas:
     * - animodo
     * - comunicación
     * - cerebro
     * - VAK
     * - negociación
     * - persistencia
     * - etc.
     */
    resultado: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    /* =====================================================
       SNAPSHOT HISTÓRICO EMPRESARIAL
    ===================================================== */

    /*
     * Empresa a la que pertenecía la persona
     * cuando realizó/finalizó esta evaluación.
     *
     * IMPORTANTE:
     * No depende del empresaId actual del User.
     *
     * Si es una persona individual:
     * empresaIdSnapshot = null
     */
    empresaIdSnapshot: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    /*
     * Sección a la que pertenecía la persona
     * en ese momento.
     *
     * Si es individual o no tiene sección:
     * seccionIdSnapshot = null
     */
    seccionIdSnapshot: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    /*
     * Snapshot histórico del participante.
     *
     * Permite conservar exactamente cómo estaba
     * el participante al finalizar la evaluación,
     * aunque después cambie:
     *
     * - empresa
     * - sección
     * - correo
     * - nombres
     * - datos organizacionales
     *
     * Ejemplo:
     *
     * {
     *   user: {
     *     id: "...",
     *     cI: "...",
     *     email: "...",
     *     firstName: "...",
     *     lastName: "...",
     *     cellular: "...",
     *     dateBirth: "...",
     *     genre: "..."
     *   },
     *
     *   empresa: {
     *     id: "...",
     *     razonSocial: "...",
     *     nombreComercial: "...",
     *     sector: "...",
     *     subSector: "..."
     *   },
     *
     *   seccion: {
     *     id: "...",
     *     nombre: "...",
     *     descripcion: "..."
     *   },
     *
     *   tipoParticipante: "empresa"
     * }
     *
     * Para una persona individual:
     *
     * tipoParticipante: "individual"
     * empresa: null
     * seccion: null
     */
    participantSnapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    /* =====================================================
       PERSONALIDAD
    ===================================================== */

    /*
     * Personalidad/animal calculado.
     */
    personalityId: {
      type: DataTypes.UUID,
      allowNull: true,

      references: {
        model: "psychometric_personalities",
        key: "id",
      },

      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },

    /* =====================================================
       RESULTADO / INFORME
    ===================================================== */

    /*
     * Indica si el participante ya puede
     * consultar el resultado.
     */
    resultadoLiberado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    /*
     * Fecha en que se generó/procesó
     * formalmente el resultado.
     */
    resultadoGeneradoAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    /*
     * Control del envío del resultado.
     */
    resultadoEmailEnviado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    resultadoEmailEnviadoAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    resultadoEmailEnvios: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,

      validate: {
        min: 0,
      },
    },

    /*
     * Si después guardamos un PDF permanente,
     * esta URL puede apuntar al archivo.
     *
     * Actualmente también puedes seguir
     * generándolo dinámicamente.
     */
    resultadoInformeUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    observacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "psychometric_evaluations",

    timestamps: true,

    indexes: [
      /*
       * Una inscripción/test no puede tener
       * repetido el mismo número de evaluación.
       */
      {
        unique: true,

        fields: [
          "inscripcionId",
          "testId",
          "numeroEvaluacion",
        ],

        name:
          "psychometric_evaluation_number_unique",
      },

      {
        fields: [
          "inscripcionId",
        ],
      },

      {
        fields: [
          "testId",
        ],
      },

      {
        fields: [
          "estado",
        ],
      },

      {
        fields: [
          "personalityId",
        ],
      },

      /*
       * =================================================
       * ÍNDICES PARA DASHBOARD PSICOMÉTRICO
       * =================================================
       */

      {
        fields: [
          "empresaIdSnapshot",
        ],

        name:
          "psychometric_evaluations_empresa_snapshot_idx",
      },

      {
        fields: [
          "seccionIdSnapshot",
        ],

        name:
          "psychometric_evaluations_seccion_snapshot_idx",
      },

      {
        fields: [
          "empresaIdSnapshot",
          "seccionIdSnapshot",
        ],

        name:
          "psychometric_evaluation_company_section_snapshot_idx",
      },

      {
        fields: [
          "fechaFinalizacion",
        ],

        name:
          "psychometric_evaluations_fecha_finalizacion_idx",
      },

      {
        fields: [
          "estado",
          "fechaFinalizacion",
        ],

        name:
          "psychometric_evaluations_estado_fecha_idx",
      },

      {
        fields: [
          "empresaIdSnapshot",
          "fechaFinalizacion",
        ],

        name:
          "psychometric_evaluations_empresa_fecha_idx",
      },

      {
        fields: [
          "empresaIdSnapshot",
          "seccionIdSnapshot",
          "fechaFinalizacion",
        ],

        name:
          "psychometric_evaluations_empresa_seccion_fecha_idx",
      },
    ],
  }
);

module.exports =
  PsychometricEvaluation;