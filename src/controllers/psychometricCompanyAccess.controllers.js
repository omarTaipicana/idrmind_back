const crypto = require("crypto");
const { Op } = require("sequelize");

const catchError = require("../utils/catchError");
const sendEmail = require("../utils/sendEmail");

const generarInformePsicometricoEmpresa = require(
  "../utils/generarInformePsicometricoEmpresa"
);

const Empresa = require("../models/Empresa");
const PsychometricEvaluation = require(
  "../models/PsychometricEvaluation"
);
const PsychometricCompanyAccess = require(
  "../models/PsychometricCompanyAccess"
);

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://idrmind.com";

/* =========================================================
   UTILIDADES GENERALES
========================================================= */

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeText = (value) =>
  String(value || "")
    .trim();

const normalizeUpper = (value) =>
  normalizeText(value)
    .toUpperCase();

const createRawToken = () =>
  crypto
    .randomBytes(48)
    .toString("hex");

const hashToken = (token) =>
  crypto
    .createHash("sha256")
    .update(
      normalizeText(token)
    )
    .digest("hex");

const buildPublicUrl = (token) => {
  /*
   * El front actual utiliza rutas con #.
   * Ejemplo existente:
   * #/resultado-psicometrico-admin/:evaluationId
   */
  return `${FRONTEND_URL}/#/resultados-empresa/${token}`;
};

const getCompanyName = (empresa) =>
  empresa?.nombreComercial ||
  empresa?.razonSocial ||
  empresa?.nombre ||
  "Empresa";

const getCompanyEmail = (empresa) =>
  normalizeEmail(
    empresa?.correo ||
    empresa?.correoGerente
  );

const roundPercentage = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Number(
    parsed.toFixed(2)
  );
};

const roundNumber = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Number(
    parsed.toFixed(2)
  );
};

const getParticipantSnapshot = (
  evaluation
) =>
  evaluation?.participantSnapshot ||
  {};

const getSnapshotUser = (
  evaluation
) =>
  getParticipantSnapshot(
    evaluation
  )?.user ||
  {};

const getSnapshotCompany = (
  evaluation
) =>
  getParticipantSnapshot(
    evaluation
  )?.empresa ||
  {};

const getSnapshotSection = (
  evaluation
) =>
  getParticipantSnapshot(
    evaluation
  )?.seccion ||
  {};

const getParticipantName = (
  evaluation
) => {
  const user =
    getSnapshotUser(
      evaluation
    );

  return [
    user?.firstName,
    user?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() ||
    "Participante";
};

/* =========================================================
   DEMOGRAFÍA
========================================================= */

const AGE_GROUP_LABELS = {
  GEN_0: "Menor de 18",
  GEN_1: "18 - 35",
  GEN_2: "36 - 45",
  GEN_3: "46 en adelante",
};

const normalizeGenre = (value) => {
  const normalized =
    normalizeUpper(value);

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

  return normalized || null;
};

const parseDateOnly = (value) => {
  const raw =
    normalizeText(value);

  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
};

const getGuayaquilDateParts = (
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
    )
      .formatToParts(
        date
      )
      .reduce(
        (
          acc,
          part
        ) => {
          if (
            part.type !==
            "literal"
          ) {
            acc[
              part.type
            ] =
              Number(
                part.value
              );
          }

          return acc;
        },
        {}
      );

  return {
    year:
      parts.year,

    month:
      parts.month,

    day:
      parts.day,
  };
};

const calculateAgeAtEvaluation = (
  dateBirth,
  evaluation
) => {
  const birth =
    parseDateOnly(
      dateBirth
    );

  const reference =
    getGuayaquilDateParts(
      evaluation
        ?.fechaFinalizacion ||
      evaluation
        ?.createdAt
    );

  if (
    !birth ||
    !reference
  ) {
    return null;
  }

  let age =
    reference.year -
    birth.year;

  const beforeBirthday =
    reference.month <
      birth.month ||
    (
      reference.month ===
        birth.month &&
      reference.day <
        birth.day
    );

  if (
    beforeBirthday
  ) {
    age -= 1;
  }

  if (
    age < 0 ||
    age > 120
  ) {
    return null;
  }

  return age;
};

const getAgeGroup = (age) => {
  if (
    age === null ||
    age === undefined
  ) {
    return null;
  }

  if (age < 18) {
    return "GEN_0";
  }

  if (age <= 35) {
    return "GEN_1";
  }

  if (age <= 45) {
    return "GEN_2";
  }

  return "GEN_3";
};

const getDemographics = (
  evaluation
) => {
  const user =
    getSnapshotUser(
      evaluation
    );

  const genre =
    normalizeGenre(
      user?.genre
    );

  const dateBirth =
    user?.dateBirth ||
    null;

  const age =
    calculateAgeAtEvaluation(
      dateBirth,
      evaluation
    );

  const ageGroup =
    getAgeGroup(
      age
    );

  return {
    genre,
    dateBirth,
    age,
    ageGroup,

    ageGroupLabel:
      ageGroup
        ? AGE_GROUP_LABELS[
            ageGroup
          ]
        : null,
  };
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
    Number(
      container[key] ||
      0
    ) + 1;
};

const objectDistribution = (
  object,
  total
) =>
  Object.entries(
    object ||
    {}
  )
    .map(
      ([
        key,
        cantidad,
      ]) => ({
        key,
        label:
          AGE_GROUP_LABELS[
            key
          ] ||
          key,

        cantidad:
          Number(
            cantidad ||
            0
          ),

        porcentaje:
          total > 0
            ? roundPercentage(
                (
                  Number(
                    cantidad ||
                    0
                  ) /
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

/* =========================================================
   FILTROS CRUZADOS DEL DASHBOARD PÚBLICO EMPRESARIAL

   IMPORTANTE PARA ANIMODO:
   Los resultados intermedios "ENTRE ..." se agrupan
   como CAMALEON, igual que en el dashboard administrativo.
========================================================= */

const getPublicAnimodoCategory = (
  result = {}
) => {
  const rawValue =
    result?.animodo
      ?.animal ||
    result?.animodoCategoria ||
    result?.animodo
      ?.personalityAnimal ||
    null;

  if (!rawValue) {
    return null;
  }

  const normalized =
    normalizeText(
      rawValue
    )
      .trim()
      .toUpperCase();

  if (
    normalized.startsWith(
      "ENTRE "
    )
  ) {
    return "CAMALEON";
  }

  return rawValue;
};

const getPersonalityKey = (
  result = {}
) => {
  return (
    result?.personality
      ?.nombre ||
    result?.personality
      ?.codigo ||
    result?.personality
      ?.animal ||
    null
  );
};

const evaluationMatchesPublicFilters = (
  evaluation,
  filters = {}
) => {
  const result =
    evaluation?.resultado ||
    {};

  const demographics =
    getDemographics(
      evaluation
    );

  const {
    seccionId,
    genero,
    rangoEtario,
    animodo,
    comunicacion,
    cerebro,
    negociacion,
    vak,
    persistencia,
    productividad,
    personalidad,
  } = filters;

  if (
    seccionId &&
    String(
      evaluation
        ?.seccionIdSnapshot ||
      ""
    ) !==
      String(
        seccionId
      )
  ) {
    return false;
  }

  if (
    genero &&
    String(
      demographics.genre ||
      ""
    ) !==
      String(
        genero
      )
  ) {
    return false;
  }

  if (
    rangoEtario &&
    String(
      demographics.ageGroup ||
      ""
    ) !==
      String(
        rangoEtario
      )
  ) {
    return false;
  }

  if (
    animodo &&
    String(
      getPublicAnimodoCategory(
        result
      ) ||
      ""
    ) !==
      String(
        animodo
      )
  ) {
    return false;
  }

  if (
    comunicacion &&
    String(
      result?.communication
        ?.dominantColor ||
      ""
    ) !==
      String(
        comunicacion
      )
  ) {
    return false;
  }

  if (
    cerebro &&
    String(
      result?.brain
        ?.brainCategory ||
      ""
    ) !==
      String(
        cerebro
      )
  ) {
    return false;
  }

  if (
    negociacion &&
    String(
      result?.negotiation
        ?.classification ||
      ""
    ) !==
      String(
        negociacion
      )
  ) {
    return false;
  }

  if (
    vak &&
    String(
      result?.vak
        ?.dominantStyle ||
      ""
    ) !==
      String(
        vak
      )
  ) {
    return false;
  }

  if (
    persistencia &&
    String(
      result?.persistence
        ?.level ||
      ""
    ) !==
      String(
        persistencia
      )
  ) {
    return false;
  }

  if (
    productividad &&
    String(
      result?.productivityIndex
        ?.classification ||
      ""
    ) !==
      String(
        productividad
      )
  ) {
    return false;
  }

  if (
    personalidad &&
    String(
      getPersonalityKey(
        result
      ) ||
      ""
    ) !==
      String(
        personalidad
      )
  ) {
    return false;
  }

  return true;
};

const applyPublicPsychometricFilters = (
  evaluations = [],
  filters = {}
) => {
  return evaluations.filter(
    (
      evaluation
    ) =>
      evaluationMatchesPublicFilters(
        evaluation,
        filters
      )
  );
};

/* =========================================================
   ANALÍTICA EMPRESARIAL

   Se calcula únicamente con evaluaciones completadas
   que tengan resultado y pertenezcan a la empresa
   asociada al token.
========================================================= */

const buildPsychometricAnalytics = (
  evaluations = []
) => {
  const total =
    evaluations.length;

  const counters = {
    genero: {},
    rangoEtario: {},
    animodo: {},
    comunicacion: {},
    cerebro: {},
    negociacion: {},
    vak: {},
    persistencia: {},
    productividad: {},
    personalidad: {},
  };

  const communicationSums = {};
  const brainSums = {};
  const vakSums = {};

  let communicationCount = 0;
  let brainCount = 0;
  let vakCount = 0;

  let negotiationScoreSum = 0;
  let negotiationCount = 0;

  let persistenceScoreSum = 0;
  let persistenceCount = 0;

  let productivityPercentageSum = 0;
  let productivityScoreSum = 0;
  let productivityCount = 0;

  for (
    const evaluation
    of evaluations
  ) {
    const result =
      evaluation?.resultado ||
      {};

    const demographics =
      getDemographics(
        evaluation
      );

    increment(
      counters.genero,
      demographics.genre
    );

    increment(
      counters.rangoEtario,
      demographics.ageGroup
    );

    /* ANIMODO */

    const animodoKey =
      getPublicAnimodoCategory(
        result
      );

    increment(
      counters.animodo,
      animodoKey
    );

    /* COMUNICACIÓN */

    increment(
      counters.comunicacion,
      result?.communication
        ?.dominantColor
    );

    const communicationPercentages =
      result?.communication
        ?.percentages ||
      {};

    if (
      Object.keys(
        communicationPercentages
      ).length
    ) {
      for (
        const [
          key,
          value,
        ] of Object.entries(
          communicationPercentages
        )
      ) {
        communicationSums[key] =
          Number(
            communicationSums[
              key
            ] ||
            0
          ) +
          Number(
            value ||
            0
          );
      }

      communicationCount +=
        1;
    }

    /* CEREBRO */

    increment(
      counters.cerebro,
      result?.brain
        ?.brainCategory
    );

    const brainPercentages =
      result?.brain
        ?.percentages ||
      {};

    if (
      Object.keys(
        brainPercentages
      ).length
    ) {
      for (
        const [
          key,
          value,
        ] of Object.entries(
          brainPercentages
        )
      ) {
        brainSums[key] =
          Number(
            brainSums[
              key
            ] ||
            0
          ) +
          Number(
            value ||
            0
          );
      }

      brainCount += 1;
    }

    /* NEGOCIACIÓN */

    increment(
      counters.negociacion,
      result?.negotiation
        ?.classification
    );

    if (
      result?.negotiation
        ?.totalScore !==
        null &&
      result?.negotiation
        ?.totalScore !==
        undefined
    ) {
      negotiationScoreSum +=
        Number(
          result.negotiation
            .totalScore ||
          0
        );

      negotiationCount +=
        1;
    }

    /* VAK */

    increment(
      counters.vak,
      result?.vak
        ?.dominantStyle
    );

    const vakPercentages =
      result?.vak
        ?.percentages ||
      {};

    if (
      Object.keys(
        vakPercentages
      ).length
    ) {
      for (
        const [
          key,
          value,
        ] of Object.entries(
          vakPercentages
        )
      ) {
        vakSums[key] =
          Number(
            vakSums[
              key
            ] ||
            0
          ) +
          Number(
            value ||
            0
          );
      }

      vakCount += 1;
    }

    /* PERSISTENCIA */

    increment(
      counters.persistencia,
      result?.persistence
        ?.level
    );

    if (
      result?.persistence
        ?.score !==
        null &&
      result?.persistence
        ?.score !==
        undefined
    ) {
      persistenceScoreSum +=
        Number(
          result.persistence
            .score ||
          0
        );

      persistenceCount +=
        1;
    }

    /* PRODUCTIVIDAD */

    increment(
      counters.productividad,
      result?.productivityIndex
        ?.classification
    );

    if (
      result?.productivityIndex
        ?.percentage !==
        null &&
      result?.productivityIndex
        ?.percentage !==
        undefined
    ) {
      productivityPercentageSum +=
        Number(
          result.productivityIndex
            .percentage ||
          0
        );

      productivityScoreSum +=
        Number(
          result.productivityIndex
            .score ||
          0
        );

      productivityCount +=
        1;
    }

    /* PERSONALIDAD */

    const personality =
      result?.personality;

    const personalityKey =
      personality?.nombre ||
      personality?.codigo ||
      personality?.animal ||
      null;

    increment(
      counters.personalidad,
      personalityKey
    );
  }

  const averageObject = (
    sums,
    count
  ) =>
    Object.fromEntries(
      Object.entries(
        sums
      ).map(
        ([
          key,
          value,
        ]) => [
          key,
          count > 0
            ? roundPercentage(
                value /
                  count
              )
            : 0,
        ]
      )
    );

  return {
    totalResultados:
      total,

    genero: {
      distribution:
        objectDistribution(
          counters.genero,
          total
        ),
    },

    rangoEtario: {
      distribution:
        objectDistribution(
          counters.rangoEtario,
          total
        ),
    },

    animodo: {
      distribution:
        objectDistribution(
          counters.animodo,
          total
        ),
    },

    comunicacion: {
      distribution:
        objectDistribution(
          counters.comunicacion,
          total
        ),

      averagePercentages:
        averageObject(
          communicationSums,
          communicationCount
        ),
    },

    cerebro: {
      distribution:
        objectDistribution(
          counters.cerebro,
          total
        ),

      averagePercentages:
        averageObject(
          brainSums,
          brainCount
        ),
    },

    negociacion: {
      distribution:
        objectDistribution(
          counters.negociacion,
          total
        ),

      promedioPuntaje:
        negotiationCount > 0
          ? roundNumber(
              negotiationScoreSum /
                negotiationCount
            )
          : 0,
    },

    vak: {
      distribution:
        objectDistribution(
          counters.vak,
          total
        ),

      averagePercentages:
        averageObject(
          vakSums,
          vakCount
        ),
    },

    persistencia: {
      distribution:
        objectDistribution(
          counters.persistencia,
          total
        ),

      promedioPuntaje:
        persistenceCount > 0
          ? roundNumber(
              persistenceScoreSum /
                persistenceCount
            )
          : 0,
    },

    productividad: {
      distribution:
        objectDistribution(
          counters.productividad,
          total
        ),

      promedioPuntaje:
        productivityCount > 0
          ? roundNumber(
              productivityScoreSum /
                productivityCount
            )
          : 0,

      promedioPorcentaje:
        productivityCount > 0
          ? roundPercentage(
              productivityPercentageSum /
                productivityCount
            )
          : 0,
    },

    personalidad: {
      distribution:
        objectDistribution(
          counters.personalidad,
          total
        ),
    },
  };
};

/* =========================================================
   SECCIONES EMPRESARIALES
========================================================= */

const buildCompanySections = (
  evaluations = []
) => {
  const map =
    new Map();

  for (
    const evaluation
    of evaluations
  ) {
    const sectionId =
      evaluation
        ?.seccionIdSnapshot;

    if (!sectionId) {
      continue;
    }

    const snapshot =
      getSnapshotSection(
        evaluation
      );

    const key =
      String(
        sectionId
      );

    if (
      !map.has(
        key
      )
    ) {
      map.set(
        key,
        {
          id:
            sectionId,

          nombre:
            snapshot?.nombre ||
            "Sección",

          totalResultados:
            0,
        }
      );
    }

    map.get(
      key
    ).totalResultados +=
      1;
  }

  return Array.from(
    map.values()
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
        ),
        "es"
      )
  );
};

const buildSectionAnalytics = (
  evaluations = []
) => {
  const sections =
    buildCompanySections(
      evaluations
    );

  const total =
    evaluations.length;

  return {
    distribution:
      sections.map(
        (
          section
        ) => ({
          key:
            String(
              section.id
            ),

          label:
            section.nombre,

          cantidad:
            Number(
              section.totalResultados ||
              0
            ),

          porcentaje:
            total > 0
              ? roundPercentage(
                  (
                    Number(
                      section.totalResultados ||
                      0
                    ) /
                    total
                  ) *
                    100
                )
              : 0,
        })
      ),
  };
};

/* =========================================================
   SERIALIZAR RESULTADO RESUMIDO DE PARTICIPANTE
========================================================= */

const serializeParticipantResult = (
  evaluation
) => {
  const result =
    evaluation?.resultado ||
    {};

  const demographics =
    getDemographics(
      evaluation
    );

  const user =
    getSnapshotUser(
      evaluation
    );

  const section =
    getSnapshotSection(
      evaluation
    );

  return {
    evaluationId:
      evaluation.id,

    participante: {
      nombreCompleto:
        getParticipantName(
          evaluation
        ),

      email:
        user?.email ||
        null,

      cI:
        user?.cI ||
        null,

      genre:
        demographics.genre,

      dateBirth:
        demographics.dateBirth,

      edad:
        demographics.age,

      rangoEtario:
        demographics.ageGroup,

      rangoEtarioLabel:
        demographics
          .ageGroupLabel,
    },

    seccion:
      evaluation
        ?.seccionIdSnapshot
        ? {
            id:
              evaluation
                .seccionIdSnapshot,

            nombre:
              section?.nombre ||
              "Sección",
          }
        : null,

    resultado: {
      animodo:
        result?.animodo
          ?.animal ||
        null,

      animodoCategoria:
        result?.animodoCategoria ||
        result?.animodo
          ?.animal ||
        null,

      comunicacion:
        result?.communication
          ?.dominantColor ||
        null,

      cerebro:
        result?.brain
          ?.brainCategory ||
        null,

      cerebroTipo:
        result?.brain
          ?.brainType ||
        null,

      negociacion:
        result?.negotiation
          ?.classification ||
        null,

      negociacionPuntaje:
        result?.negotiation
          ?.totalScore ??
        null,

      vak:
        result?.vak
          ?.dominantStyle ||
        null,

      vakEmpate:
        Boolean(
          result?.vak
            ?.tied
        ),

      vakEmpates:
        result?.vak
          ?.tiedCategories ||
        [],

      persistencia:
        result?.persistence
          ?.level ||
        null,

      persistenciaPuntaje:
        result?.persistence
          ?.score ??
        null,

      productividad:
        result
          ?.productivityIndex
          ?.classification ||
        null,

      productividadPorcentaje:
        result
          ?.productivityIndex
          ?.percentage ??
        0,

      personalidad:
        result?.personality
          ?.nombre ||
        result?.personality
          ?.codigo ||
        null,
    },

    fechaFinalizacion:
      evaluation
        .fechaFinalizacion,

    publicPath:
      `/resultados-empresa/:token/participante/${evaluation.id}`,
  };
};

/* =========================================================
   ESTADO DEL ACCESO
========================================================= */

const serializeAccessStatus = (
  access
) => {
  if (!access) {
    return {
      exists: false,
      activo: false,
      expired: false,
      revoked: false,
      accessCount: 0,
      cantidadEnvios: 0,
      ultimoEnvioAt: null,
      firstUsedAt: null,
      lastUsedAt: null,
      expiresAt: null,
      createdAt: null,
    };
  }

  const expired =
    Boolean(
      access.expiresAt &&
      new Date(
        access.expiresAt
      ).getTime() <
        Date.now()
    );

  return {
    exists: true,

    id:
      access.id,

    activo:
      Boolean(
        access.activo
      ) &&
      !access.revokedAt &&
      !expired,

    storedActivo:
      Boolean(
        access.activo
      ),

    expired,

    revoked:
      Boolean(
        access.revokedAt
      ),

    accessCount:
      Number(
        access.accessCount ||
        0
      ),

    cantidadEnvios:
      Number(
        access.cantidadEnvios ||
        0
      ),

    ultimoEnvioAt:
      access.ultimoEnvioAt ||
      null,

    firstUsedAt:
      access.firstUsedAt ||
      null,

    lastUsedAt:
      access.lastUsedAt ||
      null,

    expiresAt:
      access.expiresAt ||
      null,

    revokedAt:
      access.revokedAt ||
      null,

    createdAt:
      access.createdAt ||
      null,
  };
};

const getLatestCompanyAccess = async (
  empresaId
) =>
  PsychometricCompanyAccess.findOne(
    {
      where: {
        empresaId,
      },

      order: [
        [
          "createdAt",
          "DESC",
        ],
      ],
    }
  );

/* =========================================================
   VALIDAR TOKEN EMPRESARIAL

   IMPORTANTE:
   empresaId SIEMPRE sale del token.
   Nunca se toma un empresaId enviado por el frontend.
========================================================= */

const getValidCompanyAccessByToken =
  async (
    rawToken,
    {
      registerUse =
        false,
    } = {}
  ) => {
    const token =
      normalizeText(
        rawToken
      );

    if (
      !token ||
      token.length < 40
    ) {
      const error =
        new Error(
          "El enlace empresarial no es válido."
        );

      error.statusCode =
        400;

      error.code =
        "INVALID_COMPANY_TOKEN";

      throw error;
    }

    const tokenHash =
      hashToken(
        token
      );

    const access =
      await PsychometricCompanyAccess.findOne(
        {
          where: {
            tokenHash,
          },
        }
      );

    if (!access) {
      const error =
        new Error(
          "El enlace empresarial no existe o ya fue reemplazado."
        );

      error.statusCode =
        404;

      error.code =
        "COMPANY_ACCESS_NOT_FOUND";

      throw error;
    }

    if (
      !access.activo ||
      access.revokedAt
    ) {
      const error =
        new Error(
          "El acceso a los resultados de la empresa está desactivado."
        );

      error.statusCode =
        410;

      error.code =
        "COMPANY_ACCESS_INACTIVE";

      throw error;
    }

    if (
      access.expiresAt &&
      new Date(
        access.expiresAt
      ).getTime() <
        Date.now()
    ) {
      const error =
        new Error(
          "El acceso a los resultados de la empresa ha expirado."
        );

      error.statusCode =
        410;

      error.code =
        "COMPANY_ACCESS_EXPIRED";

      throw error;
    }

    const empresa =
      await Empresa.findByPk(
        access.empresaId
      );

    if (!empresa) {
      const error =
        new Error(
          "La empresa asociada al enlace ya no existe."
        );

      error.statusCode =
        404;

      error.code =
        "COMPANY_NOT_FOUND";

      throw error;
    }

    if (
      registerUse
    ) {
      const now =
        new Date();

      await access.update(
        {
          firstUsedAt:
            access.firstUsedAt ||
            now,

          lastUsedAt:
            now,

          accessCount:
            Number(
              access.accessCount ||
              0
            ) + 1,
        }
      );
    }

    return {
      access,
      empresa,
    };
  };

/* =========================================================
   CARGAR RESULTADOS DE UNA EMPRESA
========================================================= */

const getCompanyEvaluations = async (
  empresaId
) =>
  PsychometricEvaluation.findAll(
    {
      where: {
        empresaIdSnapshot:
          empresaId,

        estado:
          "completada",

        resultado: {
          [Op.ne]:
            null,
        },
      },

      attributes: [
        "id",
        "numeroEvaluacion",
        "estado",
        "empresaIdSnapshot",
        "seccionIdSnapshot",
        "participantSnapshot",
        "resultado",
        "fechaFinalizacion",
        "createdAt",
      ],

      order: [
        [
          "fechaFinalizacion",
          "DESC",
        ],

        [
          "createdAt",
          "DESC",
        ],
      ],
    }
  );

/* =========================================================
   ADMIN
   GET /psychometric/dashboard/organizations/:empresaId/access
========================================================= */

const getCompanyAccessStatus =
  catchError(
    async (
      req,
      res
    ) => {
      const {
        empresaId,
      } =
        req.params;

      const empresa =
        await Empresa.findByPk(
          empresaId
        );

      if (!empresa) {
        return res
          .status(404)
          .json({
            message:
              "La empresa no existe.",
          });
      }

      const access =
        await getLatestCompanyAccess(
          empresaId
        );

      return res.json({
        message:
          "Estado de acceso empresarial obtenido correctamente.",

        empresa: {
          id:
            empresa.id,

          nombre:
            getCompanyName(
              empresa
            ),

          razonSocial:
            empresa.razonSocial ||
            null,

          nombreComercial:
            empresa.nombreComercial ||
            null,

          correo:
            empresa.correo ||
            null,

          correoGerente:
            empresa.correoGerente ||
            null,
        },

        access:
          serializeAccessStatus(
            access
          ),
      });
    }
  );

/* =========================================================
   ADMIN
   POST /psychometric/dashboard/organizations/:empresaId/access/send
========================================================= */

const sendCompanyAccessEmail =
  catchError(
    async (
      req,
      res
    ) => {
      const {
        empresaId,
      } =
        req.params;

      const empresa =
        await Empresa.findByPk(
          empresaId
        );

      if (!empresa) {
        return res
          .status(404)
          .json({
            message:
              "La empresa no existe.",
          });
      }

      const email =
        getCompanyEmail(
          empresa
        );

      if (!email) {
        return res
          .status(400)
          .json({
            message:
              "La empresa no tiene un correo registrado para enviar el acceso.",
          });
      }

      const previousAccess =
        await getLatestCompanyAccess(
          empresaId
        );

      const previousSendCount =
        Number(
          previousAccess
            ?.cantidadEnvios ||
          0
        );

      await PsychometricCompanyAccess.update(
        {
          activo:
            false,

          revokedAt:
            new Date(),
        },

        {
          where: {
            empresaId,

            activo:
              true,
          },
        }
      );

      const rawToken =
        createRawToken();

      const tokenHash =
        hashToken(
          rawToken
        );

      const now =
        new Date();

      const access =
        await PsychometricCompanyAccess.create(
          {
            empresaId,

            tokenHash,

            /*
             * null = acceso sin caducidad automática.
             * Solo deja de funcionar al desactivarlo
             * o cuando se genera un enlace nuevo.
             */
            expiresAt:
              null,

            activo:
              true,

            revokedAt:
              null,

            ultimoEnvioAt:
              now,

            cantidadEnvios:
              previousSendCount +
              1,
          }
        );

      const publicUrl =
        buildPublicUrl(
          rawToken
        );

      const companyName =
        getCompanyName(
          empresa
        );

      const html = `
        <div style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#263238;">
          <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
            <div style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 34px rgba(19,42,80,.12);">

              <div style="background:linear-gradient(135deg,#0a2540,#174a8c);padding:28px 30px;text-align:center;">
                <img
                  src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1760413741/1_qvykyo.png"
                  alt="iDr.Mind"
                  style="max-width:220px;width:70%;height:auto;"
                />
              </div>

              <div style="padding:30px;">
                <h2 style="margin:0 0 12px;color:#1B326B;font-size:24px;">
                  Resultados psicométricos empresariales
                </h2>

                <p style="margin:0 0 16px;line-height:1.7;">
                  Se ha habilitado el acceso a los resultados psicométricos de
                  <strong>${companyName}</strong>.
                </p>

                <p style="margin:0 0 22px;line-height:1.7;color:#5b6575;">
                  Desde este acceso podrá consultar los resultados generales de la organización,
                  resultados por secciones y los resultados individuales de los participantes
                  asociados a su empresa.
                </p>

                <div style="text-align:center;margin:28px 0;">
                  <a
                    href="${publicUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="display:inline-block;background:#1B326B;color:#ffffff;text-decoration:none;padding:15px 26px;border-radius:10px;font-weight:700;"
                  >
                    Ver resultados de mi empresa
                  </a>
                </div>

                <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#7a8493;">
                  Este enlace es de uso exclusivo de la empresa. Si el administrador de iDr.Mind
                  desactiva o reemplaza el acceso, el enlace dejará de funcionar.
                </p>
              </div>

              <div style="padding:18px 30px;background:#f6f8fb;text-align:center;color:#8490a0;font-size:12px;">
                iDr.Mind · Proyecto Pensar
              </div>

            </div>
          </div>
        </div>
      `;

      try {
        await sendEmail({
          to: email,

          subject:
            "Acceso a resultados psicométricos - iDr.Mind",

          html,
        });
      } catch (emailError) {
        /*
         * Si el correo falla:
         * - eliminamos el token nuevo que nunca llegó;
         * - restauramos el acceso anterior, si existía.
         *
         * Así no dejamos a la empresa con un enlace
         * desconocido activo ni perdemos el enlace anterior.
         */
        await access.destroy();

        if (previousAccess) {
          await previousAccess.update({
            activo: true,
            revokedAt: null,
          });
        }

        throw emailError;
      }

      return res.json({
        message:
          "Acceso empresarial enviado correctamente.",

        empresa: {
          id:
            empresa.id,

          nombre:
            companyName,

          correo:
            email,
        },

        access:
          serializeAccessStatus(
            access
          ),
      });
    }
  );

/* =========================================================
   ADMIN
   PATCH /psychometric/dashboard/organizations/:empresaId/access
========================================================= */

const setCompanyAccessActive =
  catchError(
    async (
      req,
      res
    ) => {
      const {
        empresaId,
      } =
        req.params;

      const {
        activo,
      } =
        req.body;

      if (
        typeof activo !==
        "boolean"
      ) {
        return res
          .status(400)
          .json({
            message:
              "El campo activo debe ser booleano.",
          });
      }

      const empresa =
        await Empresa.findByPk(
          empresaId
        );

      if (!empresa) {
        return res
          .status(404)
          .json({
            message:
              "La empresa no existe.",
          });
      }

      const access =
        await getLatestCompanyAccess(
          empresaId
        );

      if (!access) {
        return res
          .status(404)
          .json({
            message:
              "La empresa todavía no tiene un acceso generado.",
          });
      }

      await access.update(
        {
          activo,

          revokedAt:
            activo
              ? null
              : new Date(),
        }
      );

      return res.json({
        message:
          activo
            ? "Acceso empresarial activado correctamente."
            : "Acceso empresarial desactivado correctamente.",

        empresa: {
          id:
            empresa.id,

          nombre:
            getCompanyName(
              empresa
            ),
        },

        access:
          serializeAccessStatus(
            access
          ),
      });
    }
  );

/* =========================================================
   PÚBLICO
   GET /psychometric/company-results/:token

   Devuelve:
   - empresa
   - resumen
   - analítica general
   - secciones
   - participantes paginados
========================================================= */

const getPublicCompanyResults =
  catchError(
    async (
      req,
      res
    ) => {
      const {
        token,
      } =
        req.params;

      const {
        page = 1,
        limit = 20,
        search = "",
        seccionId = "",

        genero = "",
        rangoEtario = "",
        animodo = "",
        comunicacion = "",
        cerebro = "",
        negociacion = "",
        vak = "",
        persistencia = "",
        productividad = "",
        personalidad = "",
      } =
        req.query;

      const {
        access,
        empresa,
      } =
        await getValidCompanyAccessByToken(
          token,
          {
            registerUse:
              true,
          }
        );

      /*
       * SEGURIDAD:
       * El universo siempre sale del empresaId
       * contenido en el token.
       * Ningún filtro del front puede cambiar empresa.
       */
      const allEvaluations =
        await getCompanyEvaluations(
          empresa.id
        );

      /*
       * Catálogo completo de secciones.
       * Se mantiene estable aunque existan filtros cruzados.
       */
      const sections =
        buildCompanySections(
          allEvaluations
        );

      const publicFilters = {
        seccionId,
        genero,
        rangoEtario,
        animodo,
        comunicacion,
        cerebro,
        negociacion,
        vak,
        persistencia,
        productividad,
        personalidad,
      };

      /*
       * Universo dinámico.
       * Aquí se aplican todos los filtros cruzados.
       */
      let filteredEvaluations =
        applyPublicPsychometricFilters(
          allEvaluations,
          publicFilters
        );

      const analytics =
        buildPsychometricAnalytics(
          filteredEvaluations
        );

      /*
       * Secciones también son una dimensión analítica:
       * - cambia al filtrar género/Animodo/etc.
       * - al hacer clic en una sección filtra todo el dashboard.
       */
      analytics.secciones =
        buildSectionAnalytics(
          filteredEvaluations
        );

      /*
       * El listado de personas usa exactamente
       * el mismo universo filtrado que los gráficos.
       */
      let participantEvaluations =
        [...filteredEvaluations];

      const searchNormalized =
        normalizeText(
          search
        )
          .toLowerCase();

      if (
        searchNormalized
      ) {
        participantEvaluations =
          participantEvaluations.filter(
            (
              evaluation
            ) => {
              const user =
                getSnapshotUser(
                  evaluation
                );

              const haystack = [
                getParticipantName(
                  evaluation
                ),

                user?.email,
                user?.cI,

                getSnapshotSection(
                  evaluation
                )?.nombre,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              return haystack.includes(
                searchNormalized
              );
            }
          );
      }

      const numericLimit =
        Math.min(
          100,
          Math.max(
            1,
            Number(limit) ||
              20
          )
        );

      const totalParticipants =
        participantEvaluations
          .length;

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            totalParticipants /
              numericLimit
          )
        );

      const numericPage =
        Math.min(
          totalPages,
          Math.max(
            1,
            Number(page) ||
              1
          )
        );

      const start =
        (
          numericPage -
          1
        ) *
        numericLimit;

      const pageRows =
        participantEvaluations.slice(
          start,
          start +
            numericLimit
        );

      const companySnapshot =
        allEvaluations.length
          ? getSnapshotCompany(
              allEvaluations[0]
            )
          : {};

      return res.json({
        valid:
          true,

        empresa: {
          id:
            empresa.id,

          razonSocial:
            empresa.razonSocial ||
            companySnapshot
              ?.razonSocial ||
            null,

          nombreComercial:
            empresa.nombreComercial ||
            companySnapshot
              ?.nombreComercial ||
            null,

          nombre:
            getCompanyName(
              empresa
            ),

          sector:
            empresa.sector ||
            companySnapshot
              ?.sector ||
            null,

          subSector:
            empresa.subSector ||
            companySnapshot
              ?.subSector ||
            null,

          logoUrl:
            empresa.logoUrl ||
            null,
        },

        access: {
          activo:
            true,

          lastUsedAt:
            access.lastUsedAt,

          accessCount:
            Number(
              access.accessCount ||
              0
            ),
        },

        summary: {
          /*
           * KPI dinámico:
           * refleja los filtros activos.
           */
          totalResultados:
            filteredEvaluations
              .length,

          /*
           * Total estructural de secciones
           * de la empresa, no desaparece al filtrar.
           */
          totalSecciones:
            sections.length,

          productividadPromedio:
            analytics
              ?.productividad
              ?.promedioPorcentaje ||
            0,

          negociacionPromedio:
            analytics
              ?.negociacion
              ?.promedioPuntaje ||
            0,

          persistenciaPromedio:
            analytics
              ?.persistencia
              ?.promedioPuntaje ||
            0,
        },

        analytics,

        /*
         * Secciones completas para mantener
         * las opciones disponibles.
         */
        secciones:
          sections,

        filters:
          publicFilters,

        participants: {
          data:
            pageRows.map(
              serializeParticipantResult
            ),

          pagination: {
            page:
              numericPage,

            limit:
              numericLimit,

            total:
              totalParticipants,

            totalPages,

            hasPrevious:
              numericPage >
              1,

            hasNext:
              numericPage <
              totalPages,
          },

          filters: {
            search:
              search ||
              "",

            ...publicFilters,
          },
        },
      });
    }
  );

/* =========================================================
   PÚBLICO
   GET /psychometric/company-results/:token/participants/:evaluationId

   SEGURIDAD:
   No basta con que evaluationId exista.
   La evaluación DEBE pertenecer al empresaId del token.
========================================================= */

const getPublicCompanyParticipantResult =
  catchError(
    async (
      req,
      res
    ) => {
      const {
        token,
        evaluationId,
      } =
        req.params;

      const {
        access,
        empresa,
      } =
        await getValidCompanyAccessByToken(
          token,
          {
            registerUse:
              true,
          }
        );

      const evaluation =
        await PsychometricEvaluation.findOne(
          {
            where: {
              id:
                evaluationId,

              empresaIdSnapshot:
                empresa.id,

              estado:
                "completada",

              resultado: {
                [Op.ne]:
                  null,
              },
            },

            attributes: [
              "id",
              "numeroEvaluacion",
              "estado",
              "testId",
              "testVersion",
              "empresaIdSnapshot",
              "seccionIdSnapshot",
              "participantSnapshot",
              "resultado",
              "fechaHabilitacion",
              "fechaInicio",
              "fechaFinalizacion",
              "puntajeTotal",
              "createdAt",
              "updatedAt",
            ],
          }
        );

      if (
        !evaluation
      ) {
        return res
          .status(404)
          .json({
            message:
              "El resultado no existe o no pertenece a esta empresa.",

            code:
              "COMPANY_PARTICIPANT_RESULT_NOT_FOUND",
          });
      }

      const user =
        getSnapshotUser(
          evaluation
        );

      const section =
        getSnapshotSection(
          evaluation
        );

      const demographics =
        getDemographics(
          evaluation
        );

      return res.json({
        valid:
          true,

        empresa: {
          id:
            empresa.id,

          nombre:
            getCompanyName(
              empresa
            ),

          razonSocial:
            empresa.razonSocial ||
            null,

          nombreComercial:
            empresa.nombreComercial ||
            null,

          logoUrl:
            empresa.logoUrl ||
            null,
        },

        access: {
          activo:
            true,

          lastUsedAt:
            access.lastUsedAt,
        },

        evaluation: {
          id:
            evaluation.id,

          numeroEvaluacion:
            evaluation
              .numeroEvaluacion,

          estado:
            evaluation.estado,

          testId:
            evaluation.testId,

          testVersion:
            evaluation.testVersion,

          fechaHabilitacion:
            evaluation
              .fechaHabilitacion,

          fechaInicio:
            evaluation
              .fechaInicio,

          fechaFinalizacion:
            evaluation
              .fechaFinalizacion,

          puntajeTotal:
            evaluation
              .puntajeTotal,

          createdAt:
            evaluation.createdAt,
        },

        user: {
          id:
            user?.id ||
            null,

          cI:
            user?.cI ||
            null,

          email:
            user?.email ||
            null,

          firstName:
            user?.firstName ||
            null,

          lastName:
            user?.lastName ||
            null,

          cellular:
            user?.cellular ||
            null,

          genre:
            demographics.genre,

          dateBirth:
            demographics.dateBirth,

          edad:
            demographics.age,

          rangoEtario:
            demographics.ageGroup,

          rangoEtarioLabel:
            demographics
              .ageGroupLabel,

          empresa: {
            id:
              empresa.id,

            nombre:
              getCompanyName(
                empresa
              ),
          },

          seccion:
            evaluation
              .seccionIdSnapshot
              ? {
                  id:
                    evaluation
                      .seccionIdSnapshot,

                  nombre:
                    section?.nombre ||
                    "Sección",
                }
              : null,
        },

        /*
         * Resultado psicométrico completo.
         * No enviamos pagos ni información de administración.
         */
        result:
          evaluation.resultado,
      });
    }
  );

/* =========================================================
   FILTROS PARA PDF EMPRESARIAL
========================================================= */

const getCompanyPdfFilters = (
  query = {}
) => ({
  seccionId:
    normalizeText(
      query.seccionId
    ),

  genero:
    normalizeText(
      query.genero
    ),

  rangoEtario:
    normalizeText(
      query.rangoEtario
    ),

  animodo:
    normalizeText(
      query.animodo
    ),

  comunicacion:
    normalizeText(
      query.comunicacion
    ),

  cerebro:
    normalizeText(
      query.cerebro
    ),

  negociacion:
    normalizeText(
      query.negociacion
    ),

  vak:
    normalizeText(
      query.vak
    ),

  persistencia:
    normalizeText(
      query.persistencia
    ),

  productividad:
    normalizeText(
      query.productividad
    ),

  personalidad:
    normalizeText(
      query.personalidad
    ),
});

const sanitizePdfFileName = (
  value
) =>
  normalizeText(
    value
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(
      0,
      90
    ) ||
  "empresa";

/* =========================================================
   PÚBLICO
   GET /psychometric/company-results/:token/pdf

   El PDF utiliza exactamente la empresa vinculada al token.
   Puede recibir los mismos filtros del dashboard público.
========================================================= */

const getPublicCompanyResultsPdf =
  catchError(
    async (
      req,
      res
    ) => {
      const {
        token,
      } =
        req.params;

      const {
        empresa,
      } =
        await getValidCompanyAccessByToken(
          token,
          {
            registerUse:
              true,
          }
        );

      const filters =
        getCompanyPdfFilters(
          req.query
        );

      const pdfBuffer =
        await generarInformePsicometricoEmpresa(
          {
            empresaId:
              empresa.id,

            filters,
          }
        );

      if (
        !pdfBuffer ||
        !Buffer.isBuffer(
          pdfBuffer
        )
      ) {
        return res
          .status(500)
          .json({
            message:
              "No fue posible generar el informe empresarial.",
          });
      }

      const companyName =
        getCompanyName(
          empresa
        );

      const fileName =
        `informe-empresarial-proyecto-pensar-${sanitizePdfFileName(
          companyName
        )}.pdf`;

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${fileName}"`
      );

      res.setHeader(
        "Content-Length",
        pdfBuffer.length
      );

      res.setHeader(
        "Cache-Control",
        "private, no-store, max-age=0"
      );

      return res.send(
        pdfBuffer
      );
    }
  );

/* =========================================================
   ADMIN
   GET /psychometric/dashboard/organizations/:empresaId/pdf

   Permite al administrador generar el mismo informe
   empresarial sin necesidad del token público.
========================================================= */

const getCompanyResultsPdfAdmin =
  catchError(
    async (
      req,
      res
    ) => {
      const {
        empresaId,
      } =
        req.params;

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

      const empresa =
        await Empresa.findByPk(
          empresaId
        );

      if (
        !empresa
      ) {
        return res
          .status(404)
          .json({
            message:
              "La empresa no existe.",
          });
      }

      const filters =
        getCompanyPdfFilters(
          req.query
        );

      const pdfBuffer =
        await generarInformePsicometricoEmpresa(
          {
            empresaId:
              empresa.id,

            filters,
          }
        );

      if (
        !pdfBuffer ||
        !Buffer.isBuffer(
          pdfBuffer
        )
      ) {
        return res
          .status(500)
          .json({
            message:
              "No fue posible generar el informe empresarial.",
          });
      }

      const fileName =
        `informe-empresarial-proyecto-pensar-${sanitizePdfFileName(
          getCompanyName(
            empresa
          )
        )}.pdf`;

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${fileName}"`
      );

      res.setHeader(
        "Content-Length",
        pdfBuffer.length
      );

      res.setHeader(
        "Cache-Control",
        "private, no-store, max-age=0"
      );

      return res.send(
        pdfBuffer
      );
    }
  );

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  getCompanyAccessStatus,
  sendCompanyAccessEmail,
  setCompanyAccessActive,

  getPublicCompanyResults,
  getPublicCompanyParticipantResult,
  getPublicCompanyResultsPdf,
  getCompanyResultsPdfAdmin,
};
