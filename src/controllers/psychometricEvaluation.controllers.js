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

const Empresa = require(
    "../models/Empresa"
);

const EmpresaSeccion = require(
    "../models/EmpresaSeccion"
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

const PsychometricIdentityVerification = require(
    "../models/PsychometricIdentityVerification"
);

/* =========================================================
   UTILS
========================================================= */

const sendEmail = require(
    "../utils/sendEmail"
);

/* =========================================================
   NOTIFICACIÓN ADMINISTRATIVA - PROYECTO PENSAR
========================================================= */

const PROJECT_PENSAR_ADMIN_EMAIL =
    process.env
        .PROJECT_PENSAR_ADMIN_EMAIL ||
    "nask.corp@gmail.com";

const escapeHtml = (
    value
) => {
    return String(
        value ??
        ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
};

const getWhatsAppNumber = (
    value
) => {
    let digits =
        String(
            value ||
            ""
        ).replace(
            /\D/g,
            ""
        );

    if (!digits) {
        return "";
    }

    /*
     * Números ecuatorianos:
     * 09XXXXXXXX -> 5939XXXXXXXX
     */
    if (
        digits.length === 10 &&
        digits.startsWith(
            "0"
        )
    ) {
        digits =
            `593${digits.slice(1)}`;
    }

    return digits;
};

const getWhatsAppUrl = ({
    cellular,
    message = "",
}) => {
    const number =
        getWhatsAppNumber(
            cellular
        );

    if (!number) {
        return null;
    }

    const query =
        message
            ? `?text=${encodeURIComponent(
                message
            )}`
            : "";

    return `https://wa.me/${number}${query}`;
};

const sendProjectPensarCompletionAdminEmail =
    async ({
        user,
        course,
        evaluation,
        company = null,
        section = null,
    }) => {
        if (!user) {
            return false;
        }

        const fullName =
            `${user.firstName || ""} ${user.lastName || ""}`
                .trim() ||
            "Usuario sin nombre";

        const whatsappUrl =
            getWhatsAppUrl({
                cellular:
                    user.cellular,

                message:
                    `Hola ${fullName}, te contactamos de iDr.Mind sobre tu evaluación de Proyecto Pensar.`,
            });

        const finishedAt =
            evaluation
                ?.fechaFinalizacion
                ? new Date(
                    evaluation
                        .fechaFinalizacion
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
                : new Date()
                    .toLocaleString(
                        "es-EC",
                        {
                            timeZone:
                                "America/Guayaquil",

                            dateStyle:
                                "long",

                            timeStyle:
                                "short",
                        }
                    );

        await sendEmail({
            to:
                PROJECT_PENSAR_ADMIN_EMAIL,

            subject:
                `✅ Proyecto Pensar: ${fullName} culminó su evaluación`,

            html: `
                <div style="
                    margin:0;
                    padding:28px 14px;
                    background:#f1f5f9;
                    font-family:Arial,Helvetica,sans-serif;
                    color:#101828;
                ">
                    <div style="
                        max-width:680px;
                        margin:0 auto;
                        background:#ffffff;
                        border-radius:18px;
                        overflow:hidden;
                        box-shadow:0 18px 45px rgba(7,27,63,.14);
                    ">
                        <div style="
                            padding:24px 28px;
                            background:#071b3f;
                            background-image:linear-gradient(
                                135deg,
                                #071b3f 0%,
                                #173a8a 100%
                            );
                            color:#ffffff;
                        ">
                            <div style="
                                font-size:12px;
                                font-weight:700;
                                letter-spacing:.08em;
                                text-transform:uppercase;
                                opacity:.78;
                            ">
                                Proyecto Pensar · iDr.Mind
                            </div>

                            <h1 style="
                                margin:8px 0 0;
                                font-size:24px;
                                line-height:1.3;
                            ">
                                Evaluación culminada
                            </h1>
                        </div>

                        <div style="padding:30px;">
                            <p style="
                                margin:0 0 20px;
                                color:#475467;
                                font-size:15px;
                                line-height:1.7;
                            ">
                                Un participante finalizó correctamente
                                su evaluación de Proyecto Pensar.
                            </p>

                            <div style="
                                padding:18px;
                                border:1px solid #e4e7ec;
                                border-radius:14px;
                                background:#f8fafc;
                            ">
                                <p style="margin:0 0 8px;">
                                    <strong>Nombre:</strong>
                                    ${escapeHtml(fullName)}
                                </p>

                                <p style="margin:0 0 8px;">
                                    <strong>Cédula:</strong>
                                    ${escapeHtml(user.cI || "No registrada")}
                                </p>

                                <p style="margin:0 0 8px;">
                                    <strong>Correo:</strong>
                                    ${escapeHtml(user.email || "No registrado")}
                                </p>

                                <p style="margin:0 0 8px;">
                                    <strong>Celular:</strong>
                                    ${escapeHtml(user.cellular || "No registrado")}
                                </p>

                                <p style="margin:0 0 8px;">
                                    <strong>Empresa:</strong>
                                    ${escapeHtml(
                                        company?.nombreComercial ||
                                        company?.razonSocial ||
                                        "Participante individual"
                                    )}
                                </p>

                                <p style="margin:0 0 8px;">
                                    <strong>Sección:</strong>
                                    ${escapeHtml(
                                        section?.nombre ||
                                        "No aplica"
                                    )}
                                </p>

                                <p style="margin:0 0 8px;">
                                    <strong>Evaluación:</strong>
                                    N.º ${escapeHtml(
                                        evaluation?.numeroEvaluacion ||
                                        evaluation?.id ||
                                        "—"
                                    )}
                                </p>

                                <p style="margin:0 0 8px;">
                                    <strong>Test:</strong>
                                    ${escapeHtml(
                                        course?.nombre ||
                                        "Proyecto Pensar"
                                    )}
                                </p>

                                <p style="margin:0;">
                                    <strong>Finalización:</strong>
                                    ${escapeHtml(finishedAt)}
                                </p>
                            </div>

                            ${
                                whatsappUrl
                                    ? `
                                        <div style="
                                            margin-top:24px;
                                            text-align:center;
                                        ">
                                            <a
                                                href="${whatsappUrl}"
                                                target="_blank"
                                                rel="noopener"
                                                style="
                                                    display:inline-block;
                                                    padding:14px 24px;
                                                    border-radius:10px;
                                                    background:#25D366;
                                                    color:#ffffff !important;
                                                    text-decoration:none;
                                                    font-size:15px;
                                                    font-weight:700;
                                                "
                                            >
                                                💬 Contactar por WhatsApp
                                            </a>
                                        </div>
                                    `
                                    : `
                                        <div style="
                                            margin-top:20px;
                                            padding:12px 14px;
                                            border-radius:10px;
                                            background:#fff4e5;
                                            color:#9a6700;
                                            font-size:13px;
                                        ">
                                            El usuario no tiene un número
                                            de celular registrado para WhatsApp.
                                        </div>
                                    `
                            }
                        </div>
                    </div>
                </div>
            `,
        });

        return true;
    };

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

    await PsychometricAnswerOption.destroy({
        where: {
            answerId:
                answer.id,
        },

        transaction,
    });

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
   OBTENER VERIFICACIÓN INICIAL DE IDENTIDAD
========================================================= */

const getInitialIdentityVerification = async ({
    evaluationId,
    transaction = null,
}) => {
    if (!evaluationId) {
        return null;
    }

    const verification =
        await PsychometricIdentityVerification.findOne({
            where: {
                evaluationId,
                captureType: "initial",
            },

            order: [
                ["capturedAt", "DESC"],
            ],

            transaction,
        });

    return verification;
};

/* =========================================================
   VALIDAR VERIFICACIÓN INICIAL DE IDENTIDAD
========================================================= */

const requireInitialIdentityVerification = async ({
    evaluationId,
    transaction = null,
}) => {
    const verification =
        await getInitialIdentityVerification({
            evaluationId,
            transaction,
        });

    if (!verification) {
        const error = new Error(
            "Debes completar la verificación de identidad antes de iniciar el test."
        );

        error.statusCode = 403;
        error.code =
            "IDENTITY_VERIFICATION_REQUIRED";

        throw error;
    }

    if (
        !verification
            .consentAccepted
    ) {
        const error = new Error(
            "La verificación de identidad no registra el consentimiento requerido."
        );

        error.statusCode = 403;
        error.code =
            "IDENTITY_CONSENT_REQUIRED";

        throw error;
    }

    if (
        verification.status ===
        "rejected"
    ) {
        const error = new Error(
            "La verificación de identidad fue rechazada."
        );

        error.statusCode = 403;
        error.code =
            "IDENTITY_VERIFICATION_REJECTED";

        throw error;
    }

    return verification;
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

const sendPsychometricCompletionEmail =
    async ({
        user,
        course,
        evaluation,

        paymentToken,
        paymentExpiresAt,
    }) => {
        const paymentBaseUrl =
            (
                process.env
                    .PSYCHOMETRIC_PAYMENT_URL ||
                "https://idrmind.com/#/pago-test"
            ).replace(/\/+$/, "");

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

        const paymentUrl =
            `${paymentBaseUrl}/${cleanPaymentToken}`;

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

            <div
              style="
                padding:28px;
                text-align:center;
                background-color:#071b3f !important;
                background:#071b3f;
                background-image:linear-gradient(
                  135deg,
                  #071b3f 0%,
                  #173a8a 100%
                );
              "
            >
              <img
                src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1760413741/1_qvykyo.png"
                alt="iDr.Mind"
                width="165"
                style="
                  display:block;
                  width:165px;
                  max-width:100%;
                  height:auto;
                  margin:0 auto;
                  border:0;
                "
              />
            </div>

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

                  ${
                      expirationText
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

              <div style="
                text-align:center;
                margin:30px 0;
              ">

                <a
                  href="${paymentUrl}"
                  target="_blank"
                  style="
                    display:inline-block;
                    padding:15px 30px;

                    background-color:#173a8a !important;
                    background:#173a8a !important;

                    color:#ffffff !important;
                    -webkit-text-fill-color:#ffffff !important;

                    text-decoration:none !important;
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:16px;
                    font-weight:700;
                    line-height:20px;

                    border:1px solid #173a8a;
                    border-radius:12px;
                  "
                >
                  Registrar mi pago
                </a>

              </div>

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

        console.log(
            `✅ Correo de pago psicométrico enviado a ${user.email}`
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

                                        include: [
                                            {
                                                model:
                                                    Empresa,

                                                as:
                                                    "empresa",

                                                required:
                                                    false,
                                            },

                                            {
                                                model:
                                                    EmpresaSeccion,

                                                as:
                                                    "empresaSeccion",

                                                required:
                                                    false,
                                            },
                                        ],
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

        const transaction =
            await sequelize.transaction();

        let scoring;
        let now;

        try {
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

            /* =====================================================
               SNAPSHOT HISTÓRICO DEL PARTICIPANTE
            ===================================================== */

            const participant =
                evaluation
                    .inscripcion
                    ?.user ||
                null;

            const participantCompany =
                participant
                    ?.empresa ||
                null;

            const participantSection =
                participant
                    ?.empresaSeccion ||
                null;

            const empresaIdSnapshot =
                participant
                    ?.empresaId ||
                null;

            const seccionIdSnapshot =
                participant
                    ?.seccionId ||
                null;

            const participantSnapshot =
                participant
                    ? {
                        tipoParticipante:
                            empresaIdSnapshot
                                ? "empresa"
                                : "individual",

                        user: {
                            id:
                                participant.id,

                            cI:
                                participant.cI ||
                                null,

                            email:
                                participant.email ||
                                null,

                            firstName:
                                participant.firstName ||
                                null,

                            lastName:
                                participant.lastName ||
                                null,

                            cellular:
                                participant.cellular ||
                                null,

                            grado:
                                participant.grado ||
                                null,

                            subsistema:
                                participant.subsistema ||
                                null,

                            dateBirth:
                                participant.dateBirth ||
                                null,

                            province:
                                participant.province ||
                                null,

                            city:
                                participant.city ||
                                null,

                            genre:
                                participant.genre ||
                                null,
                        },

                        empresa:
                            empresaIdSnapshot
                                ? {
                                    id:
                                        empresaIdSnapshot,

                                    razonSocial:
                                        participantCompany
                                            ?.razonSocial ||
                                        null,

                                    nombreComercial:
                                        participantCompany
                                            ?.nombreComercial ||
                                        null,

                                    ruc:
                                        participantCompany
                                            ?.ruc ||
                                        null,

                                    ciudad:
                                        participantCompany
                                            ?.ciudad ||
                                        null,

                                    provincia:
                                        participantCompany
                                            ?.provincia ||
                                        null,

                                    sector:
                                        participantCompany
                                            ?.sector ||
                                        null,

                                    subSector:
                                        participantCompany
                                            ?.subSector ||
                                        null,
                                }
                                : null,

                        seccion:
                            seccionIdSnapshot
                                ? {
                                    id:
                                        seccionIdSnapshot,

                                    nombre:
                                        participantSection
                                            ?.nombre ||
                                        null,

                                    descripcion:
                                        participantSection
                                            ?.descripcion ||
                                        null,

                                    responsable:
                                        participantSection
                                            ?.responsable ||
                                        null,
                                }
                                : null,

                        snapshotAt:
                            new Date().toISOString(),
                    }
                    : null;

            now = new Date();

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

                    resultadoLiberado:
                        false,

                    /* =====================================
                       SNAPSHOT ORGANIZACIONAL
                    ===================================== */

                    empresaIdSnapshot:
                        empresaIdSnapshot,

                    seccionIdSnapshot:
                        seccionIdSnapshot,

                    participantSnapshot:
                        participantSnapshot,
                },

                {
                    transaction,
                }
            );

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

        /*
         * Notificación administrativa independiente.
         * Un fallo aquí NO afecta la finalización del test.
         */
        try {
            const adminUser =
                evaluation
                    .inscripcion
                    ?.user;

            const adminCourse =
                evaluation
                    .test
                    ?.course;

            await sendProjectPensarCompletionAdminEmail({
                user:
                    adminUser,

                course:
                    adminCourse,

                evaluation,

                company:
                    adminUser
                        ?.empresa ||
                    null,

                section:
                    adminUser
                        ?.empresaSeccion ||
                    null,
            });

            console.log(
                `✅ Notificación de culminación enviada a ${PROJECT_PENSAR_ADMIN_EMAIL}`
            );
        } catch (
            adminEmailError
        ) {
            console.error(
                "❌ No se pudo enviar la notificación administrativa de culminación:",
                adminEmailError
            );
        }

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

                empresaIdSnapshot:
                    evaluation
                        .empresaIdSnapshot,

                seccionIdSnapshot:
                    evaluation
                        .seccionIdSnapshot,
            },

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

    getInitialIdentityVerification,
    requireInitialIdentityVerification,
};