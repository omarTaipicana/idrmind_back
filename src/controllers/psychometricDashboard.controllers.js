const {
  Op,
} = require("sequelize");

const catchError = require(
  "../utils/catchError"
);

/* =========================================================
   MODELOS
========================================================= */

const PsychometricEvaluation = require(
  "../models/PsychometricEvaluation"
);

const PsychometricTest = require(
  "../models/PsychometricTest"
);

const Course = require(
  "../models/Course"
);

const Pagos = require(
  "../models/Pagos"
);

/* =========================================================
   CONSTANTES
========================================================= */

const VALID_STATES = [
  "pendiente_pago",
  "pago_validado",
  "habilitada",
  "en_progreso",
  "completada",
  "anulada",
];

const VALID_PARTICIPANT_TYPES = [
  "empresa",
  "individual",
];

/* =========================================================
   UTILIDADES GENERALES
========================================================= */

const toNumber = (
  value,
  fallback = 0
) => {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : fallback;
};

const roundMoney = (
  value
) => {
  return Number(
    toNumber(
      value
    ).toFixed(2)
  );
};

const roundPercentage = (
  value
) => {
  return Number(
    toNumber(
      value
    ).toFixed(2)
  );
};

const isValidDateString = (
  value
) => {
  if (!value) {
    return true;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(value)
  );
};

const buildStartDate = (
  date
) => {
  if (!date) {
    return null;
  }

  return new Date(
    `${date}T00:00:00-05:00`
  );
};

const buildEndDate = (
  date
) => {
  if (!date) {
    return null;
  }

  return new Date(
    `${date}T23:59:59.999-05:00`
  );
};

const formatDateKey = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toLocaleDateString(
    "en-CA",
    {
      timeZone:
        "America/Guayaquil",

      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit",
    }
  );
};

const sortTimeline = (
  values
) => {
  return values.sort(
    (
      a,
      b
    ) =>
      String(
        a.fecha
      ).localeCompare(
        String(
          b.fecha
        )
      )
  );
};

const normalizeText = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
};

/* =========================================================
   ANIMODO PARA DASHBOARD

   IMPORTANTE:
   El resultado individual conserva:
   "ENTRE ABEJA Y DELFIN"

   Pero para estadísticas usamos:
   personalityAnimal = "CAMALEON"

   El scoring ya nos entrega esta información.
========================================================= */

const getAnimodoDashboardCategory = (
  resultado
) => {
  if (!resultado) {
    return null;
  }

  const personalityAnimal =
    resultado.animodo
      ?.personalityAnimal;

  if (personalityAnimal) {
    return String(
      personalityAnimal
    )
      .trim()
      .toUpperCase();
  }

  const animal =
    resultado.animodo
      ?.animal;

  if (!animal) {
    return null;
  }

  const normalized =
    String(animal)
      .trim()
      .toUpperCase();

  /*
   * Fallback para resultados antiguos
   * que no tengan personalityAnimal.
   */
  if (
    normalized.startsWith(
      "ENTRE "
    )
  ) {
    return "CAMALEON";
  }

  return normalized;
};

/* =========================================================
   TIPO DE PARTICIPANTE
========================================================= */

const getParticipantType = (
  evaluation
) => {
  const snapshotType =
    evaluation
      .participantSnapshot
      ?.tipoParticipante;

  if (
    snapshotType ===
      "empresa" ||
    snapshotType ===
      "individual"
  ) {
    return snapshotType;
  }

  if (
    evaluation
      .empresaIdSnapshot
  ) {
    return "empresa";
  }

  return "individual";
};

/* =========================================================
   VALIDACIÓN DE FILTROS GENERALES
========================================================= */

const validateGeneralFilters = (
  filters
) => {
  const {
    fechaDesde,
    fechaHasta,
    estado,
    tipoParticipante,
  } = filters;

  if (
    !isValidDateString(
      fechaDesde
    )
  ) {
    return "fechaDesde debe tener formato YYYY-MM-DD.";
  }

  if (
    !isValidDateString(
      fechaHasta
    )
  ) {
    return "fechaHasta debe tener formato YYYY-MM-DD.";
  }

  if (
    fechaDesde &&
    fechaHasta &&
    buildStartDate(
      fechaDesde
    ) >
      buildEndDate(
        fechaHasta
      )
  ) {
    return "fechaDesde no puede ser mayor que fechaHasta.";
  }

  if (
    estado &&
    !VALID_STATES.includes(
      estado
    )
  ) {
    return "Estado de evaluación no válido.";
  }

  if (
    tipoParticipante &&
    !VALID_PARTICIPANT_TYPES.includes(
      tipoParticipante
    )
  ) {
    return "tipoParticipante debe ser empresa o individual.";
  }

  return null;
};

/* =========================================================
   WHERE PRINCIPAL DE EVALUACIONES
========================================================= */

const buildEvaluationWhere = (
  filters = {},
  options = {}
) => {
  const {
    fechaDesde,
    fechaHasta,

    empresaId,
    seccionId,

    testId,
    estado,

    tipoParticipante,
  } = filters;

  const {
    onlyCompleted = false,
    requireResult = false,
  } = options;

  const where = {};

  /* =========================
     FECHAS
  ========================= */

  if (
    fechaDesde ||
    fechaHasta
  ) {
    where.createdAt = {};

    if (
      fechaDesde
    ) {
      where.createdAt[
        Op.gte
      ] =
        buildStartDate(
          fechaDesde
        );
    }

    if (
      fechaHasta
    ) {
      where.createdAt[
        Op.lte
      ] =
        buildEndDate(
          fechaHasta
        );
    }
  }

  /* =========================
     EMPRESA / TIPO
     
     IMPORTANTE:
     empresaId específico tiene prioridad.
     Así tipoParticipante no pisa el UUID.
  ========================= */

  if (
    empresaId
  ) {
    where.empresaIdSnapshot =
      empresaId;
  } else if (
    tipoParticipante ===
    "empresa"
  ) {
    where.empresaIdSnapshot = {
      [Op.ne]:
        null,
    };
  } else if (
    tipoParticipante ===
    "individual"
  ) {
    where.empresaIdSnapshot = {
      [Op.is]:
        null,
    };
  }

  /* =========================
     SECCIÓN
  ========================= */

  if (
    seccionId
  ) {
    where.seccionIdSnapshot =
      seccionId;
  }

  /* =========================
     TEST
  ========================= */

  if (
    testId
  ) {
    where.testId =
      testId;
  }

  /* =========================
     ESTADO
  ========================= */

  if (
    onlyCompleted
  ) {
    where.estado =
      "completada";
  } else if (
    estado
  ) {
    where.estado =
      estado;
  }

  /* =========================
     RESULTADO
  ========================= */

  if (
    requireResult
  ) {
    where.resultado = {
      [Op.ne]:
        null,
    };
  }

  return where;
};

/* =========================================================
   FILTROS PSICOMÉTRICOS
========================================================= */

const evaluationMatchesPsychometricFilters = (
  evaluation,
  filters = {}
) => {
  const resultado =
    evaluation.resultado ||
    {};

  const {
    animodo,
    comunicacion,
    cerebro,
    negociacion,
    vak,
    persistencia,
    productividad,
    personalidad,
  } = filters;

  /* =========================
     ANIMODO
  ========================= */

  if (
    animodo
  ) {
    const category =
      getAnimodoDashboardCategory(
        resultado
      );

    if (
      category !==
      String(
        animodo
      )
        .trim()
        .toUpperCase()
    ) {
      return false;
    }
  }

  /* =========================
     COMUNICACIÓN
  ========================= */

  if (
    comunicacion &&
    resultado.communication
      ?.dominantColor !==
      comunicacion
  ) {
    return false;
  }

  /* =========================
     CEREBRO
  ========================= */

  if (
    cerebro &&
    resultado.brain
      ?.brainCategory !==
      cerebro
  ) {
    return false;
  }

  /* =========================
     NEGOCIACIÓN
  ========================= */

  if (
    negociacion &&
    resultado.negotiation
      ?.classification !==
      negociacion
  ) {
    return false;
  }

  /* =========================
     VAK
  ========================= */

  if (
    vak &&
    resultado.vak
      ?.dominantStyle !==
      vak
  ) {
    return false;
  }

  /* =========================
     PERSISTENCIA
  ========================= */

  if (
    persistencia &&
    resultado.persistence
      ?.level !==
      persistencia
  ) {
    return false;
  }

  /* =========================
     PRODUCTIVIDAD
  ========================= */

  if (
    productividad &&
    resultado.productivityIndex
      ?.classification !==
      productividad
  ) {
    return false;
  }

  /* =========================
     PERSONALIDAD
  ========================= */

  if (
    personalidad
  ) {
    const personalityKey =
      resultado.personality
        ?.codigo ||
      resultado.personality
        ?.nombre ||
      resultado.personality
        ?.animal ||
      null;

    if (
      personalityKey !==
      personalidad
    ) {
      return false;
    }
  }

  return true;
};

const applyPsychometricFilters = (
  evaluations,
  filters
) => {
  return evaluations.filter(
    (
      evaluation
    ) =>
      evaluationMatchesPsychometricFilters(
        evaluation,
        filters
      )
  );
};

/* =========================================================
   DETECTAR SI EXISTE ALGÚN FILTRO PSICOMÉTRICO
========================================================= */

const hasPsychometricFilters = (
  filters = {}
) => {
  return Boolean(
    filters.animodo ||
    filters.comunicacion ||
    filters.cerebro ||
    filters.negociacion ||
    filters.vak ||
    filters.persistencia ||
    filters.productividad ||
    filters.personalidad
  );
};

/* =========================================================
   DATOS HISTÓRICOS DEL PARTICIPANTE
========================================================= */

const getParticipantSnapshot = (
  evaluation
) => {
  return (
    evaluation
      .participantSnapshot ||
    {}
  );
};

const getParticipantName = (
  evaluation
) => {
  const snapshot =
    getParticipantSnapshot(
      evaluation
    );

  const firstName =
    snapshot.user
      ?.firstName ||
    "";

  const lastName =
    snapshot.user
      ?.lastName ||
    "";

  const name =
    `${firstName} ${lastName}`
      .trim();

  return (
    name ||
    "Participante sin snapshot"
  );
};

const getCompanySnapshot = (
  evaluation
) => {
  return (
    getParticipantSnapshot(
      evaluation
    ).empresa ||
    null
  );
};

const getSectionSnapshot = (
  evaluation
) => {
  return (
    getParticipantSnapshot(
      evaluation
    ).seccion ||
    null
  );
};

/* =========================================================
   DISTRIBUCIONES
========================================================= */

const increment = (
  container,
  key
) => {
  if (
    key === null ||
    key === undefined ||
    key === ""
  ) {
    return;
  }

  container[key] =
    (container[key] || 0) +
    1;
};

const objectDistribution = (
  object,
  total
) => {
  return Object.entries(
    object
  )
    .map(
      ([
        key,
        cantidad,
      ]) => ({
        key,
        cantidad,

        porcentaje:
          total > 0
            ? roundPercentage(
                (
                  cantidad /
                  total
                ) *
                  100
              )
            : 0,
      })
    )
    .sort(
      (
        a,
        b
      ) =>
        b.cantidad -
        a.cantidad
    );
};

/* =========================================================
   ANALÍTICA DE RESULTADOS
========================================================= */

const buildPsychometricAnalytics = (
  evaluations = []
) => {
  const analytics = {
    totalResultados:
      evaluations.length,

    animodo: {},

    comunicacion: {},

    cerebro: {},

    negociacion: {},

    vak: {},

    persistencia: {},

    productividad: {},

    personalidad: {},
  };

  let productivityScoreSum =
    0;

  let productivityPercentageSum =
    0;

  let productivityCount =
    0;

  let negotiationScoreSum =
    0;

  let negotiationCount =
    0;

  /* =====================================================
     PROMEDIOS NUMÉRICOS
  ===================================================== */

  const communicationScoreSum = {
    AMARILLO: 0,
    ROJO: 0,
    AZUL: 0,
    VERDE: 0,
  };

  const communicationPercentageSum = {
    AMARILLO: 0,
    ROJO: 0,
    AZUL: 0,
    VERDE: 0,
  };

  let communicationCount =
    0;

  const brainScoreSum = {
    IZQUIERDO: 0,
    CENTRAL: 0,
    DERECHO: 0,
  };

  const brainPercentageSum = {
    IZQUIERDO: 0,
    CENTRAL: 0,
    DERECHO: 0,
  };

  let brainCount =
    0;

  const vakScoreSum = {
    VISUAL: 0,
    AUDITIVO: 0,
    KINESTESICO: 0,
  };

  const vakPercentageSum = {
    VISUAL: 0,
    AUDITIVO: 0,
    KINESTESICO: 0,
  };

  let vakCount =
    0;

  let persistenceScoreSum =
    0;

  let persistenceCount =
    0;

  const persistenceIndicators = {
    animodo: 0,
    communication: 0,
    brain: 0,
    negotiation: 0,
  };

  /* =====================================================
     RECORRIDO
  ===================================================== */

  for (
    const evaluation
    of evaluations
  ) {
    const resultado =
      evaluation.resultado ||
      {};

    /* ===================================================
       ANIMODO
    =================================================== */

    increment(
      analytics.animodo,
      getAnimodoDashboardCategory(
        resultado
      )
    );

    /* ===================================================
       COMUNICACIÓN
    =================================================== */

    increment(
      analytics.comunicacion,
      resultado.communication
        ?.dominantColor
    );

    if (
      resultado.communication
        ?.scores
    ) {
      for (
        const key
        of Object.keys(
          communicationScoreSum
        )
      ) {
        communicationScoreSum[
          key
        ] +=
          toNumber(
            resultado
              .communication
              .scores[
                key
              ]
          );

        communicationPercentageSum[
          key
        ] +=
          toNumber(
            resultado
              .communication
              .percentages
              ?.[key]
          );
      }

      communicationCount +=
        1;
    }

    /* ===================================================
       CEREBRO
    =================================================== */

    increment(
      analytics.cerebro,
      resultado.brain
        ?.brainCategory
    );

    if (
      resultado.brain
        ?.scores
    ) {
      for (
        const key
        of Object.keys(
          brainScoreSum
        )
      ) {
        brainScoreSum[
          key
        ] +=
          toNumber(
            resultado
              .brain
              .scores[
                key
              ]
          );

        brainPercentageSum[
          key
        ] +=
          toNumber(
            resultado
              .brain
              .percentages
              ?.[key]
          );
      }

      brainCount +=
        1;
    }

    /* ===================================================
       NEGOCIACIÓN
    =================================================== */

    increment(
      analytics.negociacion,
      resultado.negotiation
        ?.classification
    );

    if (
      resultado.negotiation
        ?.totalScore !==
        null &&
      resultado.negotiation
        ?.totalScore !==
        undefined
    ) {
      negotiationScoreSum +=
        toNumber(
          resultado.negotiation
            .totalScore
        );

      negotiationCount +=
        1;
    }

    /* ===================================================
       VAK
    =================================================== */

    increment(
      analytics.vak,
      resultado.vak
        ?.dominantStyle
    );

    if (
      resultado.vak
        ?.scores
    ) {
      for (
        const key
        of Object.keys(
          vakScoreSum
        )
      ) {
        vakScoreSum[
          key
        ] +=
          toNumber(
            resultado
              .vak
              .scores[
                key
              ]
          );

        vakPercentageSum[
          key
        ] +=
          toNumber(
            resultado
              .vak
              .percentages
              ?.[key]
          );
      }

      vakCount +=
        1;
    }

    /* ===================================================
       PERSISTENCIA
    =================================================== */

    increment(
      analytics.persistencia,
      resultado.persistence
        ?.level
    );

    if (
      resultado.persistence
        ?.score !==
        null &&
      resultado.persistence
        ?.score !==
        undefined
    ) {
      persistenceScoreSum +=
        toNumber(
          resultado
            .persistence
            .score
        );

      persistenceCount +=
        1;
    }

    if (
      resultado.persistence
        ?.indicators
    ) {
      for (
        const key
        of Object.keys(
          persistenceIndicators
        )
      ) {
        persistenceIndicators[
          key
        ] +=
          toNumber(
            resultado
              .persistence
              .indicators[
                key
              ]
          );
      }
    }

    /* ===================================================
       PRODUCTIVIDAD
    =================================================== */

    increment(
      analytics.productividad,
      resultado.productivityIndex
        ?.classification
    );

    if (
      resultado.productivityIndex
        ?.score !==
        null &&
      resultado.productivityIndex
        ?.score !==
        undefined
    ) {
      productivityScoreSum +=
        toNumber(
          resultado.productivityIndex
            .score
        );

      productivityPercentageSum +=
        toNumber(
          resultado.productivityIndex
            .percentage
        );

      productivityCount +=
        1;
    }

    /* ===================================================
       PERSONALIDAD
    =================================================== */

    const personality =
      resultado.personality;

    if (
      personality
    ) {
      const key =
        personality.codigo ||
        personality.nombre ||
        personality.animal;

      increment(
        analytics.personalidad,
        key
      );
    }
  }

  const total =
    analytics.totalResultados;

  /* =====================================================
     PROMEDIOS
  ===================================================== */

  const averageObject = (
    object,
    count
  ) => {
    const result = {};

    for (
      const [
        key,
        value,
      ]
      of Object.entries(
        object
      )
    ) {
      result[key] =
        count > 0
          ? roundPercentage(
              value /
                count
            )
          : 0;
    }

    return result;
  };

  /* =====================================================
     RESPUESTA
  ===================================================== */

  return {
    totalResultados:
      total,

    animodo: {
      counts:
        analytics.animodo,

      distribution:
        objectDistribution(
          analytics.animodo,
          total
        ),
    },

    comunicacion: {
      counts:
        analytics.comunicacion,

      distribution:
        objectDistribution(
          analytics.comunicacion,
          total
        ),

      averageScores:
        averageObject(
          communicationScoreSum,
          communicationCount
        ),

      averagePercentages:
        averageObject(
          communicationPercentageSum,
          communicationCount
        ),
    },

    cerebro: {
      counts:
        analytics.cerebro,

      distribution:
        objectDistribution(
          analytics.cerebro,
          total
        ),

      averageScores:
        averageObject(
          brainScoreSum,
          brainCount
        ),

      averagePercentages:
        averageObject(
          brainPercentageSum,
          brainCount
        ),
    },

    negociacion: {
      counts:
        analytics.negociacion,

      distribution:
        objectDistribution(
          analytics.negociacion,
          total
        ),

      promedioPuntaje:
        negotiationCount >
        0
          ? roundPercentage(
              negotiationScoreSum /
                negotiationCount
            )
          : 0,
    },

    vak: {
      counts:
        analytics.vak,

      distribution:
        objectDistribution(
          analytics.vak,
          total
        ),

      averageScores:
        averageObject(
          vakScoreSum,
          vakCount
        ),

      averagePercentages:
        averageObject(
          vakPercentageSum,
          vakCount
        ),
    },

    persistencia: {
      counts:
        analytics.persistencia,

      distribution:
        objectDistribution(
          analytics.persistencia,
          total
        ),

      promedioPuntaje:
        persistenceCount >
        0
          ? roundPercentage(
              persistenceScoreSum /
                persistenceCount
            )
          : 0,

      indicadoresPromedio: {
        animodo:
          total > 0
            ? roundPercentage(
                (
                  persistenceIndicators
                    .animodo /
                  total
                ) *
                  100
              )
            : 0,

        communication:
          total > 0
            ? roundPercentage(
                (
                  persistenceIndicators
                    .communication /
                  total
                ) *
                  100
              )
            : 0,

        brain:
          total > 0
            ? roundPercentage(
                (
                  persistenceIndicators
                    .brain /
                  total
                ) *
                  100
              )
            : 0,

        negotiation:
          total > 0
            ? roundPercentage(
                (
                  persistenceIndicators
                    .negotiation /
                  total
                ) *
                  100
              )
            : 0,
      },
    },

    productividad: {
      counts:
        analytics.productividad,

      distribution:
        objectDistribution(
          analytics.productividad,
          total
        ),

      promedioPuntaje:
        productivityCount >
        0
          ? roundPercentage(
              productivityScoreSum /
                productivityCount
            )
          : 0,

      promedioPorcentaje:
        productivityCount >
        0
          ? roundPercentage(
              productivityPercentageSum /
                productivityCount
            )
          : 0,
    },

    personalidad: {
      counts:
        analytics.personalidad,

      distribution:
        objectDistribution(
          analytics.personalidad,
          total
        ),
    },
  };
};

/* =========================================================
   TIMELINE EVALUACIONES
========================================================= */

const buildEvaluationTimeline = (
  evaluations = []
) => {
  const map =
    new Map();

  for (
    const evaluation
    of evaluations
  ) {
    const fecha =
      formatDateKey(
        evaluation.createdAt
      );

    if (
      !fecha
    ) {
      continue;
    }

    if (
      !map.has(
        fecha
      )
    ) {
      map.set(
        fecha,
        {
          fecha,

          evaluaciones:
            0,

          completadas:
            0,

          enProgreso:
            0,

          pendientesPago:
            0,

          pagoValidado:
            0,

          habilitadas:
            0,

          anuladas:
            0,
        }
      );
    }

    const item =
      map.get(
        fecha
      );

    item.evaluaciones +=
      1;

    switch (
      evaluation.estado
    ) {
      case "completada":
        item.completadas +=
          1;
        break;

      case "en_progreso":
        item.enProgreso +=
          1;
        break;

      case "pendiente_pago":
        item.pendientesPago +=
          1;
        break;

      case "pago_validado":
        item.pagoValidado +=
          1;
        break;

      case "habilitada":
        item.habilitadas +=
          1;
        break;

      case "anulada":
        item.anuladas +=
          1;
        break;

      default:
        break;
    }
  }

  return sortTimeline(
    Array.from(
      map.values()
    )
  );
};

/* =========================================================
   TIMELINE FINALIZACIONES
========================================================= */

const buildCompletionTimeline = (
  evaluations = []
) => {
  const map =
    new Map();

  for (
    const evaluation
    of evaluations
  ) {
    if (
      evaluation.estado !==
      "completada"
    ) {
      continue;
    }

    const fecha =
      formatDateKey(
        evaluation
          .fechaFinalizacion
      );

    if (
      !fecha
    ) {
      continue;
    }

    if (
      !map.has(
        fecha
      )
    ) {
      map.set(
        fecha,
        {
          fecha,
          cantidad:
            0,
        }
      );
    }

    map.get(
      fecha
    ).cantidad +=
      1;
  }

  return sortTimeline(
    Array.from(
      map.values()
    )
  );
};

/* =========================================================
   TIMELINE INSCRIPCIONES
========================================================= */

const buildInscriptionTimeline = (
  evaluations = []
) => {
  const map =
    new Map();

  const seen =
    new Set();

  for (
    const evaluation
    of evaluations
  ) {
    if (
      !evaluation
        .inscripcionId
    ) {
      continue;
    }

    const key =
      String(
        evaluation
          .inscripcionId
      );

    if (
      seen.has(
        key
      )
    ) {
      continue;
    }

    seen.add(
      key
    );

    const fecha =
      formatDateKey(
        evaluation.createdAt
      );

    if (
      !fecha
    ) {
      continue;
    }

    if (
      !map.has(
        fecha
      )
    ) {
      map.set(
        fecha,
        {
          fecha,
          cantidad:
            0,
        }
      );
    }

    map.get(
      fecha
    ).cantidad +=
      1;
  }

  return sortTimeline(
    Array.from(
      map.values()
    )
  );
};

/* =========================================================
   TIMELINE PAGOS
========================================================= */

const buildPaymentTimeline = (
  payments = []
) => {
  const map =
    new Map();

  for (
    const payment
    of payments
  ) {
    const fecha =
      formatDateKey(
        payment.createdAt
      );

    if (
      !fecha
    ) {
      continue;
    }

    if (
      !map.has(
        fecha
      )
    ) {
      map.set(
        fecha,
        {
          fecha,

          pagos:
            0,

          pagosVerificados:
            0,

          pagosPendientes:
            0,

          valorRegistrado:
            0,

          valorVerificado:
            0,
        }
      );
    }

    const item =
      map.get(
        fecha
      );

    const value =
      toNumber(
        payment
          .valorDepositado
      );

    item.pagos +=
      1;

    item.valorRegistrado +=
      value;

    if (
      payment.verificado ===
      true
    ) {
      item.pagosVerificados +=
        1;

      item.valorVerificado +=
        value;
    } else {
      item.pagosPendientes +=
        1;
    }
  }

  return sortTimeline(
    Array.from(
      map.values()
    ).map(
      (item) => ({
        ...item,

        valorRegistrado:
          roundMoney(
            item.valorRegistrado
          ),

        valorVerificado:
          roundMoney(
            item.valorVerificado
          ),
      })
    )
  );
};

/* =========================================================
   QUERY BASE PARA SUMMARY
========================================================= */

const getSummaryEvaluations = async (
  where
) => {
  return PsychometricEvaluation.findAll({
    where,

    attributes: [
      "id",
      "inscripcionId",
      "testId",

      "numeroEvaluacion",

      "estado",

      "fechaHabilitacion",
      "fechaInicio",
      "fechaFinalizacion",

      "empresaIdSnapshot",
      "seccionIdSnapshot",
      "participantSnapshot",

      /*
       * NECESARIO para que /summary
       * pueda aplicar filtros interactivos.
       */
      "resultado",

      "resultadoLiberado",

      "createdAt",
    ],

    include: [
      {
        model:
          PsychometricTest,

        as:
          "test",

        required:
          false,

        attributes: [
          "id",
          "nombre",
          "version",
        ],

        include: [
          {
            model:
              Course,

            as:
              "course",

            required:
              false,

            attributes: [
              "id",
              "nombre",
              "sigla",
              "tipo",
            ],
          },
        ],
      },

      {
        model:
          Pagos,

        as:
          "pagos",

        required:
          false,

        where: {
          tipoPago:
            "test_psicometrico",
        },

        attributes: [
          "id",
          "psychometricEvaluationId",
          "valorDepositado",
          "confirmacion",
          "verificado",
          "createdAt",
        ],
      },
    ],

    order: [
      [
        "createdAt",
        "ASC",
      ],
    ],
  });
};

/* =========================================================
   QUERY BASE ANALÍTICA
========================================================= */

const getAnalyticEvaluations = async (
  where
) => {
  return PsychometricEvaluation.findAll({
    where,

    attributes: [
      "id",
      "inscripcionId",
      "testId",

      "numeroEvaluacion",

      "estado",

      "puntajeTotal",

      "empresaIdSnapshot",
      "seccionIdSnapshot",

      "participantSnapshot",

      "fechaInicio",
      "fechaFinalizacion",

      "resultado",

      "resultadoLiberado",

      "createdAt",
      "updatedAt",
    ],

    order: [
      [
        "fechaFinalizacion",
        "DESC",
      ],
    ],
  });
};

/* =========================================================
   1. GET /psychometric/dashboard/summary
========================================================= */

const getPsychometricDashboardSummary =
  catchError(
    async (
      req,
      res
    ) => {
      const filters =
        req.query;

      const validationError =
        validateGeneralFilters(
          filters
        );

      if (
        validationError
      ) {
        return res
          .status(400)
          .json({
            message:
              validationError,
          });
      }

      const where =
        buildEvaluationWhere(
          filters
        );

      let evaluations =
        await getSummaryEvaluations(
          where
        );

      /*
       * IMPORTANTE:
       * Antes /summary ignoraba los filtros
       * de Comunicación, Cerebro, VAK, etc.
       */
      if (
        hasPsychometricFilters(
          filters
        )
      ) {
        evaluations =
          applyPsychometricFilters(
            evaluations,
            filters
          );
      }

      /* ===================================================
         PAGOS SOLO DE LAS EVALUACIONES FILTRADAS
      =================================================== */

      const paymentMap =
        new Map();

      for (
        const evaluation
        of evaluations
      ) {
        for (
          const payment
          of evaluation.pagos ||
          []
        ) {
          paymentMap.set(
            String(
              payment.id
            ),
            payment
          );
        }
      }

      const payments =
        Array.from(
          paymentMap.values()
        );

      /* ===================================================
         ESTADOS
      =================================================== */

      const estadoCounts = {
        pendientePago:
          0,

        pagoValidado:
          0,

        habilitadas:
          0,

        enProgreso:
          0,

        completadas:
          0,

        anuladas:
          0,
      };

      for (
        const evaluation
        of evaluations
      ) {
        switch (
          evaluation.estado
        ) {
          case "pendiente_pago":
            estadoCounts
              .pendientePago +=
              1;
            break;

          case "pago_validado":
            estadoCounts
              .pagoValidado +=
              1;
            break;

          case "habilitada":
            estadoCounts
              .habilitadas +=
              1;
            break;

          case "en_progreso":
            estadoCounts
              .enProgreso +=
              1;
            break;

          case "completada":
            estadoCounts
              .completadas +=
              1;
            break;

          case "anulada":
            estadoCounts
              .anuladas +=
              1;
            break;

          default:
            break;
        }
      }

      /* ===================================================
         INSCRIPCIONES
      =================================================== */

      const inscripcionIds =
        new Set(
          evaluations
            .map(
              (
                evaluation
              ) =>
                evaluation
                  .inscripcionId
            )
            .filter(
              Boolean
            )
            .map(
              String
            )
        );

      /* ===================================================
         EMPRESAS
      =================================================== */

      const empresaIds =
        new Set(
          evaluations
            .map(
              (
                evaluation
              ) =>
                evaluation
                  .empresaIdSnapshot
            )
            .filter(
              Boolean
            )
            .map(
              String
            )
        );

      const seccionIds =
        new Set(
          evaluations
            .map(
              (
                evaluation
              ) =>
                evaluation
                  .seccionIdSnapshot
            )
            .filter(
              Boolean
            )
            .map(
              String
            )
        );

      const empresariales =
        evaluations.filter(
          (
            evaluation
          ) =>
            getParticipantType(
              evaluation
            ) ===
            "empresa"
        ).length;

      const individuales =
        evaluations.filter(
          (
            evaluation
          ) =>
            getParticipantType(
              evaluation
            ) ===
            "individual"
        ).length;

      /* ===================================================
         PAGOS
      =================================================== */

      let pagosVerificados =
        0;

      let pagosPendientes =
        0;

      let valorRegistrado =
        0;

      let valorVerificado =
        0;

      for (
        const payment
        of payments
      ) {
        const value =
          toNumber(
            payment
              .valorDepositado
          );

        valorRegistrado +=
          value;

        if (
          payment.verificado ===
          true
        ) {
          pagosVerificados +=
            1;

          valorVerificado +=
            value;
        } else {
          pagosPendientes +=
            1;
        }
      }

      /* ===================================================
         RESULTADOS
      =================================================== */

      const resultadosLiberados =
        evaluations.filter(
          (
            evaluation
          ) =>
            evaluation
              .resultadoLiberado ===
            true
        ).length;

      const totalEvaluaciones =
        evaluations.length;

      const tasaFinalizacion =
        totalEvaluaciones >
        0
          ? roundPercentage(
              (
                estadoCounts
                  .completadas /
                totalEvaluaciones
              ) *
                100
            )
          : 0;

      const tasaPagoVerificado =
        payments.length >
        0
          ? roundPercentage(
              (
                pagosVerificados /
                payments.length
              ) *
                100
            )
          : 0;

      return res.json({
        message:
          "Resumen del dashboard psicométrico obtenido correctamente.",

        filters: {
          fechaDesde:
            filters
              .fechaDesde ||
            null,

          fechaHasta:
            filters
              .fechaHasta ||
            null,

          empresaId:
            filters
              .empresaId ||
            null,

          seccionId:
            filters
              .seccionId ||
            null,

          testId:
            filters
              .testId ||
            null,

          estado:
            filters
              .estado ||
            null,

          tipoParticipante:
            filters
              .tipoParticipante ||
            null,

          animodo:
            filters.animodo ||
            null,

          comunicacion:
            filters
              .comunicacion ||
            null,

          cerebro:
            filters.cerebro ||
            null,

          negociacion:
            filters
              .negociacion ||
            null,

          vak:
            filters.vak ||
            null,

          persistencia:
            filters
              .persistencia ||
            null,

          productividad:
            filters
              .productividad ||
            null,

          personalidad:
            filters
              .personalidad ||
            null,
        },

        kpis: {
          inscripciones:
            inscripcionIds.size,

          evaluaciones:
            totalEvaluaciones,

          pendientesPago:
            estadoCounts
              .pendientePago,

          pagoValidado:
            estadoCounts
              .pagoValidado,

          habilitadas:
            estadoCounts
              .habilitadas,

          enProgreso:
            estadoCounts
              .enProgreso,

          completadas:
            estadoCounts
              .completadas,

          anuladas:
            estadoCounts
              .anuladas,

          empresariales,

          individuales,

          empresas:
            empresaIds.size,

          secciones:
            seccionIds.size,

          resultadosLiberados,

          pagosRegistrados:
            payments.length,

          pagosVerificados,

          pagosPendientes,

          valorRegistrado:
            roundMoney(
              valorRegistrado
            ),

          recaudado:
            roundMoney(
              valorVerificado
            ),

          tasaFinalizacion,

          tasaPagoVerificado,
        },

        timeline: {
          evaluaciones:
            buildEvaluationTimeline(
              evaluations
            ),

          completadas:
            buildCompletionTimeline(
              evaluations
            ),

          inscripciones:
            buildInscriptionTimeline(
              evaluations
            ),

          pagos:
            buildPaymentTimeline(
              payments
            ),
        },
      });
    }
  );

/* =========================================================
   2. GET /psychometric/dashboard/analytics
========================================================= */

const getPsychometricDashboardAnalytics =
  catchError(
    async (
      req,
      res
    ) => {
      const filters =
        req.query;

      const validationError =
        validateGeneralFilters(
          filters
        );

      if (
        validationError
      ) {
        return res
          .status(400)
          .json({
            message:
              validationError,
          });
      }

      const where =
        buildEvaluationWhere(
          filters,
          {
            onlyCompleted:
              true,

            requireResult:
              true,
          }
        );

      let evaluations =
        await getAnalyticEvaluations(
          where
        );

      evaluations =
        applyPsychometricFilters(
          evaluations,
          filters
        );

      const analytics =
        buildPsychometricAnalytics(
          evaluations
        );

      return res.json({
        message:
          "Analítica psicométrica obtenida correctamente.",

        filters: {
          fechaDesde:
            filters
              .fechaDesde ||
            null,

          fechaHasta:
            filters
              .fechaHasta ||
            null,

          empresaId:
            filters
              .empresaId ||
            null,

          seccionId:
            filters
              .seccionId ||
            null,

          testId:
            filters
              .testId ||
            null,

          tipoParticipante:
            filters
              .tipoParticipante ||
            null,

          animodo:
            filters
              .animodo ||
            null,

          comunicacion:
            filters
              .comunicacion ||
            null,

          cerebro:
            filters
              .cerebro ||
            null,

          negociacion:
            filters
              .negociacion ||
            null,

          vak:
            filters.vak ||
            null,

          persistencia:
            filters
              .persistencia ||
            null,

          productividad:
            filters
              .productividad ||
            null,

          personalidad:
            filters
              .personalidad ||
            null,
        },

        analytics,
      });
    }
  );

/* =========================================================
   3. GET /psychometric/dashboard/filters
========================================================= */

const getPsychometricDashboardFilters =
  catchError(
    async (
      req,
      res
    ) => {
      const filters =
        req.query;

      const validationError =
        validateGeneralFilters(
          filters
        );

      if (
        validationError
      ) {
        return res
          .status(400)
          .json({
            message:
              validationError,
          });
      }

      /*
       * En filters usamos solamente filtros
       * estructurales para no desaparecer
       * las demás opciones cuando el usuario
       * selecciona una categoría psicométrica.
       */

      const structuralFilters = {
        fechaDesde:
          filters.fechaDesde,

        fechaHasta:
          filters.fechaHasta,

        empresaId:
          filters.empresaId,

        seccionId:
          filters.seccionId,

        testId:
          filters.testId,

        tipoParticipante:
          filters
            .tipoParticipante,
      };

      const where =
        buildEvaluationWhere(
          structuralFilters,
          {
            onlyCompleted:
              true,

            requireResult:
              true,
          }
        );

      const evaluations =
        await getAnalyticEvaluations(
          where
        );

      const companiesMap =
        new Map();

      const sectionsMap =
        new Map();

      const testsMap =
        new Map();

      const values = {
        animodo:
          new Set(),

        comunicacion:
          new Set(),

        cerebro:
          new Set(),

        negociacion:
          new Set(),

        vak:
          new Set(),

        persistencia:
          new Set(),

        productividad:
          new Set(),

        personalidad:
          new Set(),
      };

      for (
        const evaluation
        of evaluations
      ) {
        /* =================================================
           EMPRESA
        ================================================= */

        if (
          evaluation
            .empresaIdSnapshot
        ) {
          const empresa =
            getCompanySnapshot(
              evaluation
            );

          const id =
            String(
              evaluation
                .empresaIdSnapshot
            );

          if (
            !companiesMap.has(
              id
            )
          ) {
            companiesMap.set(
              id,
              {
                id,

                razonSocial:
                  empresa
                    ?.razonSocial ||
                  null,

                nombreComercial:
                  empresa
                    ?.nombreComercial ||
                  null,

                nombre:
                  empresa
                    ?.nombreComercial ||
                  empresa
                    ?.razonSocial ||
                  "Empresa histórica",

                sector:
                  empresa
                    ?.sector ||
                  null,

                subSector:
                  empresa
                    ?.subSector ||
                  null,
              }
            );
          }
        }

        /* =================================================
           SECCIÓN
        ================================================= */

        if (
          evaluation
            .seccionIdSnapshot
        ) {
          const section =
            getSectionSnapshot(
              evaluation
            );

          const id =
            String(
              evaluation
                .seccionIdSnapshot
            );

          if (
            !sectionsMap.has(
              id
            )
          ) {
            sectionsMap.set(
              id,
              {
                id,

                empresaId:
                  evaluation
                    .empresaIdSnapshot ||
                  null,

                nombre:
                  section
                    ?.nombre ||
                  "Sección histórica",

                descripcion:
                  section
                    ?.descripcion ||
                  null,

                responsable:
                  section
                    ?.responsable ||
                  null,
              }
            );
          }
        }

        /* =================================================
           TEST
        ================================================= */

        if (
          evaluation.testId
        ) {
          testsMap.set(
            String(
              evaluation.testId
            ),
            {
              id:
                evaluation.testId,
            }
          );
        }

        /* =================================================
           RESULTADOS
        ================================================= */

        const resultado =
          evaluation.resultado ||
          {};

        const animodoCategory =
          getAnimodoDashboardCategory(
            resultado
          );

        if (
          animodoCategory
        ) {
          values.animodo.add(
            animodoCategory
          );
        }

        if (
          resultado.communication
            ?.dominantColor
        ) {
          values.comunicacion.add(
            resultado.communication
              .dominantColor
          );
        }

        if (
          resultado.brain
            ?.brainCategory
        ) {
          values.cerebro.add(
            resultado.brain
              .brainCategory
          );
        }

        if (
          resultado.negotiation
            ?.classification
        ) {
          values.negociacion.add(
            resultado.negotiation
              .classification
          );
        }

        if (
          resultado.vak
            ?.dominantStyle
        ) {
          values.vak.add(
            resultado.vak
              .dominantStyle
          );
        }

        if (
          resultado.persistence
            ?.level
        ) {
          values.persistencia.add(
            resultado.persistence
              .level
          );
        }

        if (
          resultado.productivityIndex
            ?.classification
        ) {
          values.productividad.add(
            resultado
              .productivityIndex
              .classification
          );
        }

        const personalityKey =
          resultado.personality
            ?.codigo ||
          resultado.personality
            ?.nombre ||
          resultado.personality
            ?.animal;

        if (
          personalityKey
        ) {
          values.personalidad.add(
            personalityKey
          );
        }
      }

      /* ===================================================
         TESTS
      =================================================== */

      const testIds =
        Array.from(
          testsMap.keys()
        );

      let tests =
        [];

      if (
        testIds.length >
        0
      ) {
        tests =
          await PsychometricTest.findAll({
            where: {
              id: {
                [Op.in]:
                  testIds,
              },
            },

            attributes: [
              "id",
              "nombre",
              "version",
              "activo",
            ],

            order: [
              [
                "nombre",
                "ASC",
              ],
            ],
          });
      }

      return res.json({
        message:
          "Filtros del dashboard psicométrico obtenidos correctamente.",

        empresas:
          Array.from(
            companiesMap.values()
          ).sort(
            (
              a,
              b
            ) =>
              String(
                a.nombre
              ).localeCompare(
                String(
                  b.nombre
                )
              )
          ),

        secciones:
          Array.from(
            sectionsMap.values()
          ).sort(
            (
              a,
              b
            ) =>
              String(
                a.nombre
              ).localeCompare(
                String(
                  b.nombre
                )
              )
          ),

        tests,

        resultados: {
          animodo:
            Array.from(
              values.animodo
            ).sort(),

          comunicacion:
            Array.from(
              values.comunicacion
            ).sort(),

          cerebro:
            Array.from(
              values.cerebro
            ).sort(),

          negociacion:
            Array.from(
              values.negociacion
            ).sort(),

          vak:
            Array.from(
              values.vak
            ).sort(),

          persistencia:
            Array.from(
              values.persistencia
            ).sort(),

          productividad:
            Array.from(
              values.productividad
            ).sort(),

          personalidad:
            Array.from(
              values.personalidad
            ).sort(),
        },
      });
    }
  );

/* =========================================================
   4. GET /psychometric/dashboard/organizations
========================================================= */

const getPsychometricDashboardOrganizations =
  catchError(
    async (
      req,
      res
    ) => {
      const filters =
        req.query;

      const validationError =
        validateGeneralFilters(
          filters
        );

      if (
        validationError
      ) {
        return res
          .status(400)
          .json({
            message:
              validationError,
          });
      }

      const where =
        buildEvaluationWhere(
          filters,
          {
            onlyCompleted:
              true,

            requireResult:
              true,
          }
        );

      let evaluations =
        await getAnalyticEvaluations(
          where
        );

      evaluations =
        applyPsychometricFilters(
          evaluations,
          filters
        );

      const companyMap =
        new Map();

      for (
        const evaluation
        of evaluations
      ) {
        if (
          !evaluation
            .empresaIdSnapshot
        ) {
          continue;
        }

        const companyId =
          String(
            evaluation
              .empresaIdSnapshot
          );

        const companySnapshot =
          getCompanySnapshot(
            evaluation
          );

        if (
          !companyMap.has(
            companyId
          )
        ) {
          companyMap.set(
            companyId,
            {
              id:
                companyId,

              razonSocial:
                companySnapshot
                  ?.razonSocial ||
                null,

              nombreComercial:
                companySnapshot
                  ?.nombreComercial ||
                null,

              nombre:
                companySnapshot
                  ?.nombreComercial ||
                companySnapshot
                  ?.razonSocial ||
                "Empresa histórica",

              sector:
                companySnapshot
                  ?.sector ||
                null,

              subSector:
                companySnapshot
                  ?.subSector ||
                null,

              evaluaciones:
                [],

              sectionsMap:
                new Map(),
            }
          );
        }

        const company =
          companyMap.get(
            companyId
          );

        company.evaluaciones.push(
          evaluation
        );

        if (
          evaluation
            .seccionIdSnapshot
        ) {
          const sectionId =
            String(
              evaluation
                .seccionIdSnapshot
            );

          const sectionSnapshot =
            getSectionSnapshot(
              evaluation
            );

          if (
            !company.sectionsMap.has(
              sectionId
            )
          ) {
            company.sectionsMap.set(
              sectionId,
              {
                id:
                  sectionId,

                nombre:
                  sectionSnapshot
                    ?.nombre ||
                  "Sección histórica",

                descripcion:
                  sectionSnapshot
                    ?.descripcion ||
                  null,

                responsable:
                  sectionSnapshot
                    ?.responsable ||
                  null,

                evaluaciones:
                  [],
              }
            );
          }

          company.sectionsMap
            .get(
              sectionId
            )
            .evaluaciones
            .push(
              evaluation
            );
        }
      }

      const companies =
        Array.from(
          companyMap.values()
        ).map(
          (
            company
          ) => {
            const companyAnalytics =
              buildPsychometricAnalytics(
                company.evaluaciones
              );

            const sections =
              Array.from(
                company.sectionsMap.values()
              ).map(
                (
                  section
                ) => ({
                  id:
                    section.id,

                  nombre:
                    section.nombre,

                  descripcion:
                    section.descripcion,

                  responsable:
                    section.responsable,

                  totalResultados:
                    section
                      .evaluaciones
                      .length,

                  analytics:
                    buildPsychometricAnalytics(
                      section.evaluaciones
                    ),
                })
              );

            return {
              id:
                company.id,

              razonSocial:
                company.razonSocial,

              nombreComercial:
                company.nombreComercial,

              nombre:
                company.nombre,

              sector:
                company.sector,

              subSector:
                company.subSector,

              totalResultados:
                company
                  .evaluaciones
                  .length,

              analytics:
                companyAnalytics,

              secciones:
                sections.sort(
                  (
                    a,
                    b
                  ) =>
                    b.totalResultados -
                    a.totalResultados
                ),
            };
          }
        );

      companies.sort(
        (
          a,
          b
        ) =>
          b.totalResultados -
          a.totalResultados
      );

      return res.json({
        message:
          "Resultados organizacionales obtenidos correctamente.",

        totalEmpresas:
          companies.length,

        companies,
      });
    }
  );

/* =========================================================
   5. GET /psychometric/dashboard/participants
========================================================= */

const getPsychometricDashboardParticipants =
  catchError(
    async (
      req,
      res
    ) => {
      const filters =
        req.query;

      const validationError =
        validateGeneralFilters(
          filters
        );

      if (
        validationError
      ) {
        return res
          .status(400)
          .json({
            message:
              validationError,
          });
      }

      const page =
        Math.max(
          1,
          parseInt(
            req.query.page,
            10
          ) || 1
        );

      const limit =
        Math.min(
          100,
          Math.max(
            1,
            parseInt(
              req.query.limit,
              10
            ) || 20
          )
        );

      const search =
        normalizeText(
          req.query.search
        );

      const where =
        buildEvaluationWhere(
          filters,
          {
            onlyCompleted:
              true,

            requireResult:
              true,
          }
        );

      let evaluations =
        await getAnalyticEvaluations(
          where
        );

      evaluations =
        applyPsychometricFilters(
          evaluations,
          filters
        );

      /* ===================================================
         BUSCADOR
      =================================================== */

      if (
        search
      ) {
        evaluations =
          evaluations.filter(
            (
              evaluation
            ) => {
              const snapshot =
                getParticipantSnapshot(
                  evaluation
                );

              const searchable =
                [
                  snapshot.user
                    ?.cI,

                  snapshot.user
                    ?.email,

                  snapshot.user
                    ?.firstName,

                  snapshot.user
                    ?.lastName,

                  snapshot.empresa
                    ?.razonSocial,

                  snapshot.empresa
                    ?.nombreComercial,

                  snapshot.seccion
                    ?.nombre,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    " "
                  )
                  .toLowerCase();

              return searchable.includes(
                search
              );
            }
          );
      }

      /* ===================================================
         PAGINACIÓN
      =================================================== */

      const total =
        evaluations.length;

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            total /
              limit
          )
        );

      const offset =
        (page - 1) *
        limit;

      const pageRows =
        evaluations.slice(
          offset,
          offset +
            limit
        );

      /* ===================================================
         DATA
      =================================================== */

      const data =
        pageRows.map(
          (
            evaluation
          ) => {
            const resultado =
              evaluation.resultado ||
              {};

            const snapshot =
              getParticipantSnapshot(
                evaluation
              );

            return {
              evaluationId:
                evaluation.id,

              inscripcionId:
                evaluation
                  .inscripcionId,

              testId:
                evaluation.testId,

              numeroEvaluacion:
                evaluation
                  .numeroEvaluacion,

              fechaInicio:
                evaluation
                  .fechaInicio,

              fechaFinalizacion:
                evaluation
                  .fechaFinalizacion,

              puntajeTotal:
                evaluation
                  .puntajeTotal !==
                null
                  ? toNumber(
                      evaluation
                        .puntajeTotal
                    )
                  : null,

              resultadoLiberado:
                evaluation
                  .resultadoLiberado,

              tipoParticipante:
                getParticipantType(
                  evaluation
                ),

              participante: {
                id:
                  snapshot.user
                    ?.id ||
                  null,

                cI:
                  snapshot.user
                    ?.cI ||
                  null,

                email:
                  snapshot.user
                    ?.email ||
                  null,

                firstName:
                  snapshot.user
                    ?.firstName ||
                  null,

                lastName:
                  snapshot.user
                    ?.lastName ||
                  null,

                nombreCompleto:
                  getParticipantName(
                    evaluation
                  ),

                cellular:
                  snapshot.user
                    ?.cellular ||
                  null,

                grado:
                  snapshot.user
                    ?.grado ||
                  null,

                subsistema:
                  snapshot.user
                    ?.subsistema ||
                  null,
              },

              empresa: {
                id:
                  evaluation
                    .empresaIdSnapshot ||
                  null,

                razonSocial:
                  snapshot.empresa
                    ?.razonSocial ||
                  null,

                nombreComercial:
                  snapshot.empresa
                    ?.nombreComercial ||
                  null,
              },

              seccion: {
                id:
                  evaluation
                    .seccionIdSnapshot ||
                  null,

                nombre:
                  snapshot.seccion
                    ?.nombre ||
                  null,
              },

              resultado: {
                /*
                 * VALOR ORIGINAL INDIVIDUAL.
                 */
                animodo:
                  resultado.animodo
                    ?.animal ||
                  null,

                /*
                 * VALOR NORMALIZADO PARA DASHBOARD.
                 */
                animodoCategoria:
                  getAnimodoDashboardCategory(
                    resultado
                  ),

                comunicacion:
                  resultado
                    .communication
                    ?.dominantColor ||
                  null,

                comunicacionPorcentajes:
                  resultado
                    .communication
                    ?.percentages ||
                  null,

                comunicacionPuntajes:
                  resultado
                    .communication
                    ?.scores ||
                  null,

                cerebro:
                  resultado.brain
                    ?.brainCategory ||
                  null,

                cerebroTipo:
                  resultado.brain
                    ?.brainType ||
                  null,

                cerebroColor:
                  resultado.brain
                    ?.headColor ||
                  null,

                cerebroPorcentajes:
                  resultado.brain
                    ?.percentages ||
                  null,

                cerebroPuntajes:
                  resultado.brain
                    ?.scores ||
                  null,

                negociacion:
                  resultado
                    .negotiation
                    ?.classification ||
                  null,

                negociacionPuntaje:
                  resultado
                    .negotiation
                    ?.totalScore ??
                  null,

                vak:
                  resultado.vak
                    ?.dominantStyle ||
                  null,

                vakEmpate:
                  resultado.vak
                    ?.tied ||
                  false,

                vakEmpates:
                  resultado.vak
                    ?.tiedCategories ||
                  [],

                vakPorcentajes:
                  resultado.vak
                    ?.percentages ||
                  null,

                vakPuntajes:
                  resultado.vak
                    ?.scores ||
                  null,

                persistencia:
                  resultado
                    .persistence
                    ?.level ||
                  null,

                persistenciaPuntaje:
                  resultado
                    .persistence
                    ?.score ??
                  null,

                productividad:
                  resultado
                    .productivityIndex
                    ?.classification ||
                  null,

                productividadPuntaje:
                  resultado
                    .productivityIndex
                    ?.score ??
                  null,

                productividadMaximo:
                  resultado
                    .productivityIndex
                    ?.maxScore ??
                  null,

                productividadPorcentaje:
                  resultado
                    .productivityIndex
                    ?.percentage ??
                  null,

                personalidad:
                  resultado
                    .personality
                    ?.codigo ||
                  null,

                personalidadNombre:
                  resultado
                    .personality
                    ?.nombre ||
                  null,

                personalidadAnimal:
                  resultado
                    .personality
                    ?.animal ||
                  null,

                colorCabeza:
                  resultado
                    .personality
                    ?.colorCabeza ||
                  null,

                colorPecho:
                  resultado
                    .personality
                    ?.colorPecho ||
                  null,
              },
            };
          }
        );

      return res.json({
        message:
          "Participantes del dashboard obtenidos correctamente.",

        pagination: {
          total,
          page,
          limit,
          totalPages,

          hasPrevious:
            page >
            1,

          hasNext:
            page <
            totalPages,
        },

        data,
      });
    }
  );

/* =========================================================
   6. GET /psychometric/dashboard/participants/:evaluationId
========================================================= */

const getPsychometricDashboardParticipantDetail =
  catchError(
    async (
      req,
      res
    ) => {
      const {
        evaluationId,
      } = req.params;

      const evaluation =
        await PsychometricEvaluation.findOne({
          where: {
            id:
              evaluationId,

            estado:
              "completada",
          },

          attributes: [
            "id",
            "inscripcionId",
            "testId",

            "numeroEvaluacion",

            "estado",

            "fechaHabilitacion",
            "fechaInicio",
            "fechaFinalizacion",

            "testVersion",

            "puntajeTotal",

            "resultado",

            "empresaIdSnapshot",
            "seccionIdSnapshot",
            "participantSnapshot",

            "personalityId",

            "resultadoLiberado",
            "resultadoGeneradoAt",

            "resultadoEmailEnviado",
            "resultadoEmailEnviadoAt",
            "resultadoEmailEnvios",

            "resultadoInformeUrl",

            "observacion",

            "createdAt",
            "updatedAt",
          ],

          include: [
            {
              model:
                PsychometricTest,

              as:
                "test",

              required:
                false,

              attributes: [
                "id",
                "nombre",
                "descripcion",
                "version",
              ],

              include: [
                {
                  model:
                    Course,

                  as:
                    "course",

                  required:
                    false,

                  attributes: [
                    "id",
                    "nombre",
                    "sigla",
                    "tipo",
                  ],
                },
              ],
            },

            {
              model:
                Pagos,

              as:
                "pagos",

              required:
                false,

              where: {
                tipoPago:
                  "test_psicometrico",
              },

              attributes: [
                "id",

                "valorDepositado",

                "confirmacion",

                "verificado",

                "entidad",

                "idDeposito",

                "pagoUrl",

                "facturaUrl",

                "createdAt",
              ],
            },
          ],
        });

      if (
        !evaluation
      ) {
        return res
          .status(404)
          .json({
            message:
              "Evaluación psicométrica no encontrada.",
          });
      }

      const resultado =
        evaluation.resultado ||
        {};

      const snapshot =
        getParticipantSnapshot(
          evaluation
        );

      return res.json({
        message:
          "Detalle psicométrico obtenido correctamente.",

        evaluation: {
          id:
            evaluation.id,

          inscripcionId:
            evaluation
              .inscripcionId,

          testId:
            evaluation.testId,

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
              .fechaInicio,

          fechaFinalizacion:
            evaluation
              .fechaFinalizacion,

          testVersion:
            evaluation
              .testVersion,

          puntajeTotal:
            evaluation
              .puntajeTotal !==
            null
              ? toNumber(
                  evaluation
                    .puntajeTotal
                )
              : null,

          resultadoLiberado:
            evaluation
              .resultadoLiberado,

          resultadoGeneradoAt:
            evaluation
              .resultadoGeneradoAt,

          resultadoInformeUrl:
            evaluation
              .resultadoInformeUrl,

          observacion:
            evaluation
              .observacion,
        },

        participant: {
          tipoParticipante:
            getParticipantType(
              evaluation
            ),

          user:
            snapshot.user ||
            null,

          empresa:
            snapshot.empresa ||
            null,

          seccion:
            snapshot.seccion ||
            null,
        },

        test:
          evaluation.test ||
          null,

        payments:
          evaluation.pagos ||
          [],

        result: {
          /*
           * Resultado original.
           */
          animodo:
            resultado.animodo ||
            null,

          /*
           * Categoría estadística.
           */
          animodoCategoria:
            getAnimodoDashboardCategory(
              resultado
            ),

          communication:
            resultado.communication ||
            null,

          brain:
            resultado.brain ||
            null,

          negotiation:
            resultado.negotiation ||
            null,

          vak:
            resultado.vak ||
            null,

          persistence:
            resultado.persistence ||
            null,

          productivityIndex:
            resultado.productivityIndex ||
            null,

          personality:
            resultado.personality ||
            null,
        },
      });
    }
  );

/* =========================================================
   EXPORTACIONES
========================================================= */

module.exports = {
  getPsychometricDashboardSummary,

  getPsychometricDashboardAnalytics,

  getPsychometricDashboardFilters,

  getPsychometricDashboardOrganizations,

  getPsychometricDashboardParticipants,

  getPsychometricDashboardParticipantDetail,
};