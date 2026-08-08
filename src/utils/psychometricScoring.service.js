const PsychometricEvaluation = require(
  "../models/PsychometricEvaluation"
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

const PsychometricPersonality = require(
  "../models/PsychometricPersonality"
);

/* =========================================================
   CÓDIGOS DE SECCIÓN
========================================================= */

const SECTION_CODES = {
  ANIMODO: "animodo",
  COMUNICACION: "colores_comunicacion",
  CEREBRO: "tipos_cerebro",
  NEGOCIACION: "forma_negociadora",
  VAK: "vak",
};

/* =========================================================
   COLORES DE RESULTADO
========================================================= */

const BRAIN_TO_HEAD_COLOR = {
  PENSANTE: "AMARILLO",
  EMOCIONAL: "AZUL",
  REPTILIANO: "ROJO",
};

const COMMUNICATION_TO_CHEST_COLOR = {
  LOGICO: "AMARILLO",
  EMOCIONAL: "AZUL",
  RETADOR: "ROJO",
  VISIONARIO: "VERDE",
};

/* =========================================================
   DISTRIBUCIÓN DE LAS 23 PREGUNTAS DE CEREBRO

   Esta distribución permite calcular el resultado aunque
   las preguntas actuales no tengan categoriaResultado
   dentro de configuracion.
========================================================= */

const BRAIN_QUESTION_MAP = {
  PENSANTE: [
    1,
    5,
    8,
    11,
    12,
    16,
    22,
  ],

  EMOCIONAL: [
    3,
    4,
    6,
    7,
    9,
    10,
    14,
    20,
  ],

  REPTILIANO: [
    2,
    13,
    15,
    17,
    18,
    19,
    21,
    23,
  ],
};

/* =========================================================
   UTILIDADES GENERALES
========================================================= */

const normalizeCode = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
};

const toNumber = (
  value,
  defaultValue = 0
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : defaultValue;
};

const round = (
  value,
  decimals = 2
) => {
  const factor = 10 ** decimals;

  return (
    Math.round(
      (
        toNumber(value) +
        Number.EPSILON
      ) * factor
    ) / factor
  );
};

const sumObjectValues = (
  object = {}
) => {
  return Object.values(
    object
  ).reduce(
    (total, value) =>
      total + toNumber(value),
    0
  );
};

const addScore = (
  scores,
  category,
  value
) => {
  const normalizedCategory =
    normalizeCode(category);

  if (!normalizedCategory) {
    return;
  }

  scores[normalizedCategory] =
    toNumber(
      scores[normalizedCategory]
    ) + toNumber(value);
};

const calculatePercentages = (
  scores = {}
) => {
  const total =
    sumObjectValues(scores);

  return Object.fromEntries(
    Object.entries(scores).map(
      ([category, value]) => [
        category,

        total > 0
          ? round(
              (
                toNumber(value) /
                total
              ) * 100
            )
          : 0,
      ]
    )
  );
};

const getWinners = (
  scores = {},
  preferredOrder = []
) => {
  const entries =
    Object.entries(scores);

  if (!entries.length) {
    return {
      maxScore: 0,
      winners: [],
      winner: null,
      tied: false,
    };
  }

  const maxScore = Math.max(
    ...entries.map(([, value]) =>
      toNumber(value)
    )
  );

  const winners = entries
    .filter(
      ([, value]) =>
        toNumber(value) ===
        maxScore
    )
    .map(([category]) =>
      category
    );

  /*
   * Si todos los puntajes son cero,
   * no existe resultado válido.
   */
  const allZero =
    entries.every(
      ([, value]) =>
        toNumber(value) === 0
    );

  if (allZero) {
    return {
      maxScore: 0,
      winners,
      winner: null,
      tied: true,
    };
  }

  /*
   * En empate utilizamos un orden estable.
   * También conservamos tied=true para el informe.
   */
  let winner = null;

  if (winners.length === 1) {
    winner = winners[0];
  } else {
    winner =
      preferredOrder.find(
        (category) =>
          winners.includes(category)
      ) ||
      winners[0] ||
      null;
  }

  return {
    maxScore,
    winners,
    winner,
    tied:
      winners.length > 1,
  };
};

const getSelectedOptions = (
  answer
) => {
  return Array.isArray(
    answer?.selectedOptions
  )
    ? answer.selectedOptions
    : [];
};

const getQuestionOrder = (
  answer
) => {
  return toNumber(
    answer?.question
      ?.ordenSubtest ??
      answer?.question?.orden
  );
};

const getOptionCategory = (
  selectedOption
) => {
  return normalizeCode(
    selectedOption
      ?.categoriaResultado ||
      selectedOption?.option
        ?.categoriaResultado ||
      selectedOption?.option
        ?.codigo
  );
};

/* =========================================================
   PUNTAJE DE OPCIONES

   Comunicación:
   prioridad 1 = 3 puntos
   prioridad 2 = 1 punto

   Otros subtests:
   usa puntajeAplicado, puntaje de opción o fallback.
========================================================= */

const getAppliedScore = (
  selectedOption,
  {
    useCommunicationPriority = false,
    fallback = 1,
  } = {}
) => {
  if (
    selectedOption
      ?.puntajeAplicado !==
      null &&
    selectedOption
      ?.puntajeAplicado !==
      undefined
  ) {
    return toNumber(
      selectedOption
        .puntajeAplicado
    );
  }

  if (
    useCommunicationPriority
  ) {
    const priority =
      toNumber(
        selectedOption
          ?.prioridad,
        0
      );

    if (priority === 1) {
      return 3;
    }

    if (priority === 2) {
      return 1;
    }
  }

  if (
    selectedOption?.option
      ?.puntaje !== null &&
    selectedOption?.option
      ?.puntaje !== undefined
  ) {
    return toNumber(
      selectedOption
        .option.puntaje
    );
  }

  return fallback;
};

/* =========================================================
   AGRUPAR RESPUESTAS POR SECCIÓN
========================================================= */

const groupAnswersBySection = (
  answers = []
) => {
  const grouped = {};

  for (const answer of answers) {
    const sectionCode =
      normalizeCode(
        answer?.question
          ?.section?.codigo
      ).toLowerCase();

    if (!sectionCode) {
      continue;
    }

    if (!grouped[sectionCode]) {
      grouped[sectionCode] = [];
    }

    grouped[sectionCode].push(
      answer
    );
  }

  /*
   * Mantener el orden real de las preguntas.
   */
  Object.values(grouped).forEach(
    (sectionAnswers) => {
      sectionAnswers.sort(
        (a, b) =>
          getQuestionOrder(a) -
          getQuestionOrder(b)
      );
    }
  );

  return grouped;
};

/* =========================================================
   ANIMODO

   Según la hoja de cálculo:

   Preguntas impares:
   SENTIR - PENSAR

   Preguntas pares:
   ACTUAR - OBSERVAR

   Cada eje tiene 7 preguntas con valores de 1 a 6.
   El punto medio del eje es 24.5.
========================================================= */

const calculateAnimodo = (
  answers = []
) => {
  let sentirPensarTotal = 0;
  let actuarObservarTotal = 0;

  let sentirPensarQuestions = 0;
  let actuarObservarQuestions = 0;

  for (const answer of answers) {
    const order =
      getQuestionOrder(answer);

    const value =
      toNumber(
        answer?.valorNumerico,
        0
      );

    if (!order || !value) {
      continue;
    }

    if (order % 2 !== 0) {
      sentirPensarTotal += value;
      sentirPensarQuestions += 1;
    } else {
      actuarObservarTotal += value;
      actuarObservarQuestions += 1;
    }
  }

  const axisMin = 1;
  const axisMax = 6;

  const sentirPensarMidpoint =
    sentirPensarQuestions *
    (
      (axisMin + axisMax) /
      2
    );

  const actuarObservarMidpoint =
    actuarObservarQuestions *
    (
      (axisMin + axisMax) /
      2
    );

  /*
   * En las preguntas impares:
   * valor bajo  → SENTIR
   * valor alto  → PENSAR
   *
   * En las preguntas pares:
   * valor bajo  → ACTUAR
   * valor alto  → OBSERVAR
   */
  const scores = {
    SENTIR:
      sentirPensarQuestions *
        (axisMax + 1) -
      sentirPensarTotal,

    PENSAR:
      sentirPensarTotal,

    ACTUAR:
      actuarObservarQuestions *
        (axisMax + 1) -
      actuarObservarTotal,

    OBSERVAR:
      actuarObservarTotal,
  };

  const sentirPensar =
    sentirPensarMidpoint -
    sentirPensarTotal;

  const actuarObservar =
    actuarObservarMidpoint -
    actuarObservarTotal;

  const animal =
    determineAnimodoAnimal({
      scores,
      sentirPensar,
      actuarObservar,
    });

  return {
    codigo:
      SECTION_CODES.ANIMODO,

    scores,

    percentages:
      calculatePercentages(
        scores
      ),

    rawTotals: {
      sentirPensar:
        sentirPensarTotal,

      actuarObservar:
        actuarObservarTotal,

      sentirPensarMidpoint,
      actuarObservarMidpoint,
    },

    axes: {
      sentirPensar:
        round(sentirPensar),

      actuarObservar:
        round(actuarObservar),
    },

    animal,
  };
};

/* =========================================================
   DETERMINAR ANIMAL
========================================================= */

const determineAnimodoAnimal = ({
  scores,
  sentirPensar,
  actuarObservar,
}) => {
  const firstAxisTied =
    sentirPensar === 0;

  const secondAxisTied =
    actuarObservar === 0;

  if (
    firstAxisTied ||
    secondAxisTied
  ) {
    return "CAMALEON";
  }

  const feelingDominant =
    scores.SENTIR >
    scores.PENSAR;

  const thinkingDominant =
    scores.PENSAR >
    scores.SENTIR;

  const actingDominant =
    scores.ACTUAR >
    scores.OBSERVAR;

  const observingDominant =
    scores.OBSERVAR >
    scores.ACTUAR;

  if (
    feelingDominant &&
    actingDominant
  ) {
    return "DELFIN";
  }

  if (
    thinkingDominant &&
    actingDominant
  ) {
    return "ABEJA";
  }

  if (
    thinkingDominant &&
    observingDominant
  ) {
    return "CASTOR";
  }

  if (
    feelingDominant &&
    observingDominant
  ) {
    return "BUHO";
  }

  return "CAMALEON";
};

/* =========================================================
   COLORES DE COMUNICACIÓN
========================================================= */

const calculateCommunicationColors = (
  answers = []
) => {
  const scores = {
    AMARILLO: 0,
    AZUL: 0,
    ROJO: 0,
    VERDE: 0,
  };

  for (const answer of answers) {
    const selectedOptions =
      getSelectedOptions(answer);

    /*
     * Mantener el orden de prioridad.
     */
    const orderedOptions =
      [...selectedOptions].sort(
        (a, b) =>
          toNumber(
            a?.prioridad,
            99
          ) -
          toNumber(
            b?.prioridad,
            99
          )
      );

    for (
      const selected of
      orderedOptions
    ) {
      const category =
        getOptionCategory(
          selected
        );

      const score =
        getAppliedScore(
          selected,
          {
            useCommunicationPriority:
              true,
          }
        );

      addScore(
        scores,
        category,
        score
      );
    }
  }

  const result =
    getWinners(
      scores,
      [
        "AMARILLO",
        "AZUL",
        "ROJO",
        "VERDE",
      ]
    );

  const dominantColor =
    result.winner;

  const communicationType =
    getCommunicationTypeFromColor(
      dominantColor
    );

  return {
    codigo:
      SECTION_CODES
        .COMUNICACION,

    scores,

    percentages:
      calculatePercentages(
        scores
      ),

    dominantColor,
    communicationType,

    tied: result.tied,

    tiedCategories:
      result.winners,
  };
};

const getCommunicationTypeFromColor = (
  color
) => {
  const map = {
    AMARILLO: "LOGICO",
    AZUL: "EMOCIONAL",
    ROJO: "RETADOR",
    VERDE: "VISIONARIO",
  };

  return (
    map[
      normalizeCode(color)
    ] || null
  );
};

/* =========================================================
   TIPOS DE CEREBRO
========================================================= */

const getBrainCategoryByOrder = (
  order
) => {
  for (
    const [
      category,
      questionOrders,
    ] of Object.entries(
      BRAIN_QUESTION_MAP
    )
  ) {
    if (
      questionOrders.includes(
        order
      )
    ) {
      return category;
    }
  }

  return null;
};

const calculateBrainTypes = (
  answers = []
) => {
  const scores = {
    PENSANTE: 0,
    EMOCIONAL: 0,
    REPTILIANO: 0,
  };

  for (const answer of answers) {
    const question =
      answer?.question || {};

    const value =
      toNumber(
        answer?.valorNumerico,
        0
      );

    const selectedOptions =
      getSelectedOptions(answer);

    /*
     * Primero intenta usar categorías
     * configuradas en opciones.
     */
    if (
      selectedOptions.length
    ) {
      for (
        const selected of
        selectedOptions
      ) {
        const category =
          normalizeBrainCategory(
            getOptionCategory(
              selected
            )
          );

        if (category) {
          addScore(
            scores,
            category,
            getAppliedScore(
              selected
            )
          );
        }
      }

      continue;
    }

    const config =
      question.configuracion ||
      {};

    /*
     * Primero busca una categoría
     * declarada en la configuración.
     */
    let category =
      normalizeBrainCategory(
        config
          .categoriaResultado ||
          config.categoria ||
          config.dimension ||
          answer?.metadata
            ?.categoriaResultado ||
          answer?.metadata
            ?.categoria
      );

    /*
     * Las preguntas actuales solo
     * tienen escala. En ese caso se
     * usa el mapa por número.
     */
    if (!category) {
      category =
        getBrainCategoryByOrder(
          getQuestionOrder(
            answer
          )
        );
    }

    if (
      category &&
      value > 0
    ) {
      addScore(
        scores,
        category,
        value
      );
    }
  }

  const result =
    getWinners(
      scores,
      [
        "PENSANTE",
        "EMOCIONAL",
        "REPTILIANO",
      ]
    );

  const brainType =
    result.winner;

  return {
    codigo:
      SECTION_CODES.CEREBRO,

    scores,

    percentages:
      calculatePercentages(
        scores
      ),

    brainType,

    headColor:
      BRAIN_TO_HEAD_COLOR[
        brainType
      ] || null,

    tied:
      result.tied,

    tiedCategories:
      result.winners,
  };
};

const normalizeBrainCategory = (
  category
) => {
  const normalized =
    normalizeCode(category);

  const map = {
    PENSANTE: "PENSANTE",
    IZQUIERDO: "PENSANTE",
    PENSAR: "PENSANTE",

    EMOCIONAL: "EMOCIONAL",
    DERECHO: "EMOCIONAL",
    SENTIR: "EMOCIONAL",

    REPTILIANO:
      "REPTILIANO",
    CENTRAL: "REPTILIANO",
    HACER: "REPTILIANO",
    ACTUAR: "REPTILIANO",
  };

  return (
    map[normalized] || null
  );
};

/* =========================================================
   FORMA NEGOCIADORA
========================================================= */

const getNegotiationFallbackScore = (
  selectedOption
) => {
  const code =
    normalizeCode(
      selectedOption?.option
        ?.codigo
    );

  const scoreByCode = {
    A: 1,
    B: 2,
    C: 3,
  };

  return (
    scoreByCode[code] || 1
  );
};

const calculateNegotiation = (
  answers = []
) => {
  let totalScore = 0;

  const categories = {};

  for (const answer of answers) {
    const selectedOptions =
      getSelectedOptions(answer);

    if (
      selectedOptions.length
    ) {
      for (
        const selected of
        selectedOptions
      ) {
        const score =
          getAppliedScore(
            selected,
            {
              fallback:
                getNegotiationFallbackScore(
                  selected
                ),
            }
          );

        totalScore += score;

        const category =
          getOptionCategory(
            selected
          );

        if (category) {
          addScore(
            categories,
            category,
            score
          );
        }
      }

      continue;
    }

    totalScore += toNumber(
      answer
        ?.puntajeCalculado ??
        answer?.valorNumerico
    );
  }

  const classification =
    classifyNegotiationScore(
      totalScore,
      answers.length
    );

  return {
    codigo:
      SECTION_CODES
        .NEGOCIACION,

    totalScore:
      round(totalScore),

    categories,
    classification,
  };
};

const classifyNegotiationScore = (
  score,
  totalQuestions
) => {
  if (!totalQuestions) {
    return null;
  }

  const maximumEstimated =
    totalQuestions * 3;

  const percentage =
    maximumEstimated > 0
      ? (
          score /
          maximumEstimated
        ) * 100
      : 0;

  if (percentage < 40) {
    return "BAJO";
  }

  if (percentage < 70) {
    return "MEDIO";
  }

  return "ALTO";
};

/* =========================================================
   VAK
========================================================= */

const calculateVak = (
  answers = []
) => {
  const scores = {
    VISUAL: 0,
    AUDITIVO: 0,
    KINESTESICO: 0,
  };

  for (const answer of answers) {
    for (
      const selected of
      getSelectedOptions(answer)
    ) {
      addScore(
        scores,
        getOptionCategory(
          selected
        ),
        getAppliedScore(
          selected
        )
      );
    }
  }

  const result =
    getWinners(
      scores,
      [
        "VISUAL",
        "AUDITIVO",
        "KINESTESICO",
      ]
    );

  return {
    codigo:
      SECTION_CODES.VAK,

    scores,

    percentages:
      calculatePercentages(
        scores
      ),

    dominantStyle:
      result.winner,

    tied:
      result.tied,

    tiedCategories:
      result.winners,
  };
};

/* =========================================================
   PERSISTENCIA
========================================================= */

const calculatePersistence = ({
  animodo,
  communication,
  brain,
  negotiation,
}) => {
  let score = 0;

  const factors = [];

  if (
    negotiation
      .classification ===
    "ALTO"
  ) {
    score += 2;

    factors.push(
      "NEGOCIACION_ALTA"
    );
  } else if (
    negotiation
      .classification ===
    "MEDIO"
  ) {
    score += 1;

    factors.push(
      "NEGOCIACION_MEDIA"
    );
  }

  if (
    [
      "ABEJA",
      "CASTOR",
    ].includes(
      animodo.animal
    )
  ) {
    score += 1;

    factors.push(
      "ANIMAL_PERSISTENTE"
    );
  }

  if (
    communication
      .communicationType ===
    "RETADOR"
  ) {
    score += 1;

    factors.push(
      "COMUNICACION_RETADORA"
    );
  }

  if (
    brain.brainType ===
    "REPTILIANO"
  ) {
    score += 1;

    factors.push(
      "CEREBRO_REPTILIANO"
    );
  }

  let level = "NO";

  if (score >= 4) {
    level = "SI";
  } else if (score >= 2) {
    level = "ALERTA";
  }

  return {
    score,
    level,
    factors,
  };
};

/* =========================================================
   BUSCAR PERSONALIDAD

   Se cargan las personalidades activas y se comparan
   normalizadas. Así no importa si en PostgreSQL están como:
   Delfín, DELFIN, Amarillo, AMARILLO, etc.
========================================================= */

const findPersonality = async ({
  animal,
  headColor,
  chestColor,
  transaction,
}) => {
  const normalizedAnimal =
    normalizeCode(animal);

  const normalizedHead =
    normalizeCode(headColor);

  const normalizedChest =
    normalizeCode(chestColor);

  if (
    !normalizedAnimal ||
    !normalizedHead ||
    !normalizedChest
  ) {
    return null;
  }

  const personalities =
    await PsychometricPersonality.findAll({
      where: {
        activo: true,
      },

      transaction,
    });

  return (
    personalities.find(
      (personality) =>
        normalizeCode(
          personality.animal
        ) ===
          normalizedAnimal &&
        normalizeCode(
          personality.colorCabeza
        ) ===
          normalizedHead &&
        normalizeCode(
          personality.colorPecho
        ) ===
          normalizedChest
    ) || null
  );
};

/* =========================================================
   VALIDAR RESPUESTAS OBLIGATORIAS
========================================================= */

const validateRequiredAnswers = async ({
  evaluation,
  answers,
  transaction,
}) => {
  const requiredQuestions =
    await PsychometricQuestion.findAll({
      where: {
        obligatoria: true,
        activo: true,
      },

      include: [
        {
          model:
            PsychometricSection,

          as: "section",

          where: {
            testId:
              evaluation.testId,

            activo: true,
          },

          attributes: [
            "id",
            "codigo",
            "nombre",
          ],
        },
      ],

      attributes: [
        "id",
        "pregunta",
        "tipoRespuesta",
        "seleccionesMinimas",
        "seleccionesMaximas",
      ],

      transaction,
    });

  const answerByQuestion =
    new Map(
      answers.map(
        (answer) => [
          String(
            answer.questionId
          ),
          answer,
        ]
      )
    );

  const missingQuestions = [];

  for (
    const question of
    requiredQuestions
  ) {
    const answer =
      answerByQuestion.get(
        String(question.id)
      );

    if (!answer) {
      missingQuestions.push({
        id: question.id,

        pregunta:
          question.pregunta,

        tipoRespuesta:
          question.tipoRespuesta,

        motivo:
          "SIN_RESPUESTA",
      });

      continue;
    }

    if (
      [
        "escala_bipolar",
        "escala_1_5",
      ].includes(
        question.tipoRespuesta
      )
    ) {
      const hasNumeric =
        answer.valorNumerico !==
          null &&
        answer.valorNumerico !==
          undefined &&
        answer.valorNumerico !== "";

      if (!hasNumeric) {
        missingQuestions.push({
          id: question.id,

          pregunta:
            question.pregunta,

          tipoRespuesta:
            question.tipoRespuesta,

          motivo:
            "SIN_VALOR_NUMERICO",
        });
      }

      continue;
    }

    if (
      [
        "seleccion_unica",
        "seleccion_ponderada",
      ].includes(
        question.tipoRespuesta
      )
    ) {
      const selectedCount =
        getSelectedOptions(
          answer
        ).length;

      const minimum =
        toNumber(
          question
            .seleccionesMinimas,
          1
        );

      const maximum =
        toNumber(
          question
            .seleccionesMaximas,
          minimum
        );

      if (
        selectedCount < minimum ||
        selectedCount > maximum
      ) {
        missingQuestions.push({
          id: question.id,

          pregunta:
            question.pregunta,

          tipoRespuesta:
            question.tipoRespuesta,

          motivo:
            "CANTIDAD_OPCIONES_INVALIDA",

          seleccionadas:
            selectedCount,

          minimo: minimum,
          maximo: maximum,
        });
      }
    }
  }

  return {
    valid:
      missingQuestions.length ===
      0,

    totalRequired:
      requiredQuestions.length,

    totalAnswered:
      requiredQuestions.length -
      missingQuestions.length,

    missingQuestions,
  };
};

/* =========================================================
   CARGAR EVALUACIÓN COMPLETA
========================================================= */

const loadEvaluationForScoring = async ({
  evaluationId,
  transaction,
}) => {
  return PsychometricEvaluation.findByPk(
    evaluationId,
    {
      include: [
        {
          model:
            PsychometricAnswer,

          as: "answers",

          include: [
            {
              model:
                PsychometricQuestion,

              as: "question",

              include: [
                {
                  model:
                    PsychometricSection,

                  as: "section",
                },
              ],
            },

            {
              model:
                PsychometricAnswerOption,

              as:
                "selectedOptions",

              include: [
                {
                  model:
                    PsychometricOption,

                  as: "option",
                },
              ],
            },
          ],
        },
      ],

      transaction,
    }
  );
};

/* =========================================================
   CALCULAR RESULTADO COMPLETO
========================================================= */

const calculateCompleteResult = async ({
  evaluationId,
  transaction,
}) => {
  const evaluation =
    await loadEvaluationForScoring({
      evaluationId,
      transaction,
    });

  if (!evaluation) {
    const error = new Error(
      "La evaluación no existe."
    );

    error.statusCode = 404;

    throw error;
  }

  const answers =
    evaluation.answers || [];

  const validation =
    await validateRequiredAnswers({
      evaluation,
      answers,
      transaction,
    });

  if (!validation.valid) {
    const error = new Error(
      `Faltan o están incompletas ${validation.missingQuestions.length} preguntas obligatorias.`
    );

    error.statusCode = 422;
    error.details = validation;

    throw error;
  }

  const grouped =
    groupAnswersBySection(
      answers
    );

  const animodo =
    calculateAnimodo(
      grouped[
        SECTION_CODES.ANIMODO
      ] || []
    );

  const communication =
    calculateCommunicationColors(
      grouped[
        SECTION_CODES.COMUNICACION
      ] || []
    );

  const brain =
    calculateBrainTypes(
      grouped[
        SECTION_CODES.CEREBRO
      ] || []
    );

  const negotiation =
    calculateNegotiation(
      grouped[
        SECTION_CODES.NEGOCIACION
      ] || []
    );

  const vak =
    calculateVak(
      grouped[
        SECTION_CODES.VAK
      ] || []
    );

  const persistence =
    calculatePersistence({
      animodo,
      communication,
      brain,
      negotiation,
    });

  /*
   * Estos datos aparecerán en la consola
   * si vuelve a existir una combinación
   * no encontrada.
   */
  console.log(
    "======================================"
  );

  console.log(
    "RESULTADO PSICOMÉTRICO PARA PERSONALIDAD"
  );

  console.log(
    "ANIMAL:",
    animodo.animal
  );

  console.log(
    "CEREBRO:",
    brain.brainType
  );

  console.log(
    "CABEZA:",
    brain.headColor
  );

  console.log(
    "COMUNICACIÓN:",
    communication
      .communicationType
  );

  console.log(
    "PECHO:",
    communication
      .dominantColor
  );

  console.log(
    "======================================"
  );

  if (
    !animodo.animal ||
    !brain.headColor ||
    !communication
      .dominantColor
  ) {
    const error = new Error(
      "No se pudieron determinar todos los componentes de la personalidad."
    );

    error.statusCode = 422;

    error.details = {
      animal:
        animodo.animal,

      animodoScores:
        animodo.scores,

      tipoCerebro:
        brain.brainType,

      colorCabeza:
        brain.headColor,

      brainScores:
        brain.scores,

      tipoComunicacion:
        communication
          .communicationType,

      colorPecho:
        communication
          .dominantColor,

      communicationScores:
        communication.scores,
    };

    throw error;
  }

  const personality =
    await findPersonality({
      animal:
        animodo.animal,

      headColor:
        brain.headColor,

      chestColor:
        communication
          .dominantColor,

      transaction,
    });

  if (!personality) {
    const error = new Error(
      "No existe una personalidad activa para la combinación calculada."
    );

    error.statusCode = 422;

    error.details = {
      animal:
        animodo.animal,

      colorCabeza:
        brain.headColor,

      colorPecho:
        communication
          .dominantColor,

      tipoCerebro:
        brain.brainType,

      tipoComunicacion:
        communication
          .communicationType,
    };

    throw error;
  }

  const totalScore =
    round(
      sumObjectValues(
        communication.scores
      ) +
        sumObjectValues(
          brain.scores
        ) +
        negotiation.totalScore +
        sumObjectValues(
          vak.scores
        )
    );

  return {
    evaluation,
    validation,

    personality,

    personalityId:
      personality.id,

    totalScore,

    result: {
      version:
        evaluation
          .testVersion,

      generatedAt:
        new Date()
          .toISOString(),

      animodo,
      communication,
      brain,
      negotiation,
      vak,
      persistence,

      personality: {
        id:
          personality.id,

        numero:
          personality.numero,

        codigo:
          personality.codigo,

        nombre:
          personality.nombre,

        animal:
          personality.animal,

        colorCabeza:
          personality
            .colorCabeza,

        tipoCerebro:
          personality
            .tipoCerebro,

        colorPecho:
          personality
            .colorPecho,

        tipoComunicacion:
          personality
            .tipoComunicacion,

        imagenUrl:
          personality.imagenUrl,
      },
    },
  };
};

/* =========================================================
   EXPORTACIONES
========================================================= */

module.exports = {
  calculateAnimodo,
  determineAnimodoAnimal,

  calculateCommunicationColors,

  calculateBrainTypes,

  calculateNegotiation,

  calculateVak,

  calculatePersistence,

  findPersonality,

  validateRequiredAnswers,

  loadEvaluationForScoring,

  calculateCompleteResult,
};