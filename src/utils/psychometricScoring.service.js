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

  COMUNICACION:
    "colores_comunicacion",

  CEREBRO:
    "tipos_cerebro",

  NEGOCIACION:
    "forma_negociadora",

  VAK:
    "vak",
};

/* =========================================================
   COLORES DE CABEZA

   Equivalencia utilizada para seleccionar
   la personalidad final.

   IZQUIERDO / PENSAR / VISUAL -> AMARILLO
   CENTRAL / HACER / AUDITIVO -> ROJO
   DERECHO / SENTIR / KINESTÉSICO -> AZUL
========================================================= */

const BRAIN_TO_HEAD_COLOR = {
  IZQUIERDO:
    "AMARILLO",

  CENTRAL:
    "ROJO",

  DERECHO:
    "AZUL",
};

/* =========================================================
   DESCRIPCIÓN COMPLETA DEL TIPO DE CEREBRO
   SEGÚN DIAG.FINAL
========================================================= */

const BRAIN_TYPE_LABELS = {
  IZQUIERDO:
    "IZQUIERDO / PENSAR",

  CENTRAL:
    "CENTRAL / HACER",

  DERECHO:
    "DERECHO / SENTIR",
};

/* =========================================================
   COLORES DE COMUNICACIÓN
========================================================= */

const COMMUNICATION_TYPES = {
  AMARILLO:
    "LOGICO",

  ROJO:
    "RETADOR",

  AZUL:
    "EMOCIONAL",

  VERDE:
    "VISIONARIO",
};

/* =========================================================
   MAPA EXACTO TIPOS DE CEREBRO
   BASE!GL:GN

   GL =
   DH + DL + DO + DR + DS + DV + DW + EC

   GM =
   DI + DT + DX + DY + DZ + EB + ED

   GN =
   DJ + DK + DM + DN + DP + DQ + DU + EA
========================================================= */

const BRAIN_QUESTION_MAP = {
  IZQUIERDO: [
    1,
    5,
    8,
    11,
    12,
    15,
    16,
    22,
  ],

  CENTRAL: [
    2,
    13,
    17,
    18,
    19,
    21,
    23,
  ],

  DERECHO: [
    3,
    4,
    6,
    7,
    9,
    10,
    14,
    20,
  ],
};

/* =========================================================
   MATRIZ EXACTA FORMA NEGOCIADORA
   BASE!JD:KG

   Cada pregunta convierte A / B / C
   a un valor 1, 2 o 3.
========================================================= */

const NEGOTIATION_SCORE_MAP = {
  1: {
    A: 3,
    B: 1,
    C: 2,
  },

  2: {
    A: 2,
    B: 3,
    C: 1,
  },

  3: {
    A: 1,
    B: 2,
    C: 3,
  },

  4: {
    A: 1,
    B: 2,
    C: 3,
  },

  5: {
    A: 1,
    B: 2,
    C: 3,
  },

  6: {
    A: 2,
    B: 3,
    C: 1,
  },

  7: {
    A: 2,
    B: 1,
    C: 3,
  },

  8: {
    A: 2,
    B: 3,
    C: 1,
  },

  9: {
    A: 2,
    B: 3,
    C: 1,
  },

  10: {
    A: 1,
    B: 3,
    C: 2,
  },

  11: {
    A: 2,
    B: 3,
    C: 1,
  },

  12: {
    A: 1,
    B: 2,
    C: 3,
  },

  13: {
    A: 1,
    B: 2,
    C: 3,
  },

  14: {
    A: 2,
    B: 3,
    C: 1,
  },

  15: {
    A: 1,
    B: 2,
    C: 3,
  },

  16: {
    A: 2,
    B: 1,
    C: 3,
  },

  17: {
    A: 1,
    B: 2,
    C: 3,
  },

  18: {
    A: 2,
    B: 3,
    C: 1,
  },

  19: {
    A: 1,
    B: 2,
    C: 3,
  },

  20: {
    A: 3,
    B: 2,
    C: 1,
  },

  21: {
    A: 1,
    B: 3,
    C: 2,
  },

  22: {
    A: 2,
    B: 3,
    C: 1,
  },

  23: {
    A: 2,
    B: 3,
    C: 1,
  },

  24: {
    A: 3,
    B: 2,
    C: 1,
  },

  25: {
    A: 2,
    B: 1,
    C: 3,
  },

  26: {
    A: 3,
    B: 2,
    C: 1,
  },

  27: {
    A: 1,
    B: 2,
    C: 3,
  },

  28: {
    A: 1,
    B: 2,
    C: 3,
  },

  29: {
    A: 3,
    B: 2,
    C: 1,
  },

  30: {
    A: 3,
    B: 1,
    C: 2,
  },
};

/* =========================================================
   MATRIZ EXACTA VAK
   BASE!KH:KS

   1 = VISUAL
   2 = AUDITIVO
   3 = KINESTÉSICO
========================================================= */

const VAK_SCORE_MAP = {
  1: {
    A: "VISUAL",
    B: "AUDITIVO",
    C: "KINESTESICO",
  },

  2: {
    A: "KINESTESICO",
    B: "AUDITIVO",
    C: "VISUAL",
  },

  3: {
    A: "KINESTESICO",
    B: "VISUAL",
    C: "AUDITIVO",
  },

  4: {
    A: "VISUAL",
    B: "AUDITIVO",
    C: "KINESTESICO",
  },

  5: {
    A: "VISUAL",
    B: "KINESTESICO",
    C: "AUDITIVO",
  },

  6: {
    A: "AUDITIVO",
    B: "KINESTESICO",
    C: "VISUAL",
  },

  7: {
    A: "VISUAL",
    B: "AUDITIVO",
    C: "KINESTESICO",
  },

  8: {
    A: "AUDITIVO",
    B: "VISUAL",
    C: "KINESTESICO",
  },

  9: {
    A: "AUDITIVO",
    B: "VISUAL",
    C: "KINESTESICO",
  },

  10: {
    A: "KINESTESICO",
    B: "VISUAL",
    C: "AUDITIVO",
  },

  11: {
    A: "AUDITIVO",
    B: "VISUAL",
    C: "KINESTESICO",
  },

  12: {
    A: "VISUAL",
    B: "AUDITIVO",
    C: "KINESTESICO",
  },
};

/* =========================================================
   UTILIDADES GENERALES
========================================================= */

const normalizeCode = (
  value
) => {
  return String(
    value || ""
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .toUpperCase()
    .replace(
      /\s+/g,
      "_"
    );
};

const toNumber = (
  value,
  defaultValue = 0
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : defaultValue;
};

const round = (
  value,
  decimals = 2
) => {
  const factor =
    10 ** decimals;

  return (
    Math.round(
      (
        toNumber(
          value
        ) +
        Number.EPSILON
      ) *
      factor
    ) /
    factor
  );
};

const sumObjectValues = (
  object = {}
) => {
  return Object.values(
    object
  ).reduce(
    (
      total,
      value
    ) =>
      total +
      toNumber(
        value
      ),
    0
  );
};

const calculatePercentages = (
  scores = {}
) => {
  const total =
    sumObjectValues(
      scores
    );

  return Object.fromEntries(
    Object.entries(
      scores
    ).map(
      ([
        category,
        value,
      ]) => [
          category,

          total > 0
            ? round(
              (
                toNumber(
                  value
                ) /
                total
              ) *
              100,
              2
            )
            : 0,
        ]
    )
  );
};

/* =========================================================
   PROPORCIONES DECIMALES

   El Excel guarda comunicación como:
   0.215909...
   0.125
   0.431818...
   etc.

   Se conservan ambas versiones:
   - proportions = decimal
   - percentages = 0-100
========================================================= */

const calculateProportions = (
  scores = {}
) => {
  const total =
    sumObjectValues(
      scores
    );

  return Object.fromEntries(
    Object.entries(
      scores
    ).map(
      ([
        category,
        value,
      ]) => [
          category,

          total > 0
            ? toNumber(
              value
            ) / total
            : 0,
        ]
    )
  );
};

/* =========================================================
   GANADOR

   Excel usa LARGE + HLOOKUP.
   Si existe empate, HLOOKUP toma
   la primera coincidencia de izquierda a derecha.
========================================================= */

const getWinners = (
  scores = {},
  preferredOrder = []
) => {
  const entries =
    Object.entries(
      scores
    );

  if (
    !entries.length
  ) {
    return {
      maxScore: 0,
      winners: [],
      winner: null,
      winnerIndex: null,
      tied: false,
    };
  }

  const maxScore =
    Math.max(
      ...entries.map(
        ([
          ,
          value,
        ]) =>
          toNumber(
            value
          )
      )
    );

  const allZero =
    entries.every(
      ([
        ,
        value,
      ]) =>
        toNumber(
          value
        ) === 0
    );

  if (allZero) {
    return {
      maxScore: 0,

      winners:
        entries.map(
          ([
            category,
          ]) =>
            category
        ),

      winner:
        null,

      winnerIndex:
        null,

      tied:
        true,
    };
  }

  const winners =
    entries
      .filter(
        ([
          ,
          value,
        ]) =>
          toNumber(
            value
          ) ===
          maxScore
      )
      .map(
        ([
          category,
        ]) =>
          category
      );

  const winner =
    preferredOrder.find(
      (category) =>
        winners.includes(
          category
        )
    ) ||
    winners[0] ||
    null;

  const winnerIndex =
    winner
      ? preferredOrder.indexOf(
        winner
      ) + 1
      : null;

  return {
    maxScore,
    winners,
    winner,
    winnerIndex,

    tied:
      winners.length >
      1,
  };
};

const getSelectedOptions = (
  answer
) => {
  return Array.isArray(
    answer
      ?.selectedOptions
  )
    ? answer
      .selectedOptions
    : [];
};

const getQuestionOrder = (
  answer
) => {
  return toNumber(
    answer?.question
      ?.ordenSubtest ??
    answer?.question
      ?.orden
  );
};

/* =========================================================
   LETRA DE OPCIÓN A/B/C
========================================================= */

const getOptionLetter = (
  selectedOption
) => {
  const candidates = [
    selectedOption
      ?.option?.codigo,

    selectedOption
      ?.codigo,

    selectedOption
      ?.option?.texto,
  ];

  for (
    const candidate of
    candidates
  ) {
    if (!candidate) {
      continue;
    }

    const value =
      String(candidate)
        .trim()
        .toUpperCase();

    const match =
      value.match(
        /^[ABC]/
      );

    if (match) {
      return match[0];
    }
  }

  return null;
};

/* =========================================================
   CATEGORÍA DE OPCIÓN
========================================================= */

const getOptionCategory = (
  selectedOption
) => {
  return normalizeCode(
    selectedOption
      ?.categoriaResultado ||
    selectedOption
      ?.option
      ?.categoriaResultado ||
    selectedOption
      ?.option?.codigo
  );
};

/* =========================================================
   AGRUPAR RESPUESTAS POR SECCIÓN
========================================================= */

const groupAnswersBySection = (
  answers = []
) => {
  const grouped = {};

  for (
    const answer of
    answers
  ) {
    const sectionCode =
      normalizeCode(
        answer?.question
          ?.section?.codigo
      ).toLowerCase();

    if (!sectionCode) {
      continue;
    }

    if (
      !grouped[
      sectionCode
      ]
    ) {
      grouped[
        sectionCode
      ] = [];
    }

    grouped[
      sectionCode
    ].push(
      answer
    );
  }

  Object.values(
    grouped
  ).forEach(
    (
      sectionAnswers
    ) => {
      sectionAnswers.sort(
        (a, b) =>
          getQuestionOrder(
            a
          ) -
          getQuestionOrder(
            b
          )
      );
    }
  );

  return grouped;
};

/* =========================================================
   ANIMODO
   BASE!GC:GE

   GC =
   J + L + N + P + R + T + V

   GD =
   K + M + O + Q + S + U + W

   En nuestra sección:
   impares -> GC
   pares   -> GD
========================================================= */

const calculateAnimodo = (
  answers = []
) => {
  let sentirPensar = 0;
  let actuarObservar =
    0;

  let sentirPensarQuestions =
    0;

  let actuarObservarQuestions =
    0;

  for (
    const answer of
    answers
  ) {
    const order =
      getQuestionOrder(
        answer
      );

    const value =
      toNumber(
        answer
          ?.valorNumerico,
        0
      );

    if (
      !order ||
      value <= 0
    ) {
      continue;
    }

    /*
     * Preguntas 1,3,5...
     * equivalen a:
     * J,L,N,P,R,T,V
     */
    if (
      order % 2 !==
      0
    ) {
      sentirPensar +=
        value;

      sentirPensarQuestions +=
        1;
    } else {
      /*
       * Preguntas 2,4,6...
       * equivalen a:
       * K,M,O,Q,S,U,W
       */
      actuarObservar +=
        value;

      actuarObservarQuestions +=
        1;
    }
  }

  const animal =
    determineAnimodoAnimal({
      sentirPensar,
      actuarObservar,
    });

  return {
    codigo:
      SECTION_CODES
        .ANIMODO,

    /*
     * Estos dos son exactamente
     * GC y GD del Excel.
     */
    axes: {
      sentirPensar,
      actuarObservar,
    },

    rawTotals: {
      sentirPensar,
      actuarObservar,

      sentirPensarQuestions,
      actuarObservarQuestions,
    },

    /*
     * Se conserva para compatibilidad
     * con cualquier frontend previo.
     */
    scores: {
      SENTIR_PENSAR:
        sentirPensar,

      ACTUAR_OBSERVAR:
        actuarObservar,
    },

    animal,

    /*
     * Usado únicamente para buscar
     * la personalidad/imagen.
     *
     * Las zonas intermedias del Excel
     * se representan como CAMALEÓN
     * dentro de las 60 personalidades.
     */
    personalityAnimal:
      getPersonalityAnimal(
        animal
      ),
  };
};

/* =========================================================
   DETERMINAR ANIMODO
   FÓRMULA EXACTA DIAG.FINAL / BASE!GE
========================================================= */

const determineAnimodoAnimal = ({
  sentirPensar,
  actuarObservar,
}) => {
  const gc =
    toNumber(
      sentirPensar
    );

  const gd =
    toNumber(
      actuarObservar
    );

  /*
   * DELFIN
   */
  if (
    gd >= 6 &&
    gd <= 21 &&
    gc >= 6 &&
    gc <= 21
  ) {
    return "DELFIN";
  }

  /*
   * CASTOR
   */
  if (
    gd >= 27 &&
    gd <= 42 &&
    gc >= 27 &&
    gc <= 42
  ) {
    return "CASTOR";
  }

  /*
   * BUHO
   */
  if (
    gd <= 21 &&
    gc >= 27
  ) {
    return "BUHO";
  }

  /*
   * ABEJA
   */
  if (
    gd >= 27 &&
    gc <= 21
  ) {
    return "ABEJA";
  }

  /*
   * ENTRE DELFIN Y BUHO
   */
  if (
    gd <= 21 &&
    gc >= 22 &&
    gc <= 26
  ) {
    return (
      "ENTRE DELFIN Y BUHO"
    );
  }

  /*
   * ENTRE ABEJA Y CASTOR
   */
  if (
    gd >= 27 &&
    gc >= 22 &&
    gc <= 26
  ) {
    return (
      "ENTRE ABEJA Y CASTOR"
    );
  }

  /*
   * ENTRE ABEJA Y DELFIN
   */
  if (
    gc <= 21 &&
    gd >= 22 &&
    gd <= 26
  ) {
    return (
      "ENTRE ABEJA Y DELFIN"
    );
  }

  /*
   * ENTRE CASTOR Y BUHO
   */
  if (
    gc >= 27 &&
    gd >= 22 &&
    gd <= 26
  ) {
    return (
      "ENTRE CASTOR Y BUHO"
    );
  }

  /*
   * CAMALEÓN
   */
  if (
    gc >= 22 &&
    gc <= 26 &&
    gd >= 22 &&
    gd <= 26
  ) {
    return "CAMALEON";
  }

  return null;
};

/* =========================================================
   ANIMAL PARA LAS 60 PERSONALIDADES

   5 animales x 3 colores cabeza x 4 colores pecho = 60

   Las cuatro zonas "ENTRE..." se consideran
   CAMALEÓN para seleccionar la imagen/perfil,
   pero el resultado ANIMODO conserva el texto
   exacto del Excel.
========================================================= */

const getPersonalityAnimal = (
  animal
) => {
  const normalized =
    normalizeCode(
      animal
    );

  if (
    [
      "ABEJA",
      "CASTOR",
      "BUHO",
      "DELFIN",
    ].includes(
      normalized
    )
  ) {
    return normalized;
  }

  if (
    normalized ===
    "CAMALEON" ||
    normalized.startsWith(
      "ENTRE_"
    )
  ) {
    return "CAMALEON";
  }

  return null;
};

/* =========================================================
   COMUNICACIÓN
   BASE!X:DG -> GG:GK

   Por cada pregunta:
   prioridad 1 = 3
   prioridad 2 = 1
   no seleccionada = 0

   Columnas:
   opción 1 = AMARILLO
   opción 2 = ROJO
   opción 3 = AZUL
   opción 4 = VERDE
========================================================= */

const getCommunicationCategory = (
  selected
) => {
  const configured =
    normalizeCode(
      selected
        ?.categoriaResultado ||
      selected?.option
        ?.categoriaResultado
    );

  if (
    [
      "AMARILLO",
      "ROJO",
      "AZUL",
      "VERDE",
    ].includes(
      configured
    )
  ) {
    return configured;
  }

  /*
   * Fallback por orden,
   * exactamente como X,Y,Z,AA
   * de cada grupo del Excel.
   */
  const optionOrder =
    toNumber(
      selected?.option
        ?.orden,
      0
    );

  const byOrder = {
    1: "AMARILLO",
    2: "ROJO",
    3: "AZUL",
    4: "VERDE",
  };

  return (
    byOrder[
    optionOrder
    ] || null
  );
};

const getCommunicationScore = (
  selected
) => {
  const priority =
    toNumber(
      selected?.prioridad,
      0
    );

  if (
    priority === 1
  ) {
    return 3;
  }

  if (
    priority === 2
  ) {
    return 1;
  }

  /*
   * Fallback por si alguna respuesta
   * antigua no tiene prioridad.
   */
  if (
    selected
      ?.puntajeAplicado !==
    null &&
    selected
      ?.puntajeAplicado !==
    undefined
  ) {
    return toNumber(
      selected
        .puntajeAplicado
    );
  }

  return 0;
};

const calculateCommunicationColors = (
  answers = []
) => {
  const scores = {
    AMARILLO: 0,
    ROJO: 0,
    AZUL: 0,
    VERDE: 0,
  };

  for (
    const answer of
    answers
  ) {
    const selectedOptions =
      [
        ...getSelectedOptions(
          answer
        ),
      ].sort(
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
      selectedOptions
    ) {
      const category =
        getCommunicationCategory(
          selected
        );

      const score =
        getCommunicationScore(
          selected
        );

      if (
        !category ||
        !Object.prototype
          .hasOwnProperty.call(
            scores,
            category
          )
      ) {
        continue;
      }

      scores[
        category
      ] += score;
    }
  }

  const result =
    getWinners(
      scores,
      [
        "AMARILLO",
        "ROJO",
        "AZUL",
        "VERDE",
      ]
    );

  const dominantColor =
    result.winner;

  const communicationType =
    dominantColor
      ? COMMUNICATION_TYPES[
      dominantColor
      ]
      : null;

  return {
    codigo:
      SECTION_CODES
        .COMUNICACION,

    /*
     * Sumas reales X:DG
     */
    scores,

    /*
     * Equivalente decimal a GG:GJ.
     * Ejemplo:
     * 0.215909...
     */
    proportions:
      calculateProportions(
        scores
      ),

    /*
     * Lo mismo expresado como porcentaje
     * para el frontend:
     * 21.59, 12.5, etc.
     */
    percentages:
      calculatePercentages(
        scores
      ),

    dominantColor,

    /*
     * Equivalente a GK:
     * 1 Amarillo
     * 2 Rojo
     * 3 Azul
     * 4 Verde
     */
    valuation:
      result.winnerIndex,

    communicationType,

    tied:
      result.tied,

    tiedCategories:
      result.winners,
  };
};

/* =========================================================
   TIPOS DE CEREBRO
   BASE!DH:ED -> GL:GO
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
    IZQUIERDO: 0,
    CENTRAL: 0,
    DERECHO: 0,
  };

  for (
    const answer of
    answers
  ) {
    const order =
      getQuestionOrder(
        answer
      );

    const value =
      toNumber(
        answer
          ?.valorNumerico,
        0
      );

    if (
      !order ||
      value <= 0
    ) {
      continue;
    }

    const category =
      getBrainCategoryByOrder(
        order
      );

    if (!category) {
      continue;
    }

    scores[
      category
    ] += value;
  }

  /*
   * Orden exacto GL, GM, GN.
   *
   * Si existe empate Excel devuelve
   * la primera coincidencia.
   */
  const result =
    getWinners(
      scores,
      [
        "IZQUIERDO",
        "CENTRAL",
        "DERECHO",
      ]
    );

  const brainCategory =
    result.winner;

  const brainType =
    brainCategory
      ? BRAIN_TYPE_LABELS[
      brainCategory
      ]
      : null;

  const headColor =
    brainCategory
      ? BRAIN_TO_HEAD_COLOR[
      brainCategory
      ]
      : null;

  return {
    codigo:
      SECTION_CODES
        .CEREBRO,

    /*
     * Exactamente GL, GM, GN
     */
    scores,

    /*
     * Se mantiene para gráficas.
     * DIAG.FINAL usa scores.
     */
    percentages:
      calculatePercentages(
        scores
      ),

    brainCategory,

    brainType,

    /*
     * Equivalente a GO:
     * 1 Izquierdo
     * 2 Central
     * 3 Derecho
     */
    valuation:
      result.winnerIndex,

    headColor,

    tied:
      result.tied,

    tiedCategories:
      result.winners,
  };
};

/* =========================================================
   FORMA NEGOCIADORA
   BASE!JD:KG -> GP:GQ:GR
========================================================= */

const getNegotiationQuality = (
  score
) => {
  const value =
    toNumber(
      score
    );

  if (
    value >= 30 &&
    value <= 60
  ) {
    return (
      "Aparentemente no eres confiable para negociaciones complicadas"
    );
  }

  if (
    value > 60 &&
    value <= 65
  ) {
    return (
      "La verdad no eres confiable como negociador"
    );
  }

  if (
    value > 65 &&
    value <= 70
  ) {
    return (
      "Francamente eres un Negociador “mediocre”"
    );
  }

  if (
    value > 70 &&
    value <= 75
  ) {
    return (
      "Mas que negociador, eres “manipulador”"
    );
  }

  if (
    value > 75 &&
    value <= 80
  ) {
    return (
      "Eres un negociador “de ocasion”"
    );
  }

  if (
    value > 80 &&
    value <= 85
  ) {
    return (
      "Generalmente eres buen Negociador"
    );
  }

  if (
    value > 85 &&
    value <= 90
  ) {
    return (
      "Generalmente eres buen Negociador"
    );
  }

  return null;
};

const classifyNegotiationScore = (
  score
) => {
  const value =
    toNumber(
      score
    );

  /*
   * Fórmula exacta BASE!GQ.
   */
  if (
    value >= 30 &&
    value <= 70
  ) {
    return "BAJO";
  }

  if (
    value > 70 &&
    value <= 80
  ) {
    return "MEDIO";
  }

  if (
    value > 80 &&
    value <= 90
  ) {
    return "ALTO";
  }

  return null;
};

const calculateNegotiation = (
  answers = []
) => {
  let totalScore = 0;

  const detail = [];

  for (
    const answer of
    answers
  ) {
    const order =
      getQuestionOrder(
        answer
      );

    if (!order) {
      continue;
    }

    const selected =
      getSelectedOptions(
        answer
      )[0];

    if (!selected) {
      /*
       * Compatibilidad con respuestas
       * donde ya esté almacenado
       * puntajeCalculado.
       */
      const existingScore =
        toNumber(
          answer
            ?.puntajeCalculado,
          0
        );

      totalScore +=
        existingScore;

      detail.push({
        questionOrder:
          order,

        option:
          null,

        score:
          existingScore,
      });

      continue;
    }

    const letter =
      getOptionLetter(
        selected
      );

    const questionMap =
      NEGOTIATION_SCORE_MAP[
      order
      ];

    const score =
      questionMap &&
        letter
        ? toNumber(
          questionMap[
          letter
          ],
          0
        )
        : 0;

    totalScore += score;

    detail.push({
      questionOrder:
        order,

      option:
        letter,

      score,
    });
  }

  const classification =
    classifyNegotiationScore(
      totalScore
    );

  const quality =
    getNegotiationQuality(
      totalScore
    );

  return {
    codigo:
      SECTION_CODES
        .NEGOCIACION,

    /*
     * Exactamente GP
     */
    totalScore:
      round(
        totalScore,
        0
      ),

    /*
     * Exactamente GQ
     */
    classification,

    /*
     * Exactamente GR
     */
    quality,

    detail,
  };
};

/* =========================================================
   VAK
   BASE!KH:KS -> GS:GV
========================================================= */

const calculateVak = (
  answers = []
) => {
  const scores = {
    VISUAL: 0,
    AUDITIVO: 0,
    KINESTESICO: 0,
  };

  const detail = [];

  for (
    const answer of
    answers
  ) {
    const order =
      getQuestionOrder(
        answer
      );

    if (!order) {
      continue;
    }

    const selected =
      getSelectedOptions(
        answer
      )[0];

    if (!selected) {
      continue;
    }

    const letter =
      getOptionLetter(
        selected
      );

    const questionMap =
      VAK_SCORE_MAP[
      order
      ];

    let category =
      questionMap &&
        letter
        ? questionMap[
        letter
        ]
        : null;

    /*
     * Fallback si las opciones
     * ya tienen categoriaResultado.
     */
    if (!category) {
      const configured =
        getOptionCategory(
          selected
        );

      if (
        [
          "VISUAL",
          "AUDITIVO",
          "KINESTESICO",
        ].includes(
          configured
        )
      ) {
        category =
          configured;
      }
    }

    if (!category) {
      continue;
    }

    /*
     * COUNTIF del Excel.
     * Cada respuesta suma UNO,
     * no puntaje de opción.
     */
    scores[
      category
    ] += 1;

    detail.push({
      questionOrder:
        order,

      option:
        letter,

      category,
    });
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

    /*
     * Exactamente GS, GT, GU.
     *
     * Ejemplo:
     * VISUAL = 3
     * AUDITIVO = 1
     * KINESTESICO = 8
     */
    scores,

    percentages:
      calculatePercentages(
        scores
      ),

    dominantStyle:
      result.winner,

    /*
     * Equivalente GV:
     * 1 Visual
     * 2 Auditivo
     * 3 Kinestésico
     */
    valuation:
      result.winnerIndex,

    tied:
      result.tied,

    tiedCategories:
      result.winners,

    detail,
  };
};

/* =========================================================
   PERSISTENCIA
   BASE!GX:HC

   GX = ANIMODO
   GY = COMUNICACIÓN
   GZ = CEREBRO
   HA = NEGOCIACIÓN

   HB = cantidad de valores = 1

   HC:
   0 = ALERTA
   1 = NO
   2 = NO
   3 = SI
   4 = SI
========================================================= */

const calculatePersistence = ({
  animodo,
  communication,
  brain,
  negotiation,
}) => {
  /* =====================================================
     GX - ANIMODO
  ===================================================== */

  const animal =
    normalizeCode(
      animodo?.animal
    );

  let animodoValue = 0;

  if (
    [
      "ABEJA",
      "CASTOR",
      "BUHO",
    ].includes(
      animal
    )
  ) {
    animodoValue = 1;
  }

  /*
   * DELFIN,
   * CAMALEON
   * y todos los ENTRE...
   * = 0
   */

  /* =====================================================
     GY - COMUNICACIÓN

     GK:
     1 AMARILLO -> 1
     2 ROJO     -> 1
     3 AZUL     -> 0
     4 VERDE    -> 1
  ===================================================== */

  const communicationValue =
    [1, 2, 4].includes(
      toNumber(
        communication
          ?.valuation
      )
    )
      ? 1
      : 0;

  /* =====================================================
     GZ - CEREBRO

     GO:
     1 IZQUIERDO -> 1
     2 CENTRAL   -> 1
     3 DERECHO   -> 0
  ===================================================== */

  const brainValue =
    [1, 2].includes(
      toNumber(
        brain
          ?.valuation
      )
    )
      ? 1
      : 0;

  /* =====================================================
     HA - NEGOCIACIÓN

     ALTO  = 1
     MEDIO = 1
     BAJO  = 0
  ===================================================== */

  const negotiationValue =
    [
      "ALTO",
      "MEDIO",
    ].includes(
      normalizeCode(
        negotiation
          ?.classification
      )
    )
      ? 1
      : 0;

  const indicators = {
    animodo:
      animodoValue,

    communication:
      communicationValue,

    brain:
      brainValue,

    negotiation:
      negotiationValue,
  };

  /*
   * HB = COUNTIF(GX:HA,1)
   */
  const score =
    Object.values(
      indicators
    ).filter(
      (value) =>
        value === 1
    ).length;

  /*
   * HC
   */
  let level = null;

  if (
    score === 0
  ) {
    level = "ALERTA";
  } else if (
    score === 1 ||
    score === 2
  ) {
    level = "NO";
  } else if (
    score === 3 ||
    score === 4
  ) {
    level = "SI";
  }

  return {
    /*
     * HB
     */
    score,

    /*
     * HC
     */
    level,

    /*
     * GX:HA
     */
    indicators,

    /*
     * Se mantiene para compatibilidad
     * con el frontend anterior.
     */
    factors:
      Object.entries(
        indicators
      )
        .filter(
          ([
            ,
            value,
          ]) =>
            value === 1
        )
        .map(
          ([
            key,
          ]) =>
            key
              .toUpperCase()
        ),
  };
};


/* =========================================================
   ÍNDICE DE PRODUCTIVIDAD PERSONAL
========================================================= */

const calculateProductivityIndex = ({
  animodo,
  communication,
  brain,
  negotiation,
  vak,
  persistence,
}) => {
  /*
   * Normalizamos los textos para soportar:
   * CAMALEÓN / CAMALEON
   * BÚHO / BUHO
   * KINESTÉSICO / KINESTESICO
   */
  const normalize = (value) =>
    String(value || "")
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  /* =====================================================
     RESULTADOS OBTENIDOS
  ===================================================== */

  const persistenceResult =
    normalize(
      persistence?.level
    );

  const communicationResult =
    normalize(
      communication?.dominantColor
    );

  const animodoResult =
    normalize(
      animodo?.animal
    );

  const brainResult =
    normalize(
      brain?.brainCategory
    );

  const negotiationResult =
    normalize(
      negotiation?.classification
    );

  const vakResult =
    normalize(
      vak?.dominantStyle
    );

  /* =====================================================
     TABLAS DE VALORACIÓN
     Según Índice de Productividad Personal del Excel
  ===================================================== */

  const persistenceValues = {
    SI: 1,
    NO: 0.5,

    /*
     * Tu sistema puede producir ALERTA.
     * Se conserva con valoración mínima.
     */
    ALERTA: 0.5,
  };

  const communicationValues = {
    AMARILLO: 1,
    ROJO: 1,
    AZUL: 1,
    VERDE: 1,
  };

  const animodoValues = {
    DELFIN: 0.5,
    ABEJA: 1,
    CASTOR: 1,
    BUHO: 1,
    CAMALEON: 0.5,
  };

  const brainValues = {
    DERECHO: 0.5,
    CENTRAL: 1,
    IZQUIERDO: 0.5,
  };

  const negotiationValues = {
    ALTO: 1.5,
    MEDIO: 1,
    BAJO: 0.5,
  };

  const vakValues = {
    VISUAL: 0.5,
    AUDITIVO: 0.5,
    KINESTESICO: 0.5,
  };

  /* =====================================================
     OBTENER VALORES
  ===================================================== */

  const persistenceValue =
    persistenceValues[
    persistenceResult
    ] ?? 0;

  const communicationValue =
    communicationValues[
    communicationResult
    ] ?? 0;

  /*
   * Animodo puede tener casos como:
   *
   * ENTRE CASTOR Y ABEJA
   * ENTRE DELFIN Y CAMALEON
   *
   * Si no existe coincidencia directa,
   * mantenemos valoración mínima 0.5.
   */
  let animodoValue =
    animodoValues[
    animodoResult
    ];

  if (
    animodoValue ===
    undefined &&
    animodoResult.startsWith(
      "ENTRE "
    )
  ) {
    animodoValue = 0.5;
  }

  animodoValue ??= 0;

  const brainValue =
    brainValues[
    brainResult
    ] ?? 0;

  const negotiationValue =
    negotiationValues[
    negotiationResult
    ] ?? 0;

  const vakValue =
    vakValues[
    vakResult
    ] ?? 0;

  /* =====================================================
     SUMA DEL ÍNDICE
  ===================================================== */

  const score =
    persistenceValue +
    communicationValue +
    animodoValue +
    brainValue +
    negotiationValue +
    vakValue;

  /*
   * Evitamos errores de punto flotante.
   */
  const roundedScore =
    Number(
      score.toFixed(2)
    );

  /* =====================================================
     CLASIFICACIÓN
  ===================================================== */

  let classification = "F";
  let factor = 0.566;

  if (
    roundedScore >= 6
  ) {
    classification = "A";
    factor = 1;
  } else if (
    roundedScore >= 5.5
  ) {
    classification = "B";
    factor = 0.916;
  } else if (
    roundedScore >= 5
  ) {
    classification = "C";
    factor = 0.83;
  } else if (
    roundedScore >= 4.5
  ) {
    classification = "D";
    factor = 0.75;
  } else if (
    roundedScore >= 4
  ) {
    classification = "E";
    factor = 0.666;
  }

  const percentage =
    Number(
      (
        factor * 100
      ).toFixed(1)
    );

  /* =====================================================
     DETALLE
  ===================================================== */

  const detail = {
    persistence: {
      result:
        persistenceResult,
      value:
        persistenceValue,
    },

    communication: {
      result:
        communicationResult,
      value:
        communicationValue,
    },

    animodo: {
      result:
        animodoResult,
      value:
        animodoValue,
    },

    brain: {
      result:
        brainResult,
      value:
        brainValue,
    },

    negotiation: {
      result:
        negotiationResult,
      value:
        negotiationValue,
    },

    vak: {
      result:
        vakResult,
      value:
        vakValue,
    },
  };

  /* =====================================================
     LOG TEMPORAL PARA COMPARAR CON EXCEL
  ===================================================== */

  console.log(
    "=============================================="
  );

  console.log(
    "ÍNDICE DE PRODUCTIVIDAD PERSONAL"
  );

  console.log(
    "Persistencia:",
    persistenceResult,
    persistenceValue
  );

  console.log(
    "Comunicación:",
    communicationResult,
    communicationValue
  );

  console.log(
    "Animodo:",
    animodoResult,
    animodoValue
  );

  console.log(
    "Cerebro:",
    brainResult,
    brainValue
  );

  console.log(
    "Negociación:",
    negotiationResult,
    negotiationValue
  );

  console.log(
    "VAK:",
    vakResult,
    vakValue
  );

  console.log(
    "----------------------------------------------"
  );

  console.log(
    "PUNTAJE:",
    roundedScore
  );

  console.log(
    "CLASIFICACIÓN:",
    classification
  );

  console.log(
    "FACTOR:",
    factor
  );

  console.log(
    "PORCENTAJE:",
    percentage
  );

  console.log(
    "=============================================="
  );

  /* =====================================================
     RESULTADO
  ===================================================== */

  return {
    codigo:
      "indice_productividad_personal",

    score:
      roundedScore,

    maxScore: 6,

    classification,

    factor,

    percentage,

    detail,
  };
};




/* =========================================================
   BUSCAR PERSONALIDAD

   Combinación:
   ANIMAL
   COLOR CABEZA
   COLOR PECHO
========================================================= */

const findPersonality = async ({
  animal,
  headColor,
  chestColor,
  transaction,
}) => {
  const normalizedAnimal =
    normalizeCode(
      animal
    );

  const normalizedHead =
    normalizeCode(
      headColor
    );

  const normalizedChest =
    normalizeCode(
      chestColor
    );

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
      (
        personality
      ) =>
        normalizeCode(
          personality
            .animal
        ) ===
        normalizedAnimal &&
        normalizeCode(
          personality
            .colorCabeza
        ) ===
        normalizedHead &&
        normalizeCode(
          personality
            .colorPecho
        ) ===
        normalizedChest
    ) || null
  );
};

/* =========================================================
   VALIDAR RESPUESTAS OBLIGATORIAS
========================================================= */

const validateRequiredAnswers =
  async ({
    evaluation,
    answers,
    transaction,
  }) => {
    const requiredQuestions =
      await PsychometricQuestion.findAll({
        where: {
          obligatoria:
            true,

          activo:
            true,
        },

        include: [
          {
            model:
              PsychometricSection,

            as:
              "section",

            where: {
              testId:
                evaluation
                  .testId,

              activo:
                true,
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
          (
            answer
          ) => [
              String(
                answer
                  .questionId
              ),

              answer,
            ]
        )
      );

    const missingQuestions =
      [];

    for (
      const question of
      requiredQuestions
    ) {
      const answer =
        answerByQuestion.get(
          String(
            question.id
          )
        );

      if (!answer) {
        missingQuestions.push({
          id:
            question.id,

          pregunta:
            question
              .pregunta,

          tipoRespuesta:
            question
              .tipoRespuesta,

          motivo:
            "SIN_RESPUESTA",
        });

        continue;
      }

      /* ===================================================
         ESCALAS
      =================================================== */

      if (
        [
          "escala_bipolar",
          "escala_1_5",
        ].includes(
          question
            .tipoRespuesta
        )
      ) {
        const hasNumeric =
          answer
            .valorNumerico !==
          null &&
          answer
            .valorNumerico !==
          undefined &&
          answer
            .valorNumerico !==
          "";

        if (
          !hasNumeric
        ) {
          missingQuestions.push({
            id:
              question.id,

            pregunta:
              question
                .pregunta,

            tipoRespuesta:
              question
                .tipoRespuesta,

            motivo:
              "SIN_VALOR_NUMERICO",
          });
        }

        continue;
      }

      /* ===================================================
         OPCIONES
      =================================================== */

      if (
        [
          "seleccion_unica",
          "seleccion_ponderada",
        ].includes(
          question
            .tipoRespuesta
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
          selectedCount <
          minimum ||
          selectedCount >
          maximum
        ) {
          missingQuestions.push({
            id:
              question.id,

            pregunta:
              question
                .pregunta,

            tipoRespuesta:
              question
                .tipoRespuesta,

            motivo:
              "CANTIDAD_OPCIONES_INVALIDA",

            seleccionadas:
              selectedCount,

            minimo:
              minimum,

            maximo:
              maximum,
          });
        }
      }
    }

    return {
      valid:
        missingQuestions
          .length === 0,

      totalRequired:
        requiredQuestions
          .length,

      totalAnswered:
        requiredQuestions
          .length -
        missingQuestions
          .length,

      missingQuestions,
    };
  };

/* =========================================================
   CARGAR EVALUACIÓN COMPLETA
========================================================= */

const loadEvaluationForScoring =
  async ({
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

            as:
              "answers",

            include: [
              {
                model:
                  PsychometricQuestion,

                as:
                  "question",

                include: [
                  {
                    model:
                      PsychometricSection,

                    as:
                      "section",
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

                    as:
                      "option",
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

const calculateCompleteResult =
  async ({
    evaluationId,
    transaction,
  }) => {
    /* =====================================================
       1. CARGAR EVALUACIÓN
    ===================================================== */

    const evaluation =
      await loadEvaluationForScoring({
        evaluationId,
        transaction,
      });

    if (!evaluation) {
      const error =
        new Error(
          "La evaluación no existe."
        );

      error.statusCode =
        404;

      throw error;
    }

    const answers =
      evaluation.answers ||
      [];

    /* =====================================================
       2. VALIDAR RESPUESTAS
    ===================================================== */

    const validation =
      await validateRequiredAnswers({
        evaluation,
        answers,
        transaction,
      });

    if (
      !validation.valid
    ) {
      const error =
        new Error(
          `Faltan o están incompletas ${validation.missingQuestions.length} preguntas obligatorias.`
        );

      error.statusCode =
        422;

      error.details =
        validation;

      throw error;
    }

    /* =====================================================
       3. AGRUPAR POR SECCIÓN
    ===================================================== */

    const grouped =
      groupAnswersBySection(
        answers
      );

    /* =====================================================
       4. ANIMODO
    ===================================================== */

    const animodo =
      calculateAnimodo(
        grouped[
        SECTION_CODES
          .ANIMODO
        ] || []
      );

    /* =====================================================
       5. COMUNICACIÓN
    ===================================================== */

    const communication =
      calculateCommunicationColors(
        grouped[
        SECTION_CODES
          .COMUNICACION
        ] || []
      );

    /* =====================================================
       6. TIPO DE CEREBRO
    ===================================================== */

    const brain =
      calculateBrainTypes(
        grouped[
        SECTION_CODES
          .CEREBRO
        ] || []
      );

    /* =====================================================
       7. NEGOCIACIÓN
    ===================================================== */

    const negotiation =
      calculateNegotiation(
        grouped[
        SECTION_CODES
          .NEGOCIACION
        ] || []
      );

    /* =====================================================
       8. VAK
    ===================================================== */

    const vak =
      calculateVak(
        grouped[
        SECTION_CODES
          .VAK
        ] || []
      );

    /* =====================================================
       9. PERSISTENCIA
    ===================================================== */

    const persistence =
      calculatePersistence({
        animodo,
        communication,
        brain,
        negotiation,
      });

    const productivityIndex =
      calculateProductivityIndex({
        animodo,
        communication,
        brain,
        negotiation,
        vak,
        persistence,
      });

    /* =====================================================
       10. LOG DE COMPARACIÓN CON EXCEL
    ===================================================== */

    console.log(
      "=============================================="
    );

    console.log(
      "RESULTADO PSICOMÉTRICO - FÓRMULAS EXCEL"
    );

    console.log(
      "----------------------------------------------"
    );

    console.log(
      "ANIMODO GC - SENTIR/PENSAR:",
      animodo.axes
        .sentirPensar
    );

    console.log(
      "ANIMODO GD - ACTUAR/OBSERVAR:",
      animodo.axes
        .actuarObservar
    );

    console.log(
      "ANIMODO GE:",
      animodo.animal
    );

    console.log(
      "----------------------------------------------"
    );

    console.log(
      "COMUNICACIÓN GG:GJ:",
      communication
        .proportions
    );

    console.log(
      "COMUNICACIÓN GK:",
      communication
        .valuation
    );

    console.log(
      "COLOR DOMINANTE:",
      communication
        .dominantColor
    );

    console.log(
      "----------------------------------------------"
    );

    console.log(
      "CEREBRO GL:GN:",
      brain.scores
    );

    console.log(
      "CEREBRO GO:",
      brain.valuation
    );

    console.log(
      "TIPO CEREBRO:",
      brain.brainType
    );

    console.log(
      "COLOR CABEZA:",
      brain.headColor
    );

    console.log(
      "----------------------------------------------"
    );

    console.log(
      "NEGOCIACIÓN GP:",
      negotiation
        .totalScore
    );

    console.log(
      "NEGOCIACIÓN GQ:",
      negotiation
        .classification
    );

    console.log(
      "NEGOCIACIÓN GR:",
      negotiation
        .quality
    );

    console.log(
      "----------------------------------------------"
    );

    console.log(
      "VAK GS:GU:",
      vak.scores
    );

    console.log(
      "VAK GV:",
      vak.valuation
    );

    console.log(
      "VAK DOMINANTE:",
      vak.dominantStyle
    );

    console.log(
      "----------------------------------------------"
    );

    console.log(
      "PERSISTENCIA GX:HA:",
      persistence
        .indicators
    );

    console.log(
      "PERSISTENCIA HB:",
      persistence.score
    );

    console.log(
      "PERSISTENCIA HC:",
      persistence.level
    );

    console.log(
      "=============================================="
    );

    /* =====================================================
       11. VALIDAR COMPONENTES PERSONALIDAD
    ===================================================== */

    const personalityAnimal =
      animodo
        .personalityAnimal;

    if (
      !personalityAnimal ||
      !brain.headColor ||
      !communication
        .dominantColor
    ) {
      const error =
        new Error(
          "No se pudieron determinar todos los componentes de la personalidad."
        );

      error.statusCode =
        422;

      error.details = {
        animodo:
          animodo.animal,

        personalityAnimal,

        sentirPensar:
          animodo.axes
            .sentirPensar,

        actuarObservar:
          animodo.axes
            .actuarObservar,

        tipoCerebro:
          brain.brainType,

        categoriaCerebro:
          brain.brainCategory,

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

    /* =====================================================
       12. BUSCAR PERSONALIDAD
    ===================================================== */

    const personality =
      await findPersonality({
        animal:
          personalityAnimal,

        headColor:
          brain.headColor,

        chestColor:
          communication
            .dominantColor,

        transaction,
      });

    if (!personality) {
      const error =
        new Error(
          "No existe una personalidad activa para la combinación calculada."
        );

      error.statusCode =
        422;

      error.details = {
        /*
         * Resultado real Excel.
         */
        resultadoAnimodo:
          animodo.animal,

        /*
         * Animal usado para las
         * 60 personalidades.
         */
        animalPersonalidad:
          personalityAnimal,

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

    /* =====================================================
       13. PUNTAJE INTERNO

       Se conserva porque tu modelo evaluation
       actualmente utiliza puntajeTotal.

       NO se utiliza para determinar DIAG.FINAL.
    ===================================================== */

    const totalScore =
      round(
        sumObjectValues(
          communication
            .scores
        ) +
        sumObjectValues(
          brain.scores
        ) +
        negotiation
          .totalScore +
        sumObjectValues(
          vak.scores
        ),
        2
      );

    /* =====================================================
       14. RESULTADO
    ===================================================== */

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

        /* ===============================================
           DIAGNÓSTICO
        =============================================== */

        animodo,

        communication,

        brain,

        negotiation,

        vak,

        persistence,

        productivityIndex,

        /* ===============================================
           PERSONALIDAD
        =============================================== */

        personality: {
          id:
            personality.id,

          numero:
            personality.numero,

          codigo:
            personality.codigo,

          nombre:
            personality.nombre,

          /*
           * Resultado del registro
           * de personalidad.
           */
          animal:
            personality.animal,

          /*
           * Resultado real ANIMODO
           * proveniente del Excel.
           *
           * Puede ser:
           * ENTRE ABEJA Y DELFIN,
           * etc.
           */
          resultadoAnimodo:
            animodo.animal,

          colorCabeza:
            personality
              .colorCabeza,

          /*
           * Mostramos el tipo real
           * calculado por GL:GN.
           */
          tipoCerebro:
            brain.brainType,

          categoriaCerebro:
            brain.brainCategory,

          colorPecho:
            personality
              .colorPecho,

          tipoComunicacion:
            personality
              .tipoComunicacion,

          imagenUrl:
            personality
              .imagenUrl,

          descripcion:
            personality
              .descripcion,

          formaPensar:
            personality
              .formaPensar,

          formaAprender:
            personality
              .formaAprender,

          descripcionComunicacion:
            personality
              .descripcionComunicacion,
        },
      },
    };
  };

/* =========================================================
   EXPORTACIONES
========================================================= */

module.exports = {
  /* ===========================
     ANIMODO
  =========================== */

  calculateAnimodo,

  determineAnimodoAnimal,

  getPersonalityAnimal,

  /* ===========================
     COMUNICACIÓN
  =========================== */

  calculateCommunicationColors,

  /* ===========================
     CEREBRO
  =========================== */

  calculateBrainTypes,

  /* ===========================
     NEGOCIACIÓN
  =========================== */

  calculateNegotiation,

  /* ===========================
     VAK
  =========================== */

  calculateVak,

  /* ===========================
     PERSISTENCIA
  =========================== */

  calculatePersistence,

  /* ===========================
     PERSONALIDAD
  =========================== */

  findPersonality,

  /* ===========================
     VALIDACIÓN / CARGA
  =========================== */

  validateRequiredAnswers,

  loadEvaluationForScoring,

  /* ===========================
     RESULTADO COMPLETO
  =========================== */

  calculateCompleteResult,
};