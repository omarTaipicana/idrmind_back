const crypto = require("crypto");

const catchError = require("../utils/catchError");

const PsychometricAccessToken = require(
  "../models/PsychometricAccessToken"
);

const PsychometricEvaluation = require(
  "../models/PsychometricEvaluation"
);

const PsychometricTest = require(
  "../models/PsychometricTest"
);

const PsychometricSection = require(
  "../models/PsychometricSection"
);

const PsychometricQuestion = require(
  "../models/PsychometricQuestion"
);

const PsychometricOption = require(
  "../models/PsychometricOption"
);

const PsychometricAnswer = require(
  "../models/PsychometricAnswer"
);

const PsychometricAnswerOption = require(
  "../models/PsychometricAnswerOption"
);

const Inscripcion = require(
  "../models/Inscripcion"
);

const User = require("../models/User");
const Course = require("../models/Course");

const Empresa = require("../models/Empresa");

const EmpresaSeccion = require(
  "../models/EmpresaSeccion"
);

/* =========================================================
   GENERAR HASH DEL TOKEN RECIBIDO
========================================================= */

const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(String(token || "").trim())
    .digest("hex");
};

/* =========================================================
   VALIDAR FECHA DE EXPIRACIÓN
========================================================= */

const isExpired = (expiresAt) => {
  if (!expiresAt) return true;

  return new Date(expiresAt).getTime() <
    Date.now();
};

/* =========================================================
   NORMALIZAR RESPUESTAS GUARDADAS
========================================================= */

const normalizeSavedAnswers = (
  answers = []
) => {
  return answers.map((answer) => ({
    id: answer.id,
    evaluationId: answer.evaluationId,
    questionId: answer.questionId,

    valorNumerico:
      answer.valorNumerico !== null
        ? Number(answer.valorNumerico)
        : null,

    valorBooleano:
      answer.valorBooleano,

    valorTexto:
      answer.valorTexto,

    puntajeCalculado:
      answer.puntajeCalculado !== null
        ? Number(answer.puntajeCalculado)
        : null,

    tiempoSegundos:
      answer.tiempoSegundos,

    metadata:
      answer.metadata,

    selectedOptions:
      (answer.selectedOptions || []).map(
        (selected) => ({
          id: selected.id,
          optionId: selected.optionId,
          prioridad: selected.prioridad,

          puntajeAplicado:
            selected.puntajeAplicado !== null
              ? Number(
                  selected.puntajeAplicado
                )
              : null,

          categoriaResultado:
            selected.categoriaResultado,

          metadata:
            selected.metadata,
        })
      ),
  }));
};

/* =========================================================
   GET /psychometric/access/:token
========================================================= */

const validatePsychometricAccess =
  catchError(async (req, res) => {
    const { token } = req.params;

    if (!token || !String(token).trim()) {
      return res.status(400).json({
        message:
          "El código de acceso es requerido.",
      });
    }

    const tokenHash = hashToken(token);

    const access =
      await PsychometricAccessToken.findOne({
        where: {
          tokenHash,
        },

        include: [
          {
            model: PsychometricEvaluation,
            as: "evaluation",

            include: [
              {
                model: PsychometricTest,
                as: "test",

                include: [
                  {
                    model: Course,
                    as: "course",
                  },

                  {
                    model:
                      PsychometricSection,

                    as: "sections",

                    where: {
                      activo: true,
                    },

                    required: false,

                    separate: true,

                    order: [
                      ["orden", "ASC"],
                    ],

                    include: [
                      {
                        model:
                          PsychometricQuestion,

                        as: "questions",

                        where: {
                          activo: true,
                        },

                        required: false,

                        separate: true,

                        order: [
                          ["orden", "ASC"],
                        ],

                        include: [
                          {
                            model:
                              PsychometricOption,

                            as: "options",

                            where: {
                              activo: true,
                            },

                            required: false,

                            separate: true,

                            order: [
                              ["orden", "ASC"],
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },

              {
                model: Inscripcion,
                as: "inscripcion",

                include: [
                  {
                    model: User,
                    as: "user",

                    attributes: [
                      "id",
                      "cI",
                      "email",
                      "firstName",
                      "lastName",
                      "cellular",
                      "grado",
                      "subsistema",
                      "empresaId",
                      "seccionId",
                    ],

                    include: [
                      {
                        model: Empresa,
                        as: "empresa",

                        attributes: [
                          "id",
                          "razonSocial",
                          "nombreComercial",
                        ],

                        required: false,
                      },

                      {
                        model:
                          EmpresaSeccion,

                        as: "empresaSeccion",

                        attributes: [
                          "id",
                          "nombre",
                        ],

                        required: false,
                      },
                    ],
                  },
                ],
              },

              {
                model: PsychometricAnswer,
                as: "answers",

                required: false,

                include: [
                  {
                    model:
                      PsychometricAnswerOption,

                    as: "selectedOptions",

                    required: false,
                  },
                ],
              },
            ],
          },
        ],
      });

    if (!access) {
      return res.status(404).json({
        message:
          "El enlace del test no es válido.",
        code: "INVALID_ACCESS_TOKEN",
      });
    }

    if (!access.activo) {
      return res.status(410).json({
        message:
          "El enlace del test ya no se encuentra activo.",
        code: "INACTIVE_ACCESS_TOKEN",
      });
    }

    if (access.revokedAt) {
      return res.status(410).json({
        message:
          "El enlace del test fue revocado.",
        code: "REVOKED_ACCESS_TOKEN",
      });
    }

    if (isExpired(access.expiresAt)) {
      await access.update({
        activo: false,
      });

      return res.status(410).json({
        message:
          "El enlace del test ha expirado.",
        code: "EXPIRED_ACCESS_TOKEN",
      });
    }

    const evaluation = access.evaluation;

    if (!evaluation) {
      return res.status(404).json({
        message:
          "No se encontró la evaluación asociada al enlace.",
        code: "EVALUATION_NOT_FOUND",
      });
    }

    if (evaluation.estado === "anulada") {
      return res.status(410).json({
        message:
          "La evaluación fue anulada.",
        code: "EVALUATION_CANCELLED",
      });
    }

    if (
      evaluation.estado === "completada"
    ) {
      return res.status(409).json({
        message:
          "Esta evaluación ya fue completada.",
        code: "EVALUATION_COMPLETED",

        evaluation: {
          id: evaluation.id,
          numeroEvaluacion:
            evaluation.numeroEvaluacion,
          estado: evaluation.estado,
          fechaFinalizacion:
            evaluation.fechaFinalizacion,
          resultadoLiberado:
            evaluation.resultadoLiberado,
        },
      });
    }

    /*
     * Registrar uso del enlace.
     */
    const now = new Date();

    await access.update({
      firstUsedAt:
        access.firstUsedAt || now,

      lastUsedAt: now,

      accessCount:
        Number(access.accessCount || 0) +
        1,
    });

    /*
     * Cuando se abre por primera vez,
     * cambiamos a en_progreso.
     */
    if (
      [
        "habilitada",
        "pago_validado",
      ].includes(evaluation.estado)
    ) {
      await evaluation.update({
        estado: "en_progreso",

        fechaInicio:
          evaluation.fechaInicio || now,
      });
    }

    const test = evaluation.test;

    if (!test) {
      return res.status(404).json({
        message:
          "No se encontró la configuración del test.",
        code: "TEST_NOT_FOUND",
      });
    }

    const inscription =
      evaluation.inscripcion;

    const user = inscription?.user;

    const sections =
      (test.sections || []).map(
        (section) => ({
          id: section.id,
          codigo: section.codigo,
          nombre: section.nombre,
          descripcion:
            section.descripcion,
          instrucciones:
            section.instrucciones,
          orden: section.orden,
          tipoCalculo:
            section.tipoCalculo,
          configuracion:
            section.configuracion,
          obligatoria:
            section.obligatoria,

          questions:
            (
              section.questions || []
            ).map((question) => ({
              id: question.id,
              sectionId:
                question.sectionId,

              pregunta:
                question.pregunta,

              tipoRespuesta:
                question.tipoRespuesta,

              orden:
                question.orden,

              obligatoria:
                question.obligatoria,

              valorMinimo:
                question.valorMinimo,

              valorMaximo:
                question.valorMaximo,

              seleccionesMinimas:
                question
                  .seleccionesMinimas,

              seleccionesMaximas:
                question
                  .seleccionesMaximas,

              instrucciones:
                question.instrucciones,

              configuracion:
                question.configuracion,

              options:
                (
                  question.options || []
                ).map((option) => ({
                  id: option.id,
                  questionId:
                    option.questionId,

                  texto:
                    option.texto,

                  codigo:
                    option.codigo,

                  orden:
                    option.orden,

                  categoriaResultado:
                    option
                      .categoriaResultado,

                  /*
                   * El frontend no necesita
                   * conocer el puntaje para
                   * responder el test.
                   *
                   * Esto evita revelar la lógica.
                   */
                  metadata:
                    option.metadata,
                })),
            })),
        })
      );

    const savedAnswers =
      normalizeSavedAnswers(
        evaluation.answers || []
      );

    const totalQuestions =
      sections.reduce(
        (total, section) =>
          total +
          section.questions.length,
        0
      );

    const answeredQuestionIds =
      new Set(
        savedAnswers.map(
          (answer) =>
            String(answer.questionId)
        )
      );

    const answeredQuestions =
      answeredQuestionIds.size;

    const progress =
      totalQuestions > 0
        ? Number(
            (
              (answeredQuestions /
                totalQuestions) *
              100
            ).toFixed(2)
          )
        : 0;

    return res.json({
      message:
        "Acceso al test validado correctamente.",

      access: {
        expiresAt:
          access.expiresAt,

        accessCount:
          Number(access.accessCount || 0) +
          1,
      },

      evaluation: {
        id: evaluation.id,

        numeroEvaluacion:
          evaluation.numeroEvaluacion,

        estado:
          "en_progreso",

        fechaHabilitacion:
          evaluation.fechaHabilitacion,

        fechaInicio:
          evaluation.fechaInicio || now,

        testVersion:
          evaluation.testVersion,

        resultadoLiberado:
          evaluation.resultadoLiberado,
      },

      user: user
        ? {
            id: user.id,
            cI: user.cI,
            email: user.email,
            firstName:
              user.firstName,
            lastName:
              user.lastName,
            cellular:
              user.cellular,
            grado: user.grado,
            subsistema:
              user.subsistema,

            empresa:
              user.empresa
                ? {
                    id:
                      user.empresa.id,

                    nombre:
                      user.empresa
                        .nombreComercial ||
                      user.empresa
                        .razonSocial,
                  }
                : null,

            seccion:
              user.empresaSeccion
                ? {
                    id:
                      user
                        .empresaSeccion
                        .id,

                    nombre:
                      user
                        .empresaSeccion
                        .nombre,
                  }
                : null,
          }
        : null,

      course: test.course
        ? {
            id: test.course.id,
            nombre:
              test.course.nombre,
            sigla:
              test.course.sigla,
            objetivo:
              test.course.objetivo,
            tipo:
              test.course.tipo,
          }
        : null,

      test: {
        id: test.id,
        nombre: test.nombre,
        descripcion:
          test.descripcion,
        instrucciones:
          test.instrucciones,

        duracionMinutos:
          test.duracionMinutos,

        permiteContinuar:
          test.permiteContinuar,

        preguntasAleatorias:
          test.preguntasAleatorias,

        version:
          test.version,

        sections,
      },

      progress: {
        totalQuestions,
        answeredQuestions,
        pendingQuestions:
          Math.max(
            totalQuestions -
              answeredQuestions,
            0
          ),

        percentage: progress,
      },

      savedAnswers,
    });
  });

module.exports = {
  validatePsychometricAccess,
};