const sequelize = require("../utils/connection");
const catchError = require("../utils/catchError");
const crypto = require("crypto");

/* =========================================================
   SERVICIO / FUNCIÓN PARA TOKEN DE PAGO
========================================================= */

const {
    createPsychometricPaymentAccess,
} = require(
    "./pagos.controllers"
);

/* =========================================================
   MODELOS
========================================================= */

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

const PsychometricAccessToken = require(
    "../models/PsychometricAccessToken"
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
   UTILS
========================================================= */

const sendEmail = require(
    "../utils/sendEmail"
);

const {
    calculateCompleteResult,
} = require(
    "../utils/psychometricScoring.service"
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
        .map(
            (item) =>
                item?.optionId
        )
        .filter(Boolean);

    if (!optionIds.length) {
        return [];
    }

    const options =
        await PsychometricOption.findAll({
            where: {
                id: optionIds,
                questionId:
                    question.id,
                activo: true,
            },

            transaction,
        });

    if (
        options.length !==
        optionIds.length
    ) {
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
     * Las preguntas de escala utilizan
     * valorNumerico y NO selectedOptions.
     */
    if (
        ![
            "seleccion_unica",
            "seleccion_ponderada",
        ].includes(
            question.tipoRespuesta
        )
    ) {
        return;
    }

    const total = Array.isArray(
        selectedOptions
    )
        ? selectedOptions.length
        : 0;

    const minimum = Number(
        question.seleccionesMinimas ||
        0
    );

    const maximum = Number(
        question.seleccionesMaximas ||
        0
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
     * En selección ponderada:
     *
     * prioridad 1 = 3 puntos
     * prioridad 2 = 1 punto
     *
     * Los valores pueden venir de configuracion.
     */

    if (
        question.tipoRespuesta ===
        "seleccion_ponderada"
    ) {
        const config =
            question.configuracion ||
            {};

        const firstScore = Number(
            config
                .puntajePrimeraSeleccion ||
            3
        );

        const secondScore = Number(
            config
                .puntajeSegundaSeleccion ||
            1
        );

        if (
            Number(
                selectedOption.prioridad
            ) === 1
        ) {
            return firstScore;
        }

        if (
            Number(
                selectedOption.prioridad
            ) === 2
        ) {
            return secondScore;
        }

        return 0;
    }

    if (
        selectedOption
            .puntajeAplicado !==
        undefined &&
        selectedOption
            .puntajeAplicado !==
        null
    ) {
        return Number(
            selectedOption
                .puntajeAplicado
        );
    }

    if (
        option.puntaje !==
        undefined &&
        option.puntaje !== null
    ) {
        return Number(
            option.puntaje
        );
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

    /* =========================================
       VALIDAR ID DE PREGUNTA
    ========================================= */

    if (!questionId) {
        const error = new Error(
            "questionId es requerido."
        );

        error.statusCode = 400;

        throw error;
    }

    /* =========================================
       BUSCAR PREGUNTA
    ========================================= */

    const question =
        await getQuestionForEvaluation({
            questionId,

            testId:
                evaluation.testId,

            transaction,
        });

    if (!question) {
        const error = new Error(
            "La pregunta no pertenece al test de esta evaluación."
        );

        error.statusCode = 400;

        throw error;
    }

    /* =========================================
       VALIDAR SELECCIONES
    ========================================= */

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

    /* =========================================
       VALIDAR PREGUNTAS NUMÉRICAS
    ========================================= */

    const isNumericQuestion = [
        "escala_bipolar",
        "escala_1_5",
    ].includes(
        question.tipoRespuesta
    );

    if (isNumericQuestion) {
        if (
            valorNumerico ===
            undefined ||
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
            Number.isNaN(
                numericValue
            )
        ) {
            const error = new Error(
                "El valor numérico no es válido."
            );

            error.statusCode = 400;

            throw error;
        }

        if (
            question.valorMinimo !==
            null &&
            numericValue <
            Number(
                question.valorMinimo
            )
        ) {
            const error = new Error(
                `El valor mínimo permitido es ${question.valorMinimo}.`
            );

            error.statusCode = 400;

            throw error;
        }

        if (
            question.valorMaximo !==
            null &&
            numericValue >
            Number(
                question.valorMaximo
            )
        ) {
            const error = new Error(
                `El valor máximo permitido es ${question.valorMaximo}.`
            );

            error.statusCode = 400;

            throw error;
        }
    }

    /* =========================================
       BUSCAR RESPUESTA EXISTENTE
    ========================================= */

    let answer =
        await PsychometricAnswer.findOne({
            where: {
                evaluationId:
                    evaluation.id,

                questionId:
                    question.id,
            },

            transaction,
        });

    /* =========================================
       CREAR RESPUESTA
    ========================================= */

    if (!answer) {
        answer =
            await PsychometricAnswer.create(
                {
                    evaluationId:
                        evaluation.id,

                    questionId:
                        question.id,

                    valorNumerico:
                        valorNumerico !==
                            null &&
                            valorNumerico !==
                            ""
                            ? Number(
                                valorNumerico
                            )
                            : null,

                    valorBooleano:
                        valorBooleano !==
                            undefined
                            ? valorBooleano
                            : null,

                    valorTexto:
                        valorTexto ||
                        null,

                    tiempoSegundos:
                        tiempoSegundos !==
                            null
                            ? Number(
                                tiempoSegundos
                            )
                            : null,

                    metadata:
                        metadata ||
                        null,
                },

                {
                    transaction,
                }
            );
    } else {
        /* =========================================
           ACTUALIZAR RESPUESTA
        ========================================= */

        await answer.update(
            {
                valorNumerico:
                    valorNumerico !==
                        null &&
                        valorNumerico !==
                        ""
                        ? Number(
                            valorNumerico
                        )
                        : null,

                valorBooleano:
                    valorBooleano !==
                        undefined
                        ? valorBooleano
                        : null,

                valorTexto:
                    valorTexto ||
                    null,

                tiempoSegundos:
                    tiempoSegundos !==
                        null
                        ? Number(
                            tiempoSegundos
                        )
                        : null,

                metadata:
                    metadata ||
                    null,
            },

            {
                transaction,
            }
        );
    }

    /* =========================================
       ELIMINAR OPCIONES ANTERIORES
    ========================================= */

    await PsychometricAnswerOption.destroy({
        where: {
            answerId:
                answer.id,
        },

        transaction,
    });

    /* =========================================
       CREAR OPCIONES NUEVAS
    ========================================= */

    let calculatedScore = 0;

    let hasCalculatedScore =
        false;

    for (
        const selectedOption
        of selectedOptions
    ) {
        const option =
            validOptions.find(
                (item) =>
                    String(
                        item.id
                    ) ===
                    String(
                        selectedOption
                            .optionId
                    )
            );

        if (!option) {
            continue;
        }

        const appliedScore =
            calculateAppliedScore({
                question,
                option,
                selectedOption,
            });

        if (
            appliedScore !== null
        ) {
            calculatedScore +=
                Number(
                    appliedScore
                );

            hasCalculatedScore =
                true;
        }

        await PsychometricAnswerOption.create(
            {
                answerId:
                    answer.id,

                optionId:
                    option.id,

                prioridad:
                    selectedOption
                        .prioridad !==
                        undefined
                        ? Number(
                            selectedOption
                                .prioridad
                        )
                        : null,

                puntajeAplicado:
                    appliedScore,

                categoriaResultado:
                    option
                        .categoriaResultado ||
                    null,

                metadata:
                    selectedOption
                        .metadata ||
                    option.metadata ||
                    null,
            },

            {
                transaction,
            }
        );
    }

    /* =========================================
       GUARDAR PUNTAJE DE RESPUESTA
    ========================================= */

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

/* =========================================================
   HASH DEL TOKEN
========================================================= */

const hashAccessToken = (
    token
) => {
    return crypto
        .createHash("sha256")
        .update(
            String(
                token || ""
            ).trim()
        )
        .digest("hex");
};

/* =========================================================
   BUSCAR EVALUACIÓN MEDIANTE TOKEN
========================================================= */

const getEvaluationByToken = async (
    token,
    options = {}
) => {
    if (
        !token ||
        !String(token).trim()
    ) {
        const error = new Error(
            "El código de acceso es requerido."
        );

        error.statusCode = 400;

        throw error;
    }

    const tokenHash =
        hashAccessToken(token);

    const access =
        await PsychometricAccessToken.findOne({
            where: {
                tokenHash,
                activo: true,

                /*
                 * IMPORTANTE:
                 * este controlador solamente
                 * acepta tokens para rendir
                 * la evaluación.
                 */
                purpose: "test",
            },

            include: [
                {
                    model:
                        PsychometricEvaluation,

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

    /* =========================================
       VALIDAR EXPIRACIÓN
    ========================================= */

    if (
        access.revokedAt ||
        new Date(
            access.expiresAt
        ).getTime() <
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

        evaluation:
            access.evaluation,
    };
};

/* =========================================================
   GUARDAR RESPUESTAS
   PUT /psychometric/access/:token/answers
========================================================= */

const saveAnswers = catchError(
    async (req, res) => {
        const { token } =
            req.params;

        const answers =
            Array.isArray(
                req.body
            )
                ? req.body
                : req.body.answers;

        /* =========================================
           VALIDAR BODY
        ========================================= */

        if (
            !Array.isArray(
                answers
            )
        ) {
            return res
                .status(400)
                .json({
                    message:
                        "Debe enviar un arreglo de respuestas.",
                });
        }

        if (!answers.length) {
            return res
                .status(400)
                .json({
                    message:
                        "No se enviaron respuestas para guardar.",
                });
        }

        /* =========================================
           OBTENER EVALUACIÓN
        ========================================= */

        let evaluation;

        try {
            const result =
                await getEvaluationByToken(
                    token
                );

            evaluation =
                result.evaluation;
        } catch (error) {
            return res
                .status(
                    error.statusCode ||
                    500
                )
                .json({
                    message:
                        error.message,
                });
        }

        if (!evaluation) {
            return res
                .status(404)
                .json({
                    message:
                        "La evaluación no existe.",
                });
        }

        /* =========================================
           VALIDAR ESTADO
        ========================================= */

        if (
            evaluation.estado ===
            "completada"
        ) {
            return res
                .status(409)
                .json({
                    message:
                        "La evaluación ya fue completada y no permite cambios.",
                });
        }

        if (
            evaluation.estado ===
            "anulada"
        ) {
            return res
                .status(409)
                .json({
                    message:
                        "La evaluación fue anulada.",
                });
        }

        if (
            ![
                "habilitada",
                "pago_validado",
                "en_progreso",
            ].includes(
                evaluation.estado
            )
        ) {
            return res
                .status(409)
                .json({
                    message:
                        "La evaluación no está habilitada para recibir respuestas.",
                });
        }

        /* =========================================
           TRANSACCIÓN
        ========================================= */

        const transaction =
            await sequelize.transaction();

        try {
            const saved = [];

            for (
                const answerData
                of answers
            ) {
                const answer =
                    await saveSingleAnswer({
                        evaluation,
                        answerData,
                        transaction,
                    });

                saved.push(
                    answer
                );
            }

            let fechaInicioFinal =
                evaluation.fechaInicio;

            /* =====================================
               MARCAR EN PROGRESO
            ===================================== */

            if (
                evaluation.estado !==
                "en_progreso"
            ) {
                fechaInicioFinal =
                    evaluation.fechaInicio ||
                    new Date();

                await evaluation.update(
                    {
                        estado:
                            "en_progreso",

                        fechaInicio:
                            fechaInicioFinal,
                    },

                    {
                        transaction,
                    }
                );
            }

            await transaction.commit();

            /* =====================================
               CONTAR RESPUESTAS
            ===================================== */

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
                    id:
                        evaluation.id,

                    estado:
                        "en_progreso",

                    fechaInicio:
                        fechaInicioFinal,
                },

                savedInRequest:
                    saved.length,

                totalSaved,
            });
        } catch (error) {
            await transaction.rollback();

            if (
                error.statusCode
            ) {
                return res
                    .status(
                        error.statusCode
                    )
                    .json({
                        message:
                            error.message,

                        details:
                            error.details ||
                            null,
                    });
            }

            throw error;
        }
    }
);

/* =========================================================
   ENVIAR CORREO DE FINALIZACIÓN
   CON TOKEN PERSONAL DE PAGO
========================================================= */

/* =========================================================
   ENVIAR CORREO DE FINALIZACIÓN
   CON TOKEN PERSONAL DE PAGO
========================================================= */

const sendPsychometricCompletionEmail =
    async ({
        user,
        course,
        evaluation,

        paymentToken,
        paymentExpiresAt,
    }) => {
        /* =========================================
           1. URL BASE DEL FRONTEND PARA PAGO
        ========================================= */

        /*
         * Desarrollo:
         * PSYCHOMETRIC_PAYMENT_URL=http://localhost:5173/#/pago-test
         *
         * Producción:
         * PSYCHOMETRIC_PAYMENT_URL=https://idrmind.com/#/pago-test
         *
         * replace(/\/+$/, "")
         * evita que una "/" al final genere:
         * .../pago-test//TOKEN
         */

        const paymentBaseUrl =
            (
                process.env
                    .PSYCHOMETRIC_PAYMENT_URL ||
                "https://idrmind.com/#/pago-test"
            ).replace(/\/+$/, "");

        /* =========================================
           2. VALIDAR TOKEN
        ========================================= */

        if (
            !paymentToken ||
            !String(
                paymentToken
            ).trim()
        ) {
            throw new Error(
                "No se recibió un token válido para generar el enlace de pago."
            );
        }

        const cleanPaymentToken =
            String(
                paymentToken
            ).trim();

        /* =========================================
           3. URL PERSONAL DE PAGO
        ========================================= */

        const paymentUrl =
            `${paymentBaseUrl}/${cleanPaymentToken}`;

        /* =========================================
           4. LOGS TEMPORALES DE VERIFICACIÓN
        ========================================= */

        console.log(
            "=============================================="
        );

        console.log(
            "🔗 GENERANDO URL DE PAGO PSICOMÉTRICO"
        );

        console.log(
            "PSYCHOMETRIC_PAYMENT_URL ENV:",
            process.env
                .PSYCHOMETRIC_PAYMENT_URL
        );

        console.log(
            "paymentBaseUrl:",
            paymentBaseUrl
        );

        console.log(
            "paymentToken:",
            cleanPaymentToken
        );

        console.log(
            "URL FINAL DE PAGO:",
            paymentUrl
        );

        console.log(
            "=============================================="
        );

        /* =========================================
           5. EXPIRACIÓN
        ========================================= */

        const expirationText =
            paymentExpiresAt
                ? new Date(
                    paymentExpiresAt
                ).toLocaleString(
                    "es-EC",
                    {
                        timeZone:
                            "America/Guayaquil",

                        dateStyle:
                            "long",

                        timeStyle:
                            "short",
                    }
                )
                : null;

        /* =========================================
           6. CORREO
        ========================================= */

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
            box-shadow:
              0 18px 45px
              rgba(7,27,63,.16);
          ">

            <!-- =========================
                 HEADER
            ========================== -->

            <div style="
              padding:28px;
              text-align:center;
              background:
                linear-gradient(
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

            <!-- =========================
                 CONTENIDO
            ========================== -->

            <div style="
              padding:34px;
            ">

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
                <strong>
                  ${course.nombre}
                </strong>.
              </p>

              <!-- =========================
                   EVALUACIÓN
              ========================== -->

              <div style="
                margin:25px 0;
                padding:18px;
                border-radius:12px;
                background:#eef6ff;
                border-left:
                  5px solid #28a7e8;
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
                  <strong>
                    Completada
                  </strong>
                </p>

              </div>

              <p style="
                font-size:16px;
                line-height:1.7;
                color:#475467;
              ">
                Para continuar con el proceso
                y habilitar tu informe de
                resultados debes registrar
                el pago correspondiente.
              </p>

              <!-- =========================
                   SEGURIDAD DEL ENLACE
              ========================== -->

              <div style="
                margin:24px 0;
                padding:16px;
                border-radius:12px;
                background:#f8fafc;
                border:
                  1px solid #e4e7ec;
              ">

                <p style="
                  margin:0;
                  color:#475467;
                  font-size:14px;
                  line-height:1.65;
                ">
                  Este enlace es
                  <strong>
                    personal
                  </strong>
                  y está asociado exclusivamente
                  a tu evaluación.

                  ${expirationText
                    ? `
                          <br/><br/>

                          Disponible hasta:
                          <strong>
                            ${expirationText}
                          </strong>
                        `
                    : ""
                }
                </p>

              </div>

              <!-- =========================
                   BOTÓN DE PAGO
              ========================== -->

              <div style="
                text-align:center;
                margin:30px 0;
              ">

                <a
                  href="${paymentUrl}"
                  target="_blank"
                  rel="noopener"
                  style="
                    display:inline-block;
                    padding:15px 30px;
                    border-radius:12px;

                    background:
                      linear-gradient(
                        135deg,
                        #173a8a,
                        #071b3f
                      );

                    color:#ffffff;

                    text-decoration:none;

                    font-size:16px;
                    font-weight:bold;

                    box-shadow:
                      0 8px 20px
                      rgba(23,58,138,.25);
                  "
                >
                  Registrar mi pago
                </a>

              </div>

              <!-- =========================
                   URL ALTERNATIVA
              ========================== -->

              <div style="
                margin:20px 0;
                padding:14px;
                border-radius:10px;
                background:#f8fafc;
                border:1px solid #e4e7ec;
              ">

                <p style="
                  margin:0 0 8px;
                  color:#667085;
                  font-size:13px;
                  line-height:1.5;
                ">
                  Si el botón no funciona,
                  copia y pega este enlace
                  en tu navegador:
                </p>

                <p style="
                  margin:0;
                  word-break:break-all;
                  color:#173a8a;
                  font-size:12px;
                  line-height:1.5;
                ">
                  ${paymentUrl}
                </p>

              </div>

              <p style="
                font-size:14px;
                color:#667085;
                line-height:1.6;
              ">
                No necesitarás ingresar nuevamente
                tu cédula, correo ni datos de
                inscripción. El enlace ya identifica
                esta evaluación.
              </p>

              <p style="
                font-size:14px;
                color:#667085;
                line-height:1.6;
              ">
                Una vez validado el pago,
                recibirás otro correo con el
                acceso a tu informe de resultados.
              </p>

            </div>

            <!-- =========================
                 FOOTER
            ========================== -->

            <div style="
              padding:18px;
              background:#f8fafc;
              text-align:center;
              color:#98a2b3;
              font-size:12px;
            ">

              © ${new Date().getFullYear()}
              iDr.Mind.
              Todos los derechos reservados.

            </div>

          </div>
        </div>
      `,
        });

        /* =========================================
           7. CONFIRMACIÓN
        ========================================= */

        console.log(
            `✅ Correo de pago psicométrico enviado a ${user.email}`
        );

        console.log(
            "🔗 URL enviada:",
            paymentUrl
        );

        return paymentUrl;
    };

/* =========================================================
   FINALIZAR EVALUACIÓN
   POST /psychometric/access/:token/finish
========================================================= */

const finishEvaluation = catchError(
    async (req, res) => {
        const { token } =
            req.params;

        let access;
        let evaluation;

        /* =========================================
           1. OBTENER EVALUACIÓN POR TOKEN
        ========================================= */

        try {
            const result =
                await getEvaluationByToken(
                    token,
                    {
                        include: [
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
                                    },
                                ],
                            },

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
                                ],
                            },
                        ],
                    }
                );

            access =
                result.access;

            evaluation =
                result.evaluation;
        } catch (error) {
            return res
                .status(
                    error.statusCode ||
                    500
                )
                .json({
                    message:
                        error.message,
                });
        }

        /* =========================================
           2. VALIDAR EVALUACIÓN
        ========================================= */

        if (
            evaluation.estado ===
            "completada"
        ) {
            return res
                .status(409)
                .json({
                    message:
                        "La evaluación ya fue completada.",

                    evaluation: {
                        id:
                            evaluation.id,

                        estado:
                            evaluation.estado,

                        fechaFinalizacion:
                            evaluation
                                .fechaFinalizacion,

                        personalityId:
                            evaluation
                                .personalityId,

                        resultadoLiberado:
                            evaluation
                                .resultadoLiberado,
                    },
                });
        }

        if (
            evaluation.estado ===
            "anulada"
        ) {
            return res
                .status(409)
                .json({
                    message:
                        "La evaluación fue anulada.",
                });
        }

        if (
            ![
                "habilitada",
                "pago_validado",
                "en_progreso",
            ].includes(
                evaluation.estado
            )
        ) {
            return res
                .status(409)
                .json({
                    message:
                        "La evaluación no está habilitada para finalizarse.",
                });
        }

        /* =========================================
           3. TRANSACCIÓN
        ========================================= */

        const transaction =
            await sequelize.transaction();

        let scoring;

        let now;

        try {
            /* =====================================
               4. CALCULAR RESULTADO
            ===================================== */

            scoring =
                await calculateCompleteResult({
                    evaluationId:
                        evaluation.id,

                    transaction,
                });

            if (
                !scoring.personalityId
            ) {
                const error =
                    new Error(
                        "No se pudo determinar una personalidad para el resultado obtenido."
                    );

                error.statusCode =
                    422;

                error.details = {
                    animal:
                        scoring.result
                            ?.animodo
                            ?.animal,

                    colorCabeza:
                        scoring.result
                            ?.brain
                            ?.headColor,

                    colorPecho:
                        scoring.result
                            ?.communication
                            ?.dominantColor,
                };

                throw error;
            }

            now = new Date();

            /* =====================================
               5. COMPLETAR EVALUACIÓN
            ===================================== */

            await evaluation.update(
                {
                    estado:
                        "completada",

                    fechaFinalizacion:
                        now,

                    puntajeTotal:
                        scoring.totalScore,

                    resultado:
                        scoring.result,

                    personalityId:
                        scoring
                            .personalityId,

                    /*
                     * El resultado permanece
                     * bloqueado hasta validar pago.
                     */
                    resultadoLiberado:
                        false,
                },

                {
                    transaction,
                }
            );

            /* =====================================
               6. INVALIDAR TOKEN DEL TEST
            ===================================== */

            await access.update(
                {
                    activo: false,

                    revokedAt:
                        now,
                },

                {
                    transaction,
                }
            );

            /* =====================================
               7. CONFIRMAR TRANSACCIÓN
            ===================================== */

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();

            console.error(
                "Error finalizando evaluación:",
                error
            );

            if (
                error.statusCode
            ) {
                return res
                    .status(
                        error.statusCode
                    )
                    .json({
                        message:
                            error.message,

                        details:
                            error.details ||
                            null,
                    });
            }

            throw error;
        }

        /* =================================================
           8. CREAR TOKEN DE PAGO

           Se realiza DESPUÉS del commit de la evaluación.
           Así nunca generamos enlace de pago para una
           evaluación que realmente no terminó.
        ================================================= */

        let paymentAccess = null;

        try {
            paymentAccess =
                await createPsychometricPaymentAccess(
                    evaluation.id
                );

            console.log(
                `✅ Token de pago creado para evaluación ${evaluation.id}`
            );
        } catch (
        paymentTokenError
        ) {
            console.error(
                "❌ No se pudo crear el enlace de pago psicométrico:",
                paymentTokenError
            );
        }

        /* =================================================
           9. ENVIAR CORREO DE FINALIZACIÓN
        ================================================= */

        let emailSent = true;

        try {
            const user =
                evaluation
                    .inscripcion
                    ?.user;

            const course =
                evaluation
                    .test
                    ?.course;

            if (
                !user?.email ||
                !course ||
                !paymentAccess?.token
            ) {
                emailSent = false;

                console.error(
                    "No fue posible enviar el correo de pago.",
                    {
                        hasUser:
                            Boolean(
                                user
                            ),

                        hasEmail:
                            Boolean(
                                user
                                    ?.email
                            ),

                        hasCourse:
                            Boolean(
                                course
                            ),

                        hasPaymentToken:
                            Boolean(
                                paymentAccess
                                    ?.token
                            ),
                    }
                );
            } else {
                await sendPsychometricCompletionEmail({
                    user,
                    course,
                    evaluation,

                    paymentToken:
                        paymentAccess.token,

                    paymentExpiresAt:
                        paymentAccess
                            .expiresAt,
                });

                console.log(
                    `✅ Correo de pago enviado a ${user.email}`
                );
            }
        } catch (
        emailError
        ) {
            emailSent = false;

            console.error(
                "❌ No se pudo enviar el correo de finalización:",
                emailError
            );
        }

        /* =================================================
           10. RESPUESTA AL FRONTEND
        ================================================= */

        return res.json({
            message:
                emailSent
                    ? "Test finalizado correctamente. Se envió el enlace de pago al correo."
                    : paymentAccess?.token
                        ? "Test finalizado correctamente. Se creó el enlace de pago, pero no se pudo enviar el correo."
                        : "Test finalizado correctamente, pero no se pudo generar el enlace de pago.",

            emailSent,

            paymentAccessCreated:
                Boolean(
                    paymentAccess
                        ?.token
                ),

            evaluation: {
                id:
                    evaluation.id,

                numeroEvaluacion:
                    evaluation
                        .numeroEvaluacion,

                estado:
                    "completada",

                fechaFinalizacion:
                    now,

                puntajeTotal:
                    scoring
                        .totalScore,

                personalityId:
                    scoring
                        .personalityId,

                resultadoLiberado:
                    false,
            },

            /*
             * No exponemos el resultado
             * mientras no se valide el pago.
             */
            result: {
                completed: true,

                paymentRequired:
                    true,
            },

            paymentRequired:
                true,
        });
    }
);

/* =========================================================
   EXPORTACIONES
========================================================= */

module.exports = {
    saveAnswers,
    finishEvaluation,
};