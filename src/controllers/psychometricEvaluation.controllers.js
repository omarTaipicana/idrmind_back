const sequelize = require("../utils/connection");
const catchError = require("../utils/catchError");
const crypto = require("crypto");


const Inscripcion = require(
    "../models/Inscripcion"
);

const User = require(
    "../models/User"
);

const PsychometricTest = require(
    "../models/PsychometricTest"
);

const Course = require(
    "../models/Course"
);

/*
 * Ajusta la ruta a la misma función de correo
 * que ya usas en registro y usuarios.
 */
const sendEmail = require(
    "../utils/sendEmail"
);

const PsychometricAccessToken = require(
    "../models/PsychometricAccessToken"
);

const {
    calculateCompleteResult,
} = require(
    "../utils/psychometricScoring.service"
);

const PsychometricEvaluation = require(
    "../models/PsychometricEvaluation"
);

const PsychometricQuestion = require(
    "../models/PsychometricQuestion"
);

const PsychometricOption = require(
    "../models/PsychometricOption"
);

const PsychometricSection = require(
    "../models/PsychometricSection"
);

const PsychometricAnswer = require(
    "../models/PsychometricAnswer"
);

const PsychometricAnswerOption = require(
    "../models/PsychometricAnswerOption"
);

/* =========================================================
   VALIDAR QUE LA PREGUNTA PERTENECE AL TEST
========================================================= */

const getQuestionForEvaluation = async ({
    questionId,
    testId,
    transaction,
}) => {
    const question =
        await PsychometricQuestion.findOne({
            where: {
                id: questionId,
                activo: true,
            },

            include: [
                {
                    model: PsychometricSection,
                    as: "section",

                    where: {
                        testId,
                        activo: true,
                    },

                    attributes: [
                        "id",
                        "testId",
                        "codigo",
                        "tipoCalculo",
                    ],
                },
            ],

            transaction,
        });

    return question;
};

/* =========================================================
   VALIDAR OPCIONES DE UNA PREGUNTA
========================================================= */

const validateSelectedOptions = async ({
    question,
    selectedOptions,
    transaction,
}) => {
    if (!Array.isArray(selectedOptions)) {
        return [];
    }

    const optionIds = selectedOptions
        .map((item) => item?.optionId)
        .filter(Boolean);

    if (!optionIds.length) {
        return [];
    }

    const options =
        await PsychometricOption.findAll({
            where: {
                id: optionIds,
                questionId: question.id,
                activo: true,
            },

            transaction,
        });

    if (options.length !== optionIds.length) {
        const error = new Error(
            "Una o más opciones no pertenecen a la pregunta."
        );

        error.statusCode = 400;
        throw error;
    }

    return options;
};

/* =========================================================
   VALIDAR CANTIDAD DE SELECCIONES
========================================================= */

const validateSelectionCount = ({
  question,
  selectedOptions,
}) => {
  /*
   * Las escalas se responden mediante valorNumerico.
   * No deben validar selectedOptions.
   */
  if (
    ![
      "seleccion_unica",
      "seleccion_ponderada",
    ].includes(question.tipoRespuesta)
  ) {
    return;
  }

  const total = Array.isArray(
    selectedOptions
  )
    ? selectedOptions.length
    : 0;

  const minimum = Number(
    question.seleccionesMinimas || 0
  );

  const maximum = Number(
    question.seleccionesMaximas || 0
  );

  if (
    question.obligatoria &&
    minimum > 0 &&
    total < minimum
  ) {
    const error = new Error(
      `La pregunta requiere al menos ${minimum} selección(es).`
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    maximum > 0 &&
    total > maximum
  ) {
    const error = new Error(
      `La pregunta permite máximo ${maximum} selección(es).`
    );

    error.statusCode = 400;
    throw error;
  }
};

/* =========================================================
   CALCULAR PUNTAJE DE OPCIÓN
========================================================= */

const calculateAppliedScore = ({
    question,
    option,
    selectedOption,
}) => {
    /*
     * Para selección ponderada:
     * prioridad 1 = 3 puntos
     * prioridad 2 = 1 punto
     *
     * Los valores pueden venir desde configuración.
     */
    if (
        question.tipoRespuesta ===
        "seleccion_ponderada"
    ) {
        const config =
            question.configuracion || {};

        const firstScore = Number(
            config.puntajePrimeraSeleccion || 3
        );

        const secondScore = Number(
            config.puntajeSegundaSeleccion || 1
        );

        if (
            Number(selectedOption.prioridad) === 1
        ) {
            return firstScore;
        }

        if (
            Number(selectedOption.prioridad) === 2
        ) {
            return secondScore;
        }

        return 0;
    }

    if (
        selectedOption.puntajeAplicado !==
        undefined &&
        selectedOption.puntajeAplicado !== null
    ) {
        return Number(
            selectedOption.puntajeAplicado
        );
    }

    if (
        option.puntaje !== undefined &&
        option.puntaje !== null
    ) {
        return Number(option.puntaje);
    }

    return null;
};

/* =========================================================
   GUARDAR UNA RESPUESTA
========================================================= */

const saveSingleAnswer = async ({
    evaluation,
    answerData,
    transaction,
}) => {
    const {
        questionId,
        valorNumerico = null,
        valorBooleano = null,
        valorTexto = null,
        tiempoSegundos = null,
        metadata = null,
        selectedOptions = [],
    } = answerData;

    if (!questionId) {
        const error = new Error(
            "questionId es requerido."
        );

        error.statusCode = 400;
        throw error;
    }

    const question =
        await getQuestionForEvaluation({
            questionId,
            testId: evaluation.testId,
            transaction,
        });

    if (!question) {
        const error = new Error(
            "La pregunta no pertenece al test de esta evaluación."
        );

        error.statusCode = 400;
        throw error;
    }

    validateSelectionCount({
        question,
        selectedOptions,
    });

    const validOptions =
        await validateSelectedOptions({
            question,
            selectedOptions,
            transaction,
        });

    const isNumericQuestion = [
        "escala_bipolar",
        "escala_1_5",
    ].includes(question.tipoRespuesta);

    if (isNumericQuestion) {
        if (
            valorNumerico === undefined ||
            valorNumerico === null ||
            valorNumerico === ""
        ) {
            const error = new Error(
                "La respuesta numérica es requerida."
            );

            error.statusCode = 400;
            throw error;
        }

        const numericValue =
            Number(valorNumerico);

        if (
            Number.isNaN(numericValue)
        ) {
            const error = new Error(
                "El valor numérico no es válido."
            );

            error.statusCode = 400;
            throw error;
        }

        if (
            question.valorMinimo !== null &&
            numericValue <
            Number(question.valorMinimo)
        ) {
            const error = new Error(
                `El valor mínimo permitido es ${question.valorMinimo}.`
            );

            error.statusCode = 400;
            throw error;
        }

        if (
            question.valorMaximo !== null &&
            numericValue >
            Number(question.valorMaximo)
        ) {
            const error = new Error(
                `El valor máximo permitido es ${question.valorMaximo}.`
            );

            error.statusCode = 400;
            throw error;
        }
    }

    let answer =
        await PsychometricAnswer.findOne({
            where: {
                evaluationId: evaluation.id,
                questionId: question.id,
            },

            transaction,
        });

    if (!answer) {
        answer = await PsychometricAnswer.create(
            {
                evaluationId: evaluation.id,
                questionId: question.id,

                valorNumerico:
                    valorNumerico !== null &&
                        valorNumerico !== ""
                        ? Number(valorNumerico)
                        : null,

                valorBooleano:
                    valorBooleano !== undefined
                        ? valorBooleano
                        : null,

                valorTexto:
                    valorTexto || null,

                tiempoSegundos:
                    tiempoSegundos !== null
                        ? Number(tiempoSegundos)
                        : null,

                metadata:
                    metadata || null,
            },

            {
                transaction,
            }
        );
    } else {
        await answer.update(
            {
                valorNumerico:
                    valorNumerico !== null &&
                        valorNumerico !== ""
                        ? Number(valorNumerico)
                        : null,

                valorBooleano:
                    valorBooleano !== undefined
                        ? valorBooleano
                        : null,

                valorTexto:
                    valorTexto || null,

                tiempoSegundos:
                    tiempoSegundos !== null
                        ? Number(tiempoSegundos)
                        : null,

                metadata:
                    metadata || null,
            },

            {
                transaction,
            }
        );
    }

    /*
     * Reemplazamos las opciones anteriores.
     */
    await PsychometricAnswerOption.destroy({
        where: {
            answerId: answer.id,
        },

        transaction,
    });

    let calculatedScore = 0;
    let hasCalculatedScore = false;

    for (
        const selectedOption of selectedOptions
    ) {
        const option = validOptions.find(
            (item) =>
                String(item.id) ===
                String(selectedOption.optionId)
        );

        if (!option) continue;

        const appliedScore =
            calculateAppliedScore({
                question,
                option,
                selectedOption,
            });

        if (appliedScore !== null) {
            calculatedScore +=
                Number(appliedScore);

            hasCalculatedScore = true;
        }

        await PsychometricAnswerOption.create(
            {
                answerId: answer.id,
                optionId: option.id,

                prioridad:
                    selectedOption.prioridad !==
                        undefined
                        ? Number(
                            selectedOption.prioridad
                        )
                        : null,

                puntajeAplicado:
                    appliedScore,

                categoriaResultado:
                    option.categoriaResultado ||
                    null,

                metadata:
                    selectedOption.metadata ||
                    option.metadata ||
                    null,
            },

            {
                transaction,
            }
        );
    }

    await answer.update(
        {
            puntajeCalculado:
                hasCalculatedScore
                    ? calculatedScore
                    : null,
        },

        {
            transaction,
        }
    );

    return answer;
};


const hashAccessToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(String(token || "").trim())
        .digest("hex");
};

const getEvaluationByToken = async (
    token,
    options = {}
) => {
    if (!token || !String(token).trim()) {
        const error = new Error(
            "El código de acceso es requerido."
        );

        error.statusCode = 400;
        throw error;
    }

    const tokenHash = hashAccessToken(token);

    const access =
        await PsychometricAccessToken.findOne({
            where: {
                tokenHash,
                activo: true,
            },

            include: [
                {
                    model: PsychometricEvaluation,
                    as: "evaluation",
                    ...options,
                },
            ],
        });

    if (!access) {
        const error = new Error(
            "El enlace del test no es válido o ya no está activo."
        );

        error.statusCode = 404;
        throw error;
    }

    if (
        access.revokedAt ||
        new Date(access.expiresAt).getTime() <
        Date.now()
    ) {
        const error = new Error(
            "El enlace del test ha expirado."
        );

        error.statusCode = 410;
        throw error;
    }

    if (!access.evaluation) {
        const error = new Error(
            "No se encontró la evaluación asociada."
        );

        error.statusCode = 404;
        throw error;
    }

    return {
        access,
        evaluation: access.evaluation,
    };
};

/* =========================================================
   PUT /psychometric/evaluations/:id/answers
========================================================= */

const saveAnswers = catchError(
    async (req, res) => {
        const { token } = req.params;
        const answers = Array.isArray(
            req.body
        )
            ? req.body
            : req.body.answers;

        if (!Array.isArray(answers)) {
            return res.status(400).json({
                message:
                    "Debe enviar un arreglo de respuestas.",
            });
        }

        if (!answers.length) {
            return res.status(400).json({
                message:
                    "No se enviaron respuestas para guardar.",
            });
        }

        let evaluation;

        try {
            const result =
                await getEvaluationByToken(token);

            evaluation = result.evaluation;
        } catch (error) {
            return res
                .status(error.statusCode || 500)
                .json({
                    message: error.message,
                });
        }

        if (!evaluation) {
            return res.status(404).json({
                message:
                    "La evaluación no existe.",
            });
        }

        if (
            evaluation.estado === "completada"
        ) {
            return res.status(409).json({
                message:
                    "La evaluación ya fue completada y no permite cambios.",
            });
        }

        if (
            evaluation.estado === "anulada"
        ) {
            return res.status(409).json({
                message:
                    "La evaluación fue anulada.",
            });
        }

        if (
            ![
                "habilitada",
                "pago_validado",
                "en_progreso",
            ].includes(evaluation.estado)
        ) {
            return res.status(409).json({
                message:
                    "La evaluación no está habilitada para recibir respuestas.",
            });
        }

        const transaction =
            await sequelize.transaction();

        try {
            const saved = [];

            for (const answerData of answers) {
                const answer =
                    await saveSingleAnswer({
                        evaluation,
                        answerData,
                        transaction,
                    });

                saved.push(answer);
            }

            let fechaInicioFinal =
                evaluation.fechaInicio;

            if (
                evaluation.estado !==
                "en_progreso"
            ) {
                fechaInicioFinal =
                    evaluation.fechaInicio ||
                    new Date();

                await evaluation.update(
                    {
                        estado: "en_progreso",
                        fechaInicio:
                            fechaInicioFinal,
                    },
                    {
                        transaction,
                    }
                );
            }

            await transaction.commit();

            const totalSaved =
                await PsychometricAnswer.count({
                    where: {
                        evaluationId:
                            evaluation.id,
                    },
                });

            return res.json({
                message:
                    "Respuestas guardadas correctamente.",

                evaluation: {
                    id: evaluation.id,
                    estado: "en_progreso",
                    fechaInicio:
                        fechaInicioFinal,
                },

                savedInRequest:
                    saved.length,

                totalSaved,
            });
        } catch (error) {
            await transaction.rollback();

            if (error.statusCode) {
                return res
                    .status(error.statusCode)
                    .json({
                        message: error.message,
                    });
            }

            throw error;
        }
    }
);


/* =========================================================
   ENVIAR CORREO DE FINALIZACIÓN
========================================================= */

const sendPsychometricCompletionEmail =
    async ({
        user,
        course,
        evaluation,
    }) => {
        const paymentUrl =
            process.env.PSYCHOMETRIC_PAYMENT_URL ||
            "https://idrmind.com/#/pago-test";

        await sendEmail({
            to: user.email,

            subject:
                "Has completado tu Test Psicotécnico - iDr.Mind",

            html: `
        <div style="
          margin:0;
          padding:30px 15px;
          background:#f1f5f9;
          font-family:Arial,sans-serif;
          color:#101828;
        ">
          <div style="
            max-width:640px;
            margin:0 auto;
            background:#ffffff;
            border-radius:18px;
            overflow:hidden;
            box-shadow:0 18px 45px rgba(7,27,63,.16);
          ">
            <div style="
              padding:28px;
              text-align:center;
              background:linear-gradient(
                135deg,
                #071b3f,
                #173a8a
              );
            ">
              <img
                src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1760413741/1_qvykyo.png"
                alt="iDr.Mind"
                style="
                  width:165px;
                  max-width:100%;
                "
              />
            </div>

            <div style="padding:34px;">
              <h1 style="
                margin:0 0 18px;
                color:#071b3f;
                font-size:27px;
              ">
                ¡Felicidades,
                ${user.firstName || ""}!
              </h1>

              <p style="
                font-size:16px;
                line-height:1.7;
                color:#475467;
              ">
                Has completado correctamente
                <strong>${course.nombre}</strong>.
              </p>

              <div style="
                margin:25px 0;
                padding:18px;
                border-radius:12px;
                background:#eef6ff;
                border-left:5px solid #28a7e8;
              ">
                <p style="
                  margin:0;
                  color:#344054;
                  line-height:1.6;
                ">
                  Evaluación número:
                  <strong>
                    ${evaluation.numeroEvaluacion}
                  </strong>
                </p>

                <p style="
                  margin:6px 0 0;
                  color:#344054;
                  line-height:1.6;
                ">
                  Estado:
                  <strong>Completada</strong>
                </p>
              </div>

              <p style="
                font-size:16px;
                line-height:1.7;
                color:#475467;
              ">
                Para continuar con el proceso y
                habilitar tu informe de resultados,
                debes completar el pago correspondiente.
              </p>

              <div style="
                text-align:center;
                margin:30px 0;
              ">
                <a
                  href="${paymentUrl}"
                  style="
                    display:inline-block;
                    padding:15px 30px;
                    border-radius:12px;
                    background:linear-gradient(
                      135deg,
                      #173a8a,
                      #071b3f
                    );
                    color:#ffffff;
                    text-decoration:none;
                    font-size:16px;
                    font-weight:bold;
                  "
                >
                  Ver información de pago
                </a>
              </div>

              <p style="
                font-size:14px;
                color:#667085;
                line-height:1.6;
              ">
                Una vez validado el pago, tu resultado
                será habilitado por iDr.Mind.
              </p>
            </div>

            <div style="
              padding:18px;
              background:#f8fafc;
              text-align:center;
              color:#98a2b3;
              font-size:12px;
            ">
              © ${new Date().getFullYear()}
              iDr.Mind. Todos los derechos reservados.
            </div>
          </div>
        </div>
      `,
        });
    };

/* =========================================================
   FINALIZAR
   Se completará en el siguiente paso con los cálculos.
========================================================= */

/* =========================================================
   FINALIZAR EVALUACIÓN
========================================================= */

const finishEvaluation = catchError(
    async (req, res) => {
        const { token } = req.params;

        let access;
        let evaluation;

        try {
            const result =
                await getEvaluationByToken(token, {
                    include: [
                        {
                            model: Inscripcion,
                            as: "inscripcion",

                            include: [
                                {
                                    model: User,
                                    as: "user",
                                },
                            ],
                        },

                        {
                            model: PsychometricTest,
                            as: "test",

                            include: [
                                {
                                    model: Course,
                                    as: "course",
                                },
                            ],
                        },
                    ],
                });

            access = result.access;
            evaluation = result.evaluation;
        } catch (error) {
            return res
                .status(error.statusCode || 500)
                .json({
                    message: error.message,
                });
        }

        if (
            evaluation.estado === "completada"
        ) {
            return res.status(409).json({
                message:
                    "La evaluación ya fue completada.",

                evaluation: {
                    id: evaluation.id,
                    estado: evaluation.estado,
                    fechaFinalizacion:
                        evaluation.fechaFinalizacion,
                    personalityId:
                        evaluation.personalityId,
                    resultadoLiberado:
                        evaluation.resultadoLiberado,
                },
            });
        }

        if (
            evaluation.estado === "anulada"
        ) {
            return res.status(409).json({
                message:
                    "La evaluación fue anulada.",
            });
        }

        if (
            ![
                "habilitada",
                "pago_validado",
                "en_progreso",
            ].includes(evaluation.estado)
        ) {
            return res.status(409).json({
                message:
                    "La evaluación no está habilitada para finalizarse.",
            });
        }

        const transaction =
            await sequelize.transaction();

        let scoring;
        let now;

        try {
            scoring =
                await calculateCompleteResult({
                    evaluationId: evaluation.id,
                    transaction,
                });

            if (!scoring.personalityId) {
                const error = new Error(
                    "No se pudo determinar una personalidad para el resultado obtenido."
                );

                error.statusCode = 422;

                error.details = {
                    animal:
                        scoring.result?.animodo
                            ?.animal,

                    colorCabeza:
                        scoring.result?.brain
                            ?.headColor,

                    colorPecho:
                        scoring.result
                            ?.communication
                            ?.dominantColor,
                };

                throw error;
            }

            now = new Date();

            await evaluation.update(
                {
                    estado: "completada",

                    fechaFinalizacion: now,

                    puntajeTotal:
                        scoring.totalScore,

                    resultado:
                        scoring.result,

                    personalityId:
                        scoring.personalityId,

                    resultadoLiberado: false,
                },
                {
                    transaction,
                }
            );

            /*
             * Invalida el token usado para rendir
             * esta evaluación.
             */
            await access.update(
                {
                    activo: false,
                    revokedAt: now,
                },
                {
                    transaction,
                }
            );

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();

            if (error.statusCode) {
                return res
                    .status(error.statusCode)
                    .json({
                        message: error.message,
                        details:
                            error.details || null,
                    });
            }

            throw error;
        }

        /*
         * Enviar correo después de confirmar
         * los cambios en la base.
         */
        let emailSent = true;

        try {
            const user =
                evaluation.inscripcion?.user;

            const course =
                evaluation.test?.course;

            if (user?.email && course) {
                await sendPsychometricCompletionEmail({
                    user,
                    course,
                    evaluation,
                });
            } else {
                emailSent = false;

                console.error(
                    "No se encontraron usuario o curso para enviar el correo."
                );
            }
        } catch (emailError) {
            emailSent = false;

            console.error(
                "No se pudo enviar el correo de finalización:",
                emailError
            );
        }

        return res.json({
            message: emailSent
                ? "Test finalizado correctamente. Se envió la información de pago al correo."
                : "Test finalizado correctamente, pero no se pudo enviar el correo de culminación.",

            emailSent,

            evaluation: {
                id: evaluation.id,

                numeroEvaluacion:
                    evaluation.numeroEvaluacion,

                estado: "completada",

                fechaFinalizacion: now,

                puntajeTotal:
                    scoring.totalScore,

                personalityId:
                    scoring.personalityId,

                resultadoLiberado: false,
            },

            /*
             * No se entrega el resultado completo
             * hasta que el pago sea validado.
             */
            result: {
                completed: true,
                paymentRequired: true,
            },

            paymentRequired: true,
        });
    }
);


module.exports = {
    saveAnswers,
    finishEvaluation,
};