const {
  Op,
} = require("sequelize");

const catchError = require(
  "../utils/catchError"
);

const generarInformePsicometricoEmpresa = require(
  "../utils/generarInformePsicometricoEmpresa"
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

const Empresa = require(
  "../models/Empresa"
);

const EmpresaSeccion = require(
  "../models/EmpresaSeccion"
);

const User = require(
  "../models/User"
);

const sequelize = require(
  "../utils/connection"
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

const VALID_AGE_GROUPS = [
  "GEN_0",
  "GEN_1",
  "GEN_2",
  "GEN_3",
];

const AGE_GROUP_LABELS = {
  GEN_0: "Menor de 18",
  GEN_1: "18 - 35",
  GEN_2: "36 - 45",
  GEN_3: "46 en adelante",
};

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
   DATOS DEMOGRÁFICOS
========================================================= */

const normalizeGenre = (
  value
) => {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .toUpperCase();

  if (!normalized) {
    return null;
  }

  if (
    [
      "M",
      "MASCULINO",
      "HOMBRE",
      "MALE",
    ].includes(
      normalized
    )
  ) {
    return "MASCULINO";
  }

  if (
    [
      "F",
      "FEMENINO",
      "MUJER",
      "FEMALE",
    ].includes(
      normalized
    )
  ) {
    return "FEMENINO";
  }

  return normalized;
};

const getGuayaquilDateParts = (
  value
) => {
  const date =
    value
      ? new Date(value)
      : new Date();

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const parts =
    new Intl.DateTimeFormat(
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
    ).formatToParts(
      date
    );

  const values = {};

  for (
    const part
    of parts
  ) {
    if (
      part.type !==
      "literal"
    ) {
      values[
        part.type
      ] =
        Number(
          part.value
        );
    }
  }

  return {
    year:
      values.year,

    month:
      values.month,

    day:
      values.day,
  };
};

const calculateAge = (
  dateBirth,
  referenceDate
) => {
  if (!dateBirth) {
    return null;
  }

  const birthText =
    String(
      dateBirth
    )
      .trim()
      .slice(
        0,
        10
      );

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      birthText
    );

  if (!match) {
    return null;
  }

  const birthYear =
    Number(
      match[1]
    );

  const birthMonth =
    Number(
      match[2]
    );

  const birthDay =
    Number(
      match[3]
    );

  if (
    !birthYear ||
    birthMonth < 1 ||
    birthMonth > 12 ||
    birthDay < 1 ||
    birthDay > 31
  ) {
    return null;
  }

  const reference =
    getGuayaquilDateParts(
      referenceDate ||
      new Date()
    );

  if (!reference) {
    return null;
  }

  let age =
    reference.year -
    birthYear;

  const birthdayPassed =
    reference.month >
      birthMonth ||
    (
      reference.month ===
        birthMonth &&
      reference.day >=
        birthDay
    );

  if (
    !birthdayPassed
  ) {
    age -= 1;
  }

  if (
    age < 0 ||
    age > 130
  ) {
    return null;
  }

  return age;
};

const getAgeGroup = (
  age
) => {
  if (
    age === null ||
    age === undefined ||
    !Number.isFinite(
      Number(age)
    )
  ) {
    return null;
  }

  const numericAge =
    Number(age);

  if (
    numericAge < 18
  ) {
    return "GEN_0";
  }

  if (
    numericAge <= 35
  ) {
    return "GEN_1";
  }

  if (
    numericAge <= 45
  ) {
    return "GEN_2";
  }

  return "GEN_3";
};

const getParticipantDemographics = (
  evaluation
) => {
  const snapshot =
    evaluation
      ?.participantSnapshot ||
    {};

  const dateBirth =
    snapshot.user
      ?.dateBirth ||
    null;

  const genre =
    normalizeGenre(
      snapshot.user
        ?.genre
    );

  /*
   * Para conservar consistencia histórica,
   * la edad se calcula a la fecha en que
   * terminó la evaluación.
   *
   * Si no existe fechaFinalizacion,
   * se usa createdAt como respaldo.
   */
  const age =
    calculateAge(
      dateBirth,
      evaluation
        ?.fechaFinalizacion ||
      evaluation
        ?.createdAt ||
      new Date()
    );

  return {
    genre,

    dateBirth,

    age,

    ageGroup:
      getAgeGroup(
        age
      ),
  };
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
    rangoEtario,
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

  if (
    rangoEtario &&
    !VALID_AGE_GROUPS.includes(
      String(
        rangoEtario
      )
        .trim()
        .toUpperCase()
    )
  ) {
    return "rangoEtario debe ser GEN_0, GEN_1, GEN_2 o GEN_3.";
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
    genero,
    rangoEtario,
  } = filters;

  /* =========================
     GÉNERO / RANGO ETARIO
  ========================= */

  if (
    genero ||
    rangoEtario
  ) {
    const demographics =
      getParticipantDemographics(
        evaluation
      );

    if (
      genero &&
      demographics.genre !==
        normalizeGenre(
          genero
        )
    ) {
      return false;
    }

    if (
      rangoEtario &&
      demographics.ageGroup !==
        String(
          rangoEtario
        )
          .trim()
          .toUpperCase()
    ) {
      return false;
    }
  }

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
    filters.personalidad ||
    filters.genero ||
    filters.rangoEtario
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

    genero: {},

    rangoEtario: {},
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
       DATOS DEMOGRÁFICOS
    =================================================== */

    const demographics =
      getParticipantDemographics(
        evaluation
      );

    increment(
      analytics.genero,
      demographics.genre
    );

    increment(
      analytics.rangoEtario,
      demographics.ageGroup
    );

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

    genero: {
      counts:
        analytics.genero,

      distribution:
        objectDistribution(
          analytics.genero,
          total
        ),
    },

    rangoEtario: {
      counts:
        analytics.rangoEtario,

      labels:
        AGE_GROUP_LABELS,

      distribution:
        objectDistribution(
          analytics.rangoEtario,
          total
        ).map(
          (
            item
          ) => ({
            ...item,

            label:
              AGE_GROUP_LABELS[
                item.key
              ] ||
              item.key,
          })
        ),
    },

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

          genero:
            filters
              .genero ||
            null,

          rangoEtario:
            filters
              .rangoEtario ||
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

          genero:
            filters
              .genero ||
            null,

          rangoEtario:
            filters
              .rangoEtario ||
            null,
        },

        analytics,
      });
    }
  );

/* =========================================================
   3. GET /psychometric/dashboard/filters

   IMPORTANTE:
   - Las empresas NO desaparecen al seleccionar una.
   - Los valores psicométricos/demográficos son catálogos
     estables y no se reducen por filtros cruzados.
   - Las secciones sí dependen de empresaId cuando existe.
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

      /* ===================================================
         EMPRESAS: LISTADO ESTABLE
      =================================================== */

      const empresas =
        await Empresa.findAll({
          attributes: [
            "id",
            "razonSocial",
            "nombreComercial",
            "sector",
            "subSector",
            "correo",
            "activo",
          ],

          order: [
            [
              "nombreComercial",
              "ASC",
            ],
            [
              "razonSocial",
              "ASC",
            ],
          ],
        });

      /* ===================================================
         SECCIONES

         ÚNICA DEPENDENCIA PERMITIDA:
         Si hay empresaId, devuelve solamente
         las secciones de esa empresa.
      =================================================== */

      const sectionWhere = {};

      if (
        filters.empresaId
      ) {
        sectionWhere.empresaId =
          filters.empresaId;
      }

      const secciones =
        await EmpresaSeccion.findAll({
          where:
            sectionWhere,

          attributes: [
            "id",
            "empresaId",
            "nombre",
            "descripcion",
            "responsable",
            "correo",
            "activo",
          ],

          order: [
            [
              "nombre",
              "ASC",
            ],
          ],
        });

      /* ===================================================
         TESTS: CATÁLOGO ESTABLE
      =================================================== */

      const tests =
        await PsychometricTest.findAll({
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

      /* ===================================================
         RESULTADOS: CATÁLOGO ESTABLE

         No usamos empresaId, sección ni filtros cruzados.
         Así las opciones disponibles no desaparecen.
      =================================================== */

      const catalogWhere =
        buildEvaluationWhere(
          {},
          {
            onlyCompleted:
              true,

            requireResult:
              true,
          }
        );

      const evaluations =
        await getAnalyticEvaluations(
          catalogWhere
        );

      const values = {
        genero:
          new Set(),

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
        const demographics =
          getParticipantDemographics(
            evaluation
          );

        if (
          demographics.genre
        ) {
          values.genero.add(
            demographics.genre
          );
        }

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

      return res.json({
        message:
          "Filtros del dashboard psicométrico obtenidos correctamente.",

        empresas:
          empresas.map(
            (
              empresa
            ) => ({
              id:
                empresa.id,

              razonSocial:
                empresa.razonSocial,

              nombreComercial:
                empresa.nombreComercial,

              nombre:
                empresa.nombreComercial ||
                empresa.razonSocial,

              sector:
                empresa.sector,

              subSector:
                empresa.subSector,

              correo:
                empresa.correo,

              activo:
                empresa.activo,
            })
          ),

        secciones:
          secciones.map(
            (
              section
            ) => ({
              id:
                section.id,

              empresaId:
                section.empresaId,

              nombre:
                section.nombre,

              descripcion:
                section.descripcion,

              responsable:
                section.responsable,

              correo:
                section.correo,

              activo:
                section.activo,
            })
          ),

        tests,

        resultados: {
          genero:
            Array.from(
              values.genero
            ).sort(),

          rangoEtario:
            VALID_AGE_GROUPS.map(
              (
                key
              ) => ({
                key,

                label:
                  AGE_GROUP_LABELS[
                    key
                  ],
              })
            ),

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

   IMPORTANTE:
   - El listado de empresas siempre permanece completo.
   - empresaId y seccionId NO eliminan empresas del listado.
   - Los demás filtros sí pueden recalcular sus estadísticas.
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

      /* ===================================================
         CATÁLOGO REAL DE EMPRESAS Y SECCIONES
      =================================================== */

      const companyRows =
        await Empresa.findAll({
          attributes: [
            "id",
            "razonSocial",
            "nombreComercial",
            "ruc",
            "correo",
            "telefono",
            "gerente",
            "correoGerente",
            "sector",
            "subSector",
            "numeroEmpleados",
            "logoUrl",
            "activo",
          ],

          order: [
            [
              "nombreComercial",
              "ASC",
            ],
            [
              "razonSocial",
              "ASC",
            ],
          ],
        });

      const sectionRows =
        await EmpresaSeccion.findAll({
          attributes: [
            "id",
            "empresaId",
            "nombre",
            "descripcion",
            "responsable",
            "correo",
            "telefono",
            "activo",
          ],

          order: [
            [
              "nombre",
              "ASC",
            ],
          ],
        });

      /* ===================================================
         EVALUACIONES PARA ANALÍTICA

         Quitamos empresaId y seccionId para que seleccionar
         una empresa en el dashboard no haga desaparecer
         las demás de esta vista.
      =================================================== */

      const analyticsFilters = {
        ...filters,
      };

      delete analyticsFilters.empresaId;
      delete analyticsFilters.seccionId;

      const where =
        buildEvaluationWhere(
          analyticsFilters,
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
          analyticsFilters
        );

      const evaluationsByCompany =
        new Map();

      const evaluationsBySection =
        new Map();

      for (
        const evaluation
        of evaluations
      ) {
        if (
          evaluation
            .empresaIdSnapshot
        ) {
          const companyId =
            String(
              evaluation
                .empresaIdSnapshot
            );

          if (
            !evaluationsByCompany.has(
              companyId
            )
          ) {
            evaluationsByCompany.set(
              companyId,
              []
            );
          }

          evaluationsByCompany
            .get(
              companyId
            )
            .push(
              evaluation
            );
        }

        if (
          evaluation
            .seccionIdSnapshot
        ) {
          const sectionId =
            String(
              evaluation
                .seccionIdSnapshot
            );

          if (
            !evaluationsBySection.has(
              sectionId
            )
          ) {
            evaluationsBySection.set(
              sectionId,
              []
            );
          }

          evaluationsBySection
            .get(
              sectionId
            )
            .push(
              evaluation
            );
        }
      }

      const sectionsByCompany =
        new Map();

      for (
        const section
        of sectionRows
      ) {
        const companyId =
          String(
            section.empresaId
          );

        if (
          !sectionsByCompany.has(
            companyId
          )
        ) {
          sectionsByCompany.set(
            companyId,
            []
          );
        }

        const sectionEvaluations =
          evaluationsBySection.get(
            String(
              section.id
            )
          ) ||
          [];

        sectionsByCompany
          .get(
            companyId
          )
          .push({
            id:
              section.id,

            empresaId:
              section.empresaId,

            nombre:
              section.nombre,

            descripcion:
              section.descripcion,

            responsable:
              section.responsable,

            correo:
              section.correo,

            telefono:
              section.telefono,

            activo:
              section.activo,

            totalResultados:
              sectionEvaluations.length,

            analytics:
              buildPsychometricAnalytics(
                sectionEvaluations
              ),
          });
      }

      const companies =
        companyRows.map(
          (
            company
          ) => {
            const companyId =
              String(
                company.id
              );

            const companyEvaluations =
              evaluationsByCompany.get(
                companyId
              ) ||
              [];

            return {
              id:
                company.id,

              razonSocial:
                company.razonSocial,

              nombreComercial:
                company.nombreComercial,

              nombre:
                company.nombreComercial ||
                company.razonSocial,

              ruc:
                company.ruc,

              correo:
                company.correo,

              telefono:
                company.telefono,

              gerente:
                company.gerente,

              correoGerente:
                company.correoGerente,

              sector:
                company.sector,

              subSector:
                company.subSector,

              numeroEmpleados:
                company.numeroEmpleados,

              logoUrl:
                company.logoUrl,

              activo:
                company.activo,

              totalResultados:
                companyEvaluations.length,

              analytics:
                buildPsychometricAnalytics(
                  companyEvaluations
                ),

              secciones:
                (
                  sectionsByCompany.get(
                    companyId
                  ) ||
                  []
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
            };
          }
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

            const demographics =
              getParticipantDemographics(
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

                dateBirth:
                  demographics
                    .dateBirth,

                genre:
                  demographics
                    .genre,

                edad:
                  demographics
                    .age,

                rangoEtario:
                  demographics
                    .ageGroup,

                rangoEtarioLabel:
                  demographics
                    .ageGroup
                    ? AGE_GROUP_LABELS[
                        demographics
                          .ageGroup
                      ]
                    : null,
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

      const demographics =
        getParticipantDemographics(
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
            snapshot.user
              ? {
                  ...snapshot.user,

                  genre:
                    demographics
                      .genre,

                  edad:
                    demographics
                      .age,

                  rangoEtario:
                    demographics
                      .ageGroup,

                  rangoEtarioLabel:
                    demographics
                      .ageGroup
                      ? AGE_GROUP_LABELS[
                          demographics
                            .ageGroup
                        ]
                      : null,
                }
              : null,

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
   7. GET /psychometric/dashboard/organizations/:empresaId/pdf-preview

   Vista previa administrativa del informe empresarial.
   - No guarda archivos.
   - No modifica datos.
   - Reutiliza el generador empresarial real.
   - Admite los mismos filtros empresariales enviados por query.
========================================================= */

const getPsychometricDashboardOrganizationPdfPreview =
  catchError(
    async (
      req,
      res
    ) => {
      const {
        empresaId,
      } = req.params;

      if (
        !empresaId
      ) {
        return res
          .status(400)
          .json({
            message:
              "El ID de la empresa es requerido.",
          });
      }

      /*
       * Solamente pasamos al generador los filtros
       * que realmente entiende el informe empresarial.
       *
       * El parámetro "v" lo usa el frontend únicamente
       * para evitar caché y no debe formar parte del análisis.
       */
      const filters = {
        seccionId:
          req.query
            .seccionId ||
          null,

        genero:
          req.query
            .genero ||
          null,

        rangoEtario:
          req.query
            .rangoEtario ||
          null,

        animodo:
          req.query
            .animodo ||
          null,

        comunicacion:
          req.query
            .comunicacion ||
          null,

        cerebro:
          req.query
            .cerebro ||
          null,

        negociacion:
          req.query
            .negociacion ||
          null,

        vak:
          req.query
            .vak ||
          null,

        persistencia:
          req.query
            .persistencia ||
          null,

        productividad:
          req.query
            .productividad ||
          null,

        personalidad:
          req.query
            .personalidad ||
          null,
      };

      /*
       * Eliminamos valores vacíos para que la portada
       * no muestre filtros que no están activos.
       */
      const cleanFilters =
        Object.fromEntries(
          Object.entries(
            filters
          ).filter(
            ([
              ,
              value,
            ]) =>
              value !==
                null &&
              value !==
                undefined &&
              String(
                value
              ).trim() !==
                ""
          )
        );

      const pdfBuffer =
        await generarInformePsicometricoEmpresa({
          empresaId,
          filters:
            cleanFilters,
        });

      const timestamp =
        Date.now();

      res.set({
        "Content-Type":
          "application/pdf",

        "Content-Disposition":
          `inline; filename="preview-informe-empresarial-${empresaId}-${timestamp}.pdf"`,

        "Content-Length":
          pdfBuffer.length,

        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",

        Pragma:
          "no-cache",

        Expires:
          "0",

        "Surrogate-Control":
          "no-store",
      });

      return res.send(
        pdfBuffer
      );
    }
  );

/* =========================================================
   7. PUT /psychometric/dashboard/participants/:evaluationId/organization

   VINCULAR / CORREGIR EMPRESA Y SECCIÓN DE UNA EVALUACIÓN

   Reglas:
   - Actualiza la empresa y sección actuales del User.
   - Actualiza el snapshot histórico SOLO de esta evaluación.
   - Si el User cambia después de empresa/sección, esta evaluación
     conserva la asignación guardada aquí.
   - Empresa y sección se validan antes de modificar datos.
   - Todo se ejecuta dentro de una transacción.
========================================================= */

const updatePsychometricDashboardParticipantOrganization =
  catchError(
    async (
      req,
      res
    ) => {
      const {
        evaluationId,
      } = req.params;

      const {
        empresaId,
        seccionId,
      } = req.body || {};

      if (
        !empresaId ||
        !seccionId
      ) {
        return res
          .status(400)
          .json({
            message:
              "Debe seleccionar una empresa y una sección.",
          });
      }

      const transaction =
        await sequelize.transaction();

      try {
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
              "empresaIdSnapshot",
              "seccionIdSnapshot",
              "participantSnapshot",
            ],

            transaction,

            lock:
              transaction.LOCK.UPDATE,
          });

        if (
          !evaluation
        ) {
          await transaction.rollback();

          return res
            .status(404)
            .json({
              message:
                "Evaluación psicométrica completada no encontrada.",
            });
        }

        const empresa =
          await Empresa.findOne({
            where: {
              id:
                empresaId,

              activo:
                true,
            },

            attributes: [
              "id",
              "razonSocial",
              "nombreComercial",
              "ruc",
              "ciudad",
              "provincia",
              "sector",
              "subSector",
            ],

            transaction,
          });

        if (
          !empresa
        ) {
          await transaction.rollback();

          return res
            .status(400)
            .json({
              message:
                "La empresa seleccionada no existe o no está activa.",
            });
        }

        const seccion =
          await EmpresaSeccion.findOne({
            where: {
              id:
                seccionId,

              empresaId:
                empresa.id,

              activo:
                true,
            },

            attributes: [
              "id",
              "empresaId",
              "nombre",
              "descripcion",
              "responsable",
            ],

            transaction,
          });

        if (
          !seccion
        ) {
          await transaction.rollback();

          return res
            .status(400)
            .json({
              message:
                "La sección seleccionada no pertenece a la empresa o no está activa.",
            });
        }

        const currentSnapshot =
          evaluation.participantSnapshot &&
          typeof evaluation.participantSnapshot ===
            "object"
            ? evaluation.participantSnapshot
            : {};

        const snapshotUserId =
          currentSnapshot.user
            ?.id ||
          null;

        if (
          !snapshotUserId
        ) {
          await transaction.rollback();

          return res
            .status(400)
            .json({
              message:
                "La evaluación no contiene el identificador histórico del usuario y no puede vincularse automáticamente.",
            });
        }

        const user =
          await User.findByPk(
            snapshotUserId,
            {
              transaction,
              lock:
                transaction.LOCK.UPDATE,
            }
          );

        if (
          !user
        ) {
          await transaction.rollback();

          return res
            .status(404)
            .json({
              message:
                "El usuario asociado a la evaluación ya no existe.",
            });
        }

        /* =================================================
           1. ACTUALIZAR VINCULACIÓN ACTUAL DEL USUARIO
        ================================================= */

        await user.update(
          {
            empresaId:
              empresa.id,

            seccionId:
              seccion.id,
          },
          {
            transaction,
          }
        );

        /* =================================================
           2. ACTUALIZAR SNAPSHOT HISTÓRICO DE ESTE TEST

           Los datos personales ya existentes en el snapshot
           se conservan. Solo se completa/corrige la pertenencia
           organizacional de esta evaluación.
        ================================================= */

        const participantSnapshot = {
          ...currentSnapshot,

          tipoParticipante:
            "empresa",

          user: {
            ...(currentSnapshot.user || {}),

            id:
              user.id,
          },

          empresa: {
            id:
              empresa.id,

            razonSocial:
              empresa.razonSocial ||
              null,

            nombreComercial:
              empresa.nombreComercial ||
              null,

            ruc:
              empresa.ruc ||
              null,

            ciudad:
              empresa.ciudad ||
              null,

            provincia:
              empresa.provincia ||
              null,

            sector:
              empresa.sector ||
              null,

            subSector:
              empresa.subSector ||
              null,
          },

          seccion: {
            id:
              seccion.id,

            nombre:
              seccion.nombre ||
              null,

            descripcion:
              seccion.descripcion ||
              null,

            responsable:
              seccion.responsable ||
              null,
          },

          /*
           * Conservamos snapshotAt si ya existía porque representa
           * la finalización original. Registramos aparte cuándo se
           * corrigió manualmente la vinculación organizacional.
           */
          snapshotAt:
            currentSnapshot.snapshotAt ||
            null,

          organizationLinkedAt:
            new Date().toISOString(),
        };

        await evaluation.update(
          {
            empresaIdSnapshot:
              empresa.id,

            seccionIdSnapshot:
              seccion.id,

            participantSnapshot,
          },
          {
            transaction,
          }
        );

        await transaction.commit();

        return res.json({
          message:
            "Empresa y sección vinculadas correctamente al participante y a esta evaluación.",

          data: {
            evaluationId:
              evaluation.id,

            user: {
              id:
                user.id,

              empresaId:
                empresa.id,

              seccionId:
                seccion.id,
            },

            empresa: {
              id:
                empresa.id,

              razonSocial:
                empresa.razonSocial,

              nombreComercial:
                empresa.nombreComercial,
            },

            seccion: {
              id:
                seccion.id,

              nombre:
                seccion.nombre,
            },

            evaluationSnapshot: {
              empresaIdSnapshot:
                empresa.id,

              seccionIdSnapshot:
                seccion.id,

              tipoParticipante:
                "empresa",
            },
          },
        });
      } catch (
        error
      ) {
        if (
          !transaction.finished
        ) {
          await transaction.rollback();
        }

        throw error;
      }
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

  updatePsychometricDashboardParticipantOrganization,

  getPsychometricDashboardOrganizationPdfPreview,
};