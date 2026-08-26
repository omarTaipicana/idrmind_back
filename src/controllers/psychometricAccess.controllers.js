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

const PsychometricIdentityVerification = require(
  "../models/PsychometricIdentityVerification"
);

const Inscripcion = require(
  "../models/Inscripcion"
);

const User = require(
  "../models/User"
);

const Course = require(
  "../models/Course"
);

const Empresa = require(
  "../models/Empresa"
);

const EmpresaSeccion = require(
  "../models/EmpresaSeccion"
);

/* =========================================================
   GENERAR HASH DEL TOKEN RECIBIDO
========================================================= */

const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(
      String(token || "").trim()
    )
    .digest("hex");
};

/* =========================================================
   VALIDAR FECHA DE EXPIRACIÓN
========================================================= */

const isExpired = (
  expiresAt
) => {
  if (!expiresAt) {
    return true;
  }

  return (
    new Date(
      expiresAt
    ).getTime() <
    Date.now()
  );
};

/* =========================================================
   NORMALIZAR RESPUESTAS GUARDADAS
========================================================= */

const normalizeSavedAnswers = (
  answers = []
) => {
  return answers.map(
    (answer) => ({
      id:
        answer.id,

      evaluationId:
        answer.evaluationId,

      questionId:
        answer.questionId,

      valorNumerico:
        answer.valorNumerico !==
        null
          ? Number(
              answer.valorNumerico
            )
          : null,

      valorBooleano:
        answer.valorBooleano,

      valorTexto:
        answer.valorTexto,

      puntajeCalculado:
        answer.puntajeCalculado !==
        null
          ? Number(
              answer.puntajeCalculado
            )
          : null,

      tiempoSegundos:
        answer.tiempoSegundos,

      metadata:
        answer.metadata,

      selectedOptions:
        (
          answer.selectedOptions ||
          []
        ).map(
          (selected) => ({
            id:
              selected.id,

            optionId:
              selected.optionId,

            prioridad:
              selected.prioridad,

            puntajeAplicado:
              selected
                .puntajeAplicado !==
              null
                ? Number(
                    selected
                      .puntajeAplicado
                  )
                : null,

            categoriaResultado:
              selected
                .categoriaResultado,

            metadata:
              selected.metadata,
          })
        ),
    })
  );
};

/* =========================================================
   OBTENER ESTADO DE VERIFICACIÓN DE IDENTIDAD
========================================================= */

const getIdentityVerificationStatus =
  async (
    evaluationId
  ) => {
    const [
      initialVerification,
      finalVerification,
    ] =
      await Promise.all([
        PsychometricIdentityVerification.findOne(
          {
            where: {
              evaluationId,
              captureType:
                "initial",
            },

            order: [
              [
                "capturedAt",
                "DESC",
              ],
            ],

            attributes: [
              "id",
              "captureType",
              "status",
              "capturedAt",
              "consentAccepted",
              "consentAt",
              "consentVersion",
              "faceDetected",
              "faceCount",
              "faceMatchPassed",
              "livenessChecked",
              "livenessPassed",
            ],
          }
        ),

        PsychometricIdentityVerification.findOne(
          {
            where: {
              evaluationId,
              captureType:
                "final",
            },

            order: [
              [
                "capturedAt",
                "DESC",
              ],
            ],

            attributes: [
              "id",
              "captureType",
              "status",
              "capturedAt",
              "consentAccepted",
              "consentAt",
              "consentVersion",
              "faceDetected",
              "faceCount",
              "faceMatchPassed",
              "livenessChecked",
              "livenessPassed",
            ],
          }
        ),
      ]);

    return {
      initialVerification,
      finalVerification,
    };
  };

/* =========================================================
   GET /psychometric/access/:token
========================================================= */

const validatePsychometricAccess =
  catchError(
    async (
      req,
      res
    ) => {
      const {
        token,
      } = req.params;

      /* =====================================================
         VALIDAR TOKEN
      ===================================================== */

      if (
        !token ||
        !String(
          token
        ).trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "El código de acceso es requerido.",
          });
      }

      const tokenHash =
        hashToken(
          token
        );

      /* =====================================================
         BUSCAR ACCESO + EVALUACIÓN
      ===================================================== */

      const access =
        await PsychometricAccessToken.findOne(
          {
            where: {
              tokenHash,
            },

            include: [
              {
                model:
                  PsychometricEvaluation,

                as:
                  "evaluation",

                include: [
                  /* =========================================
                     TEST
                  ========================================= */

                  {
                    model:
                      PsychometricTest,

                    as:
                      "test",

                    include: [
                      {
                        model:
                          Course,

                        as:
                          "course",
                      },

                      /* =====================================
                         SECCIONES
                      ===================================== */

                      {
                        model:
                          PsychometricSection,

                        as:
                          "sections",

                        where: {
                          activo: true,
                        },

                        required:
                          false,

                        separate:
                          true,

                        order: [
                          [
                            "orden",
                            "ASC",
                          ],
                        ],

                        include: [
                          /* ===============================
                             PREGUNTAS
                          =============================== */

                          {
                            model:
                              PsychometricQuestion,

                            as:
                              "questions",

                            where: {
                              activo:
                                true,
                            },

                            required:
                              false,

                            separate:
                              true,

                            order: [
                              [
                                "orden",
                                "ASC",
                              ],
                            ],

                            include: [
                              /* ===========================
                                 OPCIONES
                              =========================== */

                              {
                                model:
                                  PsychometricOption,

                                as:
                                  "options",

                                where: {
                                  activo:
                                    true,
                                },

                                required:
                                  false,

                                separate:
                                  true,

                                order: [
                                  [
                                    "orden",
                                    "ASC",
                                  ],
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },

                  /* =========================================
                     INSCRIPCIÓN / USUARIO
                  ========================================= */

                  {
                    model:
                      Inscripcion,

                    as:
                      "inscripcion",

                    include: [
                      {
                        model:
                          User,

                        as:
                          "user",

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
                            model:
                              Empresa,

                            as:
                              "empresa",

                            attributes: [
                              "id",
                              "razonSocial",
                              "nombreComercial",
                            ],

                            required:
                              false,
                          },

                          {
                            model:
                              EmpresaSeccion,

                            as:
                              "empresaSeccion",

                            attributes: [
                              "id",
                              "nombre",
                            ],

                            required:
                              false,
                          },
                        ],
                      },
                    ],
                  },

                  /* =========================================
                     RESPUESTAS GUARDADAS
                  ========================================= */

                  {
                    model:
                      PsychometricAnswer,

                    as:
                      "answers",

                    required:
                      false,

                    include: [
                      {
                        model:
                          PsychometricAnswerOption,

                        as:
                          "selectedOptions",

                        required:
                          false,
                      },
                    ],
                  },
                ],
              },
            ],
          }
        );

      /* =====================================================
         VALIDAR ACCESO
      ===================================================== */

      if (!access) {
        return res
          .status(404)
          .json({
            message:
              "El enlace del test no es válido.",

            code:
              "INVALID_ACCESS_TOKEN",
          });
      }

      if (
        !access.activo
      ) {
        return res
          .status(410)
          .json({
            message:
              "El enlace del test ya no se encuentra activo.",

            code:
              "INACTIVE_ACCESS_TOKEN",
          });
      }

      if (
        access.revokedAt
      ) {
        return res
          .status(410)
          .json({
            message:
              "El enlace del test fue revocado.",

            code:
              "REVOKED_ACCESS_TOKEN",
          });
      }

      /* =====================================================
         EXPIRACIÓN
      ===================================================== */

      if (
        isExpired(
          access.expiresAt
        )
      ) {
        await access.update(
          {
            activo:
              false,
          }
        );

        return res
          .status(410)
          .json({
            message:
              "El enlace del test ha expirado.",

            code:
              "EXPIRED_ACCESS_TOKEN",
          });
      }

      /* =====================================================
         EVALUACIÓN
      ===================================================== */

      const evaluation =
        access.evaluation;

      if (
        !evaluation
      ) {
        return res
          .status(404)
          .json({
            message:
              "No se encontró la evaluación asociada al enlace.",

            code:
              "EVALUATION_NOT_FOUND",
          });
      }

      if (
        evaluation.estado ===
        "anulada"
      ) {
        return res
          .status(410)
          .json({
            message:
              "La evaluación fue anulada.",

            code:
              "EVALUATION_CANCELLED",
          });
      }

      if (
        evaluation.estado ===
        "completada"
      ) {
        return res
          .status(409)
          .json({
            message:
              "Esta evaluación ya fue completada.",

            code:
              "EVALUATION_COMPLETED",

            evaluation: {
              id:
                evaluation.id,

              numeroEvaluacion:
                evaluation
                  .numeroEvaluacion,

              estado:
                evaluation.estado,

              fechaFinalizacion:
                evaluation
                  .fechaFinalizacion,

              resultadoLiberado:
                evaluation
                  .resultadoLiberado,
            },
          });
      }

      /* =====================================================
         REGISTRAR USO DEL ENLACE
      ===================================================== */

      const now =
        new Date();

      const newAccessCount =
        Number(
          access.accessCount ||
          0
        ) + 1;

      await access.update(
        {
          firstUsedAt:
            access.firstUsedAt ||
            now,

          lastUsedAt:
            now,

          accessCount:
            newAccessCount,
        }
      );

      /* =====================================================
         IMPORTANTE

         YA NO CAMBIAMOS LA EVALUACIÓN A "en_progreso"
         AL SIMPLEMENTE ABRIR EL ENLACE.

         La evaluación comenzará realmente cuando
         registremos la captura inicial de identidad.

         Mientras todavía no implementamos el endpoint
         de fotografía, saveAnswers mantiene su mecanismo
         actual de respaldo para marcarla en_progreso.
      ===================================================== */

      /* =====================================================
         VERIFICACIÓN DE IDENTIDAD
      ===================================================== */

      const {
        initialVerification,
        finalVerification,
      } =
        await getIdentityVerificationStatus(
          evaluation.id
        );

      /* =====================================================
         TEST
      ===================================================== */

      const test =
        evaluation.test;

      if (!test) {
        return res
          .status(404)
          .json({
            message:
              "No se encontró la configuración del test.",

            code:
              "TEST_NOT_FOUND",
          });
      }

      /* =====================================================
         USUARIO
      ===================================================== */

      const inscription =
        evaluation.inscripcion;

      const user =
        inscription?.user;

      /* =====================================================
         NORMALIZAR SECCIONES
      ===================================================== */

      const sections =
        (
          test.sections ||
          []
        ).map(
          (
            section
          ) => ({
            id:
              section.id,

            codigo:
              section.codigo,

            nombre:
              section.nombre,

            descripcion:
              section.descripcion,

            instrucciones:
              section.instrucciones,

            orden:
              section.orden,

            tipoCalculo:
              section.tipoCalculo,

            configuracion:
              section.configuracion,

            obligatoria:
              section.obligatoria,

            questions:
              (
                section.questions ||
                []
              ).map(
                (
                  question
                ) => ({
                  id:
                    question.id,

                  sectionId:
                    question
                      .sectionId,

                  pregunta:
                    question
                      .pregunta,

                  tipoRespuesta:
                    question
                      .tipoRespuesta,

                  orden:
                    question
                      .orden,

                  obligatoria:
                    question
                      .obligatoria,

                  valorMinimo:
                    question
                      .valorMinimo,

                  valorMaximo:
                    question
                      .valorMaximo,

                  seleccionesMinimas:
                    question
                      .seleccionesMinimas,

                  seleccionesMaximas:
                    question
                      .seleccionesMaximas,

                  instrucciones:
                    question
                      .instrucciones,

                  configuracion:
                    question
                      .configuracion,

                  options:
                    (
                      question.options ||
                      []
                    ).map(
                      (
                        option
                      ) => ({
                        id:
                          option.id,

                        questionId:
                          option
                            .questionId,

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
                         * Esto evita revelar
                         * la lógica de cálculo.
                         */
                        metadata:
                          option
                            .metadata,
                      })
                    ),
                })
              ),
          })
        );

      /* =====================================================
         RESPUESTAS GUARDADAS
      ===================================================== */

      const savedAnswers =
        normalizeSavedAnswers(
          evaluation.answers ||
          []
        );

      /* =====================================================
         PROGRESO
      ===================================================== */

      const totalQuestions =
        sections.reduce(
          (
            total,
            section
          ) =>
            total +
            section
              .questions
              .length,

          0
        );

      const answeredQuestionIds =
        new Set(
          savedAnswers.map(
            (
              answer
            ) =>
              String(
                answer
                  .questionId
              )
          )
        );

      const answeredQuestions =
        answeredQuestionIds.size;

      const progress =
        totalQuestions >
        0
          ? Number(
              (
                (
                  answeredQuestions /
                  totalQuestions
                ) *
                100
              ).toFixed(
                2
              )
            )
          : 0;

      /* =====================================================
         RESPUESTA
      ===================================================== */

      return res.json(
        {
          message:
            "Acceso al test validado correctamente.",

          /* =================================================
             INFORMACIÓN DEL TOKEN
          ================================================= */

          access: {
            expiresAt:
              access.expiresAt,

            accessCount:
              newAccessCount,
          },

          /* =================================================
             EVALUACIÓN

             IMPORTANTE:
             Ya no forzamos "en_progreso".
          ================================================= */

          evaluation: {
            id:
              evaluation.id,

            numeroEvaluacion:
              evaluation
                .numeroEvaluacion,

            estado:
              evaluation.estado,

            fechaHabilitacion:
              evaluation
                .fechaHabilitacion,

            fechaInicio:
              evaluation
                .fechaInicio ||
              null,

            testVersion:
              evaluation
                .testVersion,

            resultadoLiberado:
              evaluation
                .resultadoLiberado,
          },

          /* =================================================
             VERIFICACIÓN DE IDENTIDAD
          ================================================= */

          identityVerification: {
            required:
              true,

            initial: {
              completed:
                Boolean(
                  initialVerification
                ),

              id:
                initialVerification
                  ?.id ||
                null,

              status:
                initialVerification
                  ?.status ||
                null,

              capturedAt:
                initialVerification
                  ?.capturedAt ||
                null,

              consentAccepted:
                Boolean(
                  initialVerification
                    ?.consentAccepted
                ),

              consentAt:
                initialVerification
                  ?.consentAt ||
                null,

              consentVersion:
                initialVerification
                  ?.consentVersion ||
                null,

              /*
               * Campos preparados
               * para futuras mejoras.
               */
              faceDetected:
                initialVerification
                  ?.faceDetected ??
                null,

              faceCount:
                initialVerification
                  ?.faceCount ??
                null,

              faceMatchPassed:
                initialVerification
                  ?.faceMatchPassed ??
                null,

              livenessChecked:
                Boolean(
                  initialVerification
                    ?.livenessChecked
                ),

              livenessPassed:
                initialVerification
                  ?.livenessPassed ??
                null,
            },

            final: {
              completed:
                Boolean(
                  finalVerification
                ),

              id:
                finalVerification
                  ?.id ||
                null,

              status:
                finalVerification
                  ?.status ||
                null,

              capturedAt:
                finalVerification
                  ?.capturedAt ||
                null,

              consentAccepted:
                Boolean(
                  finalVerification
                    ?.consentAccepted
                ),

              consentAt:
                finalVerification
                  ?.consentAt ||
                null,

              consentVersion:
                finalVerification
                  ?.consentVersion ||
                null,

              faceDetected:
                finalVerification
                  ?.faceDetected ??
                null,

              faceCount:
                finalVerification
                  ?.faceCount ??
                null,

              faceMatchPassed:
                finalVerification
                  ?.faceMatchPassed ??
                null,

              livenessChecked:
                Boolean(
                  finalVerification
                    ?.livenessChecked
                ),

              livenessPassed:
                finalVerification
                  ?.livenessPassed ??
                null,
            },
          },

          /* =================================================
             USUARIO
          ================================================= */

          user:
            user
              ? {
                  id:
                    user.id,

                  cI:
                    user.cI,

                  email:
                    user.email,

                  firstName:
                    user
                      .firstName,

                  lastName:
                    user
                      .lastName,

                  cellular:
                    user
                      .cellular,

                  grado:
                    user.grado,

                  subsistema:
                    user
                      .subsistema,

                  empresa:
                    user.empresa
                      ? {
                          id:
                            user
                              .empresa
                              .id,

                          nombre:
                            user
                              .empresa
                              .nombreComercial ||
                            user
                              .empresa
                              .razonSocial,
                        }
                      : null,

                  seccion:
                    user
                      .empresaSeccion
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

          /* =================================================
             CURSO
          ================================================= */

          course:
            test.course
              ? {
                  id:
                    test
                      .course
                      .id,

                  nombre:
                    test
                      .course
                      .nombre,

                  sigla:
                    test
                      .course
                      .sigla,

                  objetivo:
                    test
                      .course
                      .objetivo,

                  tipo:
                    test
                      .course
                      .tipo,
                }
              : null,

          /* =================================================
             TEST
          ================================================= */

          test: {
            id:
              test.id,

            nombre:
              test.nombre,

            descripcion:
              test.descripcion,

            instrucciones:
              test.instrucciones,

            duracionMinutos:
              test
                .duracionMinutos,

            permiteContinuar:
              test
                .permiteContinuar,

            preguntasAleatorias:
              test
                .preguntasAleatorias,

            version:
              test.version,

            sections,
          },

          /* =================================================
             PROGRESO
          ================================================= */

          progress: {
            totalQuestions,

            answeredQuestions,

            pendingQuestions:
              Math.max(
                totalQuestions -
                  answeredQuestions,

                0
              ),

            percentage:
              progress,
          },

          /* =================================================
             RESPUESTAS EXISTENTES
          ================================================= */

          savedAnswers,
        }
      );
    }
  );

/* =========================================================
   EXPORTACIONES
========================================================= */

module.exports = {
  validatePsychometricAccess,
};