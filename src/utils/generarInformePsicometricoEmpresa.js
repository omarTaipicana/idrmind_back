const {
  PDFDocument,
  StandardFonts,
  rgb,
} = require("pdf-lib");

const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");

const Empresa = require("../models/Empresa");
const PsychometricEvaluation = require(
  "../models/PsychometricEvaluation"
);

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const MARGIN = 42;
const CONTENT_WIDTH =
  PAGE_WIDTH -
  MARGIN * 2;

const BRAND = {
  logoPath: path.resolve(
    __dirname,
    "../assets/test_logo.png"
  ),

  website:
    "www.idrmind.com",

  city:
    "Quito, Ecuador",

  email:
    "info@idrmind.com / idrmind@gmail.com",

  phone:
    "097 900 2223 / 096 279 9793",
};

/* =========================================================
   COLORES
========================================================= */

const COLORS = {
  navy: rgb(
    7 / 255,
    27 / 255,
    63 / 255
  ),

  blue: rgb(
    23 / 255,
    58 / 255,
    138 / 255
  ),

  cyan: rgb(
    40 / 255,
    167 / 255,
    232 / 255
  ),

  blueSoft: rgb(
    238 / 255,
    244 / 255,
    255 / 255
  ),

  white: rgb(1, 1, 1),

  text: rgb(
    16 / 255,
    24 / 255,
    40 / 255
  ),

  textSoft: rgb(
    52 / 255,
    64 / 255,
    84 / 255
  ),

  muted: rgb(
    102 / 255,
    112 / 255,
    133 / 255
  ),

  border: rgb(
    228 / 255,
    231 / 255,
    236 / 255
  ),

  soft: rgb(
    248 / 255,
    250 / 255,
    252 / 255
  ),

  yellow: rgb(
    242 / 255,
    183 / 255,
    5 / 255
  ),

  red: rgb(
    217 / 255,
    45 / 255,
    32 / 255
  ),

  green: rgb(
    7 / 255,
    148 / 255,
    85 / 255
  ),

  purple: rgb(
    139 / 255,
    92 / 255,
    246 / 255
  ),

  gray: rgb(
    102 / 255,
    112 / 255,
    133 / 255
  ),

  brown: rgb(
    154 / 255,
    103 / 255,
    0 / 255
  ),
};

const SEMANTIC_COLORS = {
  comunicacion: {
    AMARILLO:
      COLORS.yellow,

    ROJO:
      COLORS.red,

    AZUL:
      COLORS.blue,

    VERDE:
      COLORS.green,
  },

  cerebro: {
    IZQUIERDO:
      COLORS.yellow,

    CENTRAL:
      COLORS.red,

    DERECHO:
      COLORS.blue,
  },

  vak: {
    VISUAL:
      COLORS.blue,

    AUDITIVO:
      COLORS.red,

    KINESTESICO:
      COLORS.green,

    "KINESTÉSICO":
      COLORS.green,
  },

  persistencia: {
    SI:
      COLORS.green,

    "SÍ":
      COLORS.green,

    NO:
      COLORS.gray,

    ALERTA:
      COLORS.yellow,
  },

  animodo: {
    ABEJA:
      COLORS.yellow,

    CASTOR:
      COLORS.brown,

    DELFIN:
      COLORS.cyan,

    "DELFÍN":
      COLORS.cyan,

    BUHO:
      COLORS.purple,

    "BÚHO":
      COLORS.purple,

    CAMALEON:
      COLORS.green,

    "CAMALEÓN":
      COLORS.green,
  },
};

/* =========================================================
   TEXTO
========================================================= */

const repairMojibake = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  let text =
    String(value);

  if (
    /Ã.|Â.|â.|ðŸ/.test(
      text
    )
  ) {
    try {
      const repaired =
        Buffer.from(
          text,
          "latin1"
        ).toString(
          "utf8"
        );

      if (
        repaired &&
        !repaired.includes(
          "\uFFFD"
        )
      ) {
        text =
          repaired;
      }
    } catch {
      //
    }
  }

  return text;
};

const normalizeText = (
  value,
  fallback = "-"
) => {
  if (
    value === undefined ||
    value === null ||
    String(value)
      .trim() ===
      ""
  ) {
    return fallback;
  }

  return repairMojibake(
    value
  )
    .normalize("NFC")
    .replace(
      /\uFFFD/g,
      ""
    )
    .replace(
      /[“”]/g,
      '"'
    )
    .replace(
      /[‘’]/g,
      "'"
    )
    .replace(
      /[–—]/g,
      "-"
    )
    .replace(
      /\u00A0/g,
      " "
    )
    .replace(
      /[•●▪]/g,
      "-"
    )
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      ""
    )
    .trim();
};

const normalizeUpper = (
  value
) =>
  normalizeText(
    value,
    ""
  ).toUpperCase();

const roundNumber = (
  value
) => {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return 0;
  }

  return Number(
    number.toFixed(2)
  );
};

const roundPercentage = (
  value
) =>
  roundNumber(
    value
  );

const formatPercent = (
  value
) =>
  `${roundNumber(
    value
  )}%`;

const formatDate = (
  value
) => {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat(
      "es-EC",
      {
        timeZone:
          "America/Guayaquil",

        year:
          "numeric",

        month:
          "long",

        day:
          "2-digit",
      }
    ).format(
      new Date(
        value
      )
    );
  } catch {
    return "-";
  }
};

const wrapText = ({
  text,
  font,
  fontSize,
  maxWidth,
}) => {
  const safe =
    normalizeText(
      text,
      ""
    );

  if (!safe) {
    return [];
  }

  const words =
    safe.split(
      /\s+/
    );

  const lines =
    [];

  let current =
    "";

  for (
    const word of words
  ) {
    const candidate =
      current
        ? `${current} ${word}`
        : word;

    const width =
      font.widthOfTextAtSize(
        candidate,
        fontSize
      );

    if (
      width <=
      maxWidth
    ) {
      current =
        candidate;
    } else {
      if (
        current
      ) {
        lines.push(
          current
        );
      }

      current =
        word;
    }
  }

  if (
    current
  ) {
    lines.push(
      current
    );
  }

  return lines;
};

const drawWrappedText = ({
  page,
  text,
  x,
  y,
  maxWidth,
  font,
  size = 9,
  lineHeight = 13,
  color = COLORS.text,
  maxLines = null,
}) => {
  let lines =
    wrapText({
      text,
      font,
      fontSize:
        size,
      maxWidth,
    });

  if (
    maxLines &&
    lines.length >
      maxLines
  ) {
    lines =
      lines.slice(
        0,
        maxLines
      );
  }

  let currentY =
    y;

  for (
    const line of lines
  ) {
    page.drawText(
      line,
      {
        x,
        y:
          currentY,
        font,
        size,
        color,
      }
    );

    currentY -=
      lineHeight;
  }

  return currentY;
};

const truncateText = ({
  text,
  font,
  size,
  maxWidth,
}) => {
  const safe =
    normalizeText(
      text,
      ""
    );

  if (
    font.widthOfTextAtSize(
      safe,
      size
    ) <=
    maxWidth
  ) {
    return safe;
  }

  let current =
    safe;

  while (
    current.length >
      1 &&
    font.widthOfTextAtSize(
      `${current}...`,
      size
    ) >
      maxWidth
  ) {
    current =
      current.slice(
        0,
        -1
      );
  }

  return `${current}...`;
};

/* =========================================================
   SNAPSHOTS / RESULTADOS
========================================================= */

const getSnapshotUser = (
  evaluation
) =>
  evaluation
    ?.participantSnapshot
    ?.user ||
  {};

const getSnapshotCompany = (
  evaluation
) =>
  evaluation
    ?.participantSnapshot
    ?.empresa ||
  {};

const getSnapshotSection = (
  evaluation
) =>
  evaluation
    ?.participantSnapshot
    ?.seccion ||
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

const getAnimodoCategory = (
  result = {}
) => {
  const raw =
    result?.animodo
      ?.animal ||
    result?.animodoCategoria ||
    result?.animodo
      ?.personalityAnimal ||
    "";

  const normalized =
    normalizeUpper(
      raw
    );

  if (
    normalized.startsWith(
      "ENTRE "
    )
  ) {
    return "CAMALEÓN";
  }

  return (
    raw ||
    null
  );
};

const getPersonalityKey = (
  result = {}
) =>
  result?.personality
    ?.nombre ||
  result?.personality
    ?.codigo ||
  result?.personality
    ?.animal ||
  null;

const ageAtDate = (
  dateBirth,
  referenceDate
) => {
  if (
    !dateBirth
  ) {
    return null;
  }

  const birth =
    new Date(
      `${dateBirth}T12:00:00-05:00`
    );

  const ref =
    referenceDate
      ? new Date(
          referenceDate
        )
      : new Date();

  if (
    Number.isNaN(
      birth.getTime()
    ) ||
    Number.isNaN(
      ref.getTime()
    )
  ) {
    return null;
  }

  let age =
    ref.getFullYear() -
    birth.getFullYear();

  const month =
    ref.getMonth() -
    birth.getMonth();

  if (
    month <
      0 ||
    (
      month ===
        0 &&
      ref.getDate() <
        birth.getDate()
    )
  ) {
    age -=
      1;
  }

  return age >=
    0
    ? age
    : null;
};

const getAgeGroup = (
  age
) => {
  if (
    age ===
      null ||
    age ===
      undefined
  ) {
    return null;
  }

  if (
    age < 18
  ) {
    return "GEN_0";
  }

  if (
    age <= 35
  ) {
    return "GEN_1";
  }

  if (
    age <= 45
  ) {
    return "GEN_2";
  }

  return "GEN_3";
};

const AGE_LABELS = {
  GEN_0:
    "Menor de 18",

  GEN_1:
    "18 - 35",

  GEN_2:
    "36 - 45",

  GEN_3:
    "46 en adelante",
};

const getDemographics = (
  evaluation
) => {
  const user =
    getSnapshotUser(
      evaluation
    );

  const age =
    ageAtDate(
      user?.dateBirth,
      evaluation
        ?.fechaFinalizacion ||
      evaluation
        ?.createdAt
    );

  const genreRaw =
    normalizeUpper(
      user?.genre
    );

  let genre =
    user?.genre ||
    null;

  if (
    [
      "M",
      "MASCULINO",
      "HOMBRE",
    ].includes(
      genreRaw
    )
  ) {
    genre =
      "MASCULINO";
  }

  if (
    [
      "F",
      "FEMENINO",
      "MUJER",
    ].includes(
      genreRaw
    )
  ) {
    genre =
      "FEMENINO";
  }

  const ageGroup =
    getAgeGroup(
      age
    );

  return {
    genre,
    age,
    ageGroup,
    ageGroupLabel:
      AGE_LABELS[
        ageGroup
      ] ||
      null,
  };
};

/* =========================================================
   FILTROS
========================================================= */

const evaluationMatchesFilters = (
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
  } =
    filters;

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
      demographics
        .genre ||
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
      demographics
        .ageGroup ||
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
    normalizeUpper(
      getAnimodoCategory(
        result
      )
    ) !==
      normalizeUpper(
        animodo
      )
  ) {
    return false;
  }

  if (
    comunicacion &&
    String(
      result
        ?.communication
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
      result
        ?.brain
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
      result
        ?.negotiation
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
      result
        ?.persistence
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
      result
        ?.productivityIndex
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

/* =========================================================
   DISTRIBUCIONES
========================================================= */

const createCounter =
  () => new Map();

const addCounter = (
  counter,
  key
) => {
  if (
    !key
  ) {
    return;
  }

  const safe =
    normalizeText(
      key,
      ""
    );

  if (
    !safe
  ) {
    return;
  }

  counter.set(
    safe,
    (
      counter.get(
        safe
      ) ||
      0
    ) + 1
  );
};

const counterToDistribution = (
  counter,
  total
) =>
  Array.from(
    counter.entries()
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
                cantidad /
                  total *
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
        a.cantidad ||
        String(
          a.key
        ).localeCompare(
          String(
            b.key
          ),
          "es"
        )
    );

const average = (
  values = []
) => {
  const numeric =
    values
      .map(
        Number
      )
      .filter(
        Number.isFinite
      );

  if (
    !numeric.length
  ) {
    return 0;
  }

  return roundNumber(
    numeric.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    ) /
      numeric.length
  );
};

const buildAnalytics = (
  evaluations = []
) => {
  const counters = {
    genero:
      createCounter(),

    rangoEtario:
      createCounter(),

    animodo:
      createCounter(),

    comunicacion:
      createCounter(),

    cerebro:
      createCounter(),

    negociacion:
      createCounter(),

    vak:
      createCounter(),

    persistencia:
      createCounter(),

    productividad:
      createCounter(),

    personalidad:
      createCounter(),

    secciones:
      createCounter(),
  };

  const productividad =
    [];

  const negociacion =
    [];

  const persistencia =
    [];

  for (
    const evaluation of evaluations
  ) {
    const result =
      evaluation?.resultado ||
      {};

    const demographics =
      getDemographics(
        evaluation
      );

    addCounter(
      counters.genero,
      demographics.genre
    );

    addCounter(
      counters.rangoEtario,
      demographics.ageGroup
    );

    addCounter(
      counters.animodo,
      getAnimodoCategory(
        result
      )
    );

    addCounter(
      counters.comunicacion,
      result
        ?.communication
        ?.dominantColor
    );

    addCounter(
      counters.cerebro,
      result
        ?.brain
        ?.brainCategory
    );

    addCounter(
      counters.negociacion,
      result
        ?.negotiation
        ?.classification
    );

    addCounter(
      counters.vak,
      result?.vak
        ?.dominantStyle
    );

    addCounter(
      counters.persistencia,
      result
        ?.persistence
        ?.level
    );

    addCounter(
      counters.productividad,
      result
        ?.productivityIndex
        ?.classification
    );

    addCounter(
      counters.personalidad,
      getPersonalityKey(
        result
      )
    );

    const section =
      getSnapshotSection(
        evaluation
      );

    addCounter(
      counters.secciones,
      section?.nombre ||
      evaluation
        ?.seccionIdSnapshot ||
      "Sin sección"
    );

    if (
      Number.isFinite(
        Number(
          result
            ?.productivityIndex
            ?.percentage
        )
      )
    ) {
      productividad.push(
        Number(
          result
            .productivityIndex
            .percentage
        )
      );
    }

    if (
      Number.isFinite(
        Number(
          result
            ?.negotiation
            ?.totalScore
        )
      )
    ) {
      negociacion.push(
        Number(
          result
            .negotiation
            .totalScore
        )
      );
    }

    if (
      Number.isFinite(
        Number(
          result
            ?.persistence
            ?.score
        )
      )
    ) {
      persistencia.push(
        Number(
          result
            .persistence
            .score
        )
      );
    }
  }

  const total =
    evaluations.length;

  return {
    total,

    productividadPromedio:
      average(
        productividad
      ),

    negociacionPromedio:
      average(
        negociacion
      ),

    persistenciaPromedio:
      average(
        persistencia
      ),

    genero:
      counterToDistribution(
        counters.genero,
        total
      ),

    rangoEtario:
      counterToDistribution(
        counters.rangoEtario,
        total
      ),

    animodo:
      counterToDistribution(
        counters.animodo,
        total
      ),

    comunicacion:
      counterToDistribution(
        counters.comunicacion,
        total
      ),

    cerebro:
      counterToDistribution(
        counters.cerebro,
        total
      ),

    negociacion:
      counterToDistribution(
        counters.negociacion,
        total
      ),

    vak:
      counterToDistribution(
        counters.vak,
        total
      ),

    persistencia:
      counterToDistribution(
        counters.persistencia,
        total
      ),

    productividad:
      counterToDistribution(
        counters.productividad,
        total
      ),

    personalidad:
      counterToDistribution(
        counters.personalidad,
        total
      ),

    secciones:
      counterToDistribution(
        counters.secciones,
        total
      ),
  };
};

/* =========================================================
   CARGA DE DATOS
========================================================= */

const loadCompanyData = async ({
  empresaId,
  filters = {},
}) => {
  const empresa =
    await Empresa.findByPk(
      empresaId
    );

  if (!empresa) {
    const error =
      new Error(
        "La empresa no existe."
      );

    error.statusCode =
      404;

    throw error;
  }

  const allEvaluations =
    await PsychometricEvaluation.findAll(
      {
        where: {
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

  const evaluations =
    allEvaluations.filter(
      (
        evaluation
      ) =>
        evaluationMatchesFilters(
          evaluation,
          filters
        )
    );

  return {
    empresa,
    allEvaluations,
    evaluations,
    analytics:
      buildAnalytics(
        evaluations
      ),
  };
};

/* =========================================================
   IMAGEN / LOGO
========================================================= */

const embedImage = async ({
  pdfDoc,
  bytes,
  source,
}) => {
  const lower =
    String(
      source ||
      ""
    ).toLowerCase();

  if (
    lower.endsWith(
      ".png"
    )
  ) {
    try {
      return await pdfDoc.embedPng(
        bytes
      );
    } catch {
      //
    }
  }

  try {
    return await pdfDoc.embedJpg(
      bytes
    );
  } catch {
    //
  }

  try {
    return await pdfDoc.embedPng(
      bytes
    );
  } catch {
    return null;
  }
};

const loadLocalImage = async ({
  pdfDoc,
  filePath,
}) => {
  try {
    if (
      !filePath ||
      !fs.existsSync(
        filePath
      )
    ) {
      return null;
    }

    const bytes =
      await fs.promises.readFile(
        filePath
      );

    return await embedImage({
      pdfDoc,
      bytes,
      source:
        filePath,
    });
  } catch {
    return null;
  }
};

const loadRemoteImage = async ({
  pdfDoc,
  url,
}) => {
  if (
    !url ||
    !/^https?:\/\//i.test(
      String(
        url
      )
    )
  ) {
    return null;
  }

  try {
    const response =
      await fetch(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 iDrMind-PDF",
          },
        }
      );

    if (
      !response.ok
    ) {
      return null;
    }

    const bytes =
      await response.arrayBuffer();

    return await embedImage({
      pdfDoc,
      bytes,
      source:
        url,
    });
  } catch {
    return null;
  }
};

const loadLogo = async ({
  pdfDoc,
  empresa,
}) => {
  const companyLogo =
    await loadRemoteImage({
      pdfDoc,
      url:
        empresa?.logoUrl,
    });

  if (
    companyLogo
  ) {
    return {
      image:
        companyLogo,

      company:
        true,
    };
  }

  const brandLogo =
    await loadLocalImage({
      pdfDoc,
      filePath:
        BRAND.logoPath,
    });

  return {
    image:
      brandLogo,

    company:
      false,
  };
};

const drawContainedImage = ({
  page,
  image,
  x,
  y,
  width,
  height,
  background =
    COLORS.white,
  padding = 8,
}) => {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color:
      background,
  });

  if (!image) {
    return;
  }

  const scale =
    Math.min(
      (
        width -
        padding * 2
      ) /
        image.width,

      (
        height -
        padding * 2
      ) /
        image.height
    );

  const finalWidth =
    image.width *
    scale;

  const finalHeight =
    image.height *
    scale;

  page.drawImage(
    image,
    {
      x:
        x +
        (
          width -
          finalWidth
        ) /
          2,

      y:
        y +
        (
          height -
          finalHeight
        ) /
          2,

      width:
        finalWidth,

      height:
        finalHeight,
    }
  );
};

/* =========================================================
   COMPONENTES PDF
========================================================= */

const drawPageHeader = ({
  page,
  regularFont,
  boldFont,
  title,
  subtitle,
}) => {
  page.drawRectangle({
    x: 0,
    y:
      PAGE_HEIGHT -
      88,
    width:
      PAGE_WIDTH,
    height:
      88,
    color:
      COLORS.navy,
  });

  page.drawText(
    normalizeText(
      title
    ),
    {
      x:
        MARGIN,
      y:
        PAGE_HEIGHT -
        47,
      font:
        boldFont,
      size: 17,
      color:
        COLORS.white,
    }
  );

  if (
    subtitle
  ) {
    drawWrappedText({
      page,
      text:
        subtitle,
      x:
        MARGIN,
      y:
        PAGE_HEIGHT -
        66,
      maxWidth:
        CONTENT_WIDTH,
      font:
        regularFont,
      size:
        8.5,
      lineHeight:
        11,
      color:
        rgb(
          220 / 255,
          230 / 255,
          248 / 255
        ),
      maxLines:
        2,
    });
  }
};

const drawFooter = ({
  page,
  regularFont,
  pageNumber,
}) => {
  page.drawLine({
    start: {
      x:
        MARGIN,
      y: 33,
    },

    end: {
      x:
        PAGE_WIDTH -
        MARGIN,
      y: 33,
    },

    thickness:
      0.7,

    color:
      COLORS.border,
  });

  page.drawText(
    `iDr.Mind - Informe empresarial Proyecto Pensar`,
    {
      x:
        MARGIN,
      y: 19,
      font:
        regularFont,
      size:
        7,
      color:
        COLORS.muted,
    }
  );

  const pageText =
    `Página ${pageNumber}`;

  page.drawText(
    pageText,
    {
      x:
        PAGE_WIDTH -
        MARGIN -
        regularFont.widthOfTextAtSize(
          pageText,
          7
        ),
      y: 19,
      font:
        regularFont,
      size:
        7,
      color:
        COLORS.muted,
    }
  );
};

const drawKpi = ({
  page,
  x,
  y,
  width,
  label,
  value,
  detail,
  regularFont,
  boldFont,
  color =
    COLORS.blue,
}) => {
  page.drawRectangle({
    x,
    y,
    width,
    height:
      94,
    color:
      COLORS.white,
    borderColor:
      COLORS.border,
    borderWidth:
      0.8,
  });

  page.drawRectangle({
    x,
    y:
      y +
      88,
    width,
    height:
      6,
    color,
  });

  page.drawText(
    normalizeText(
      label
    ),
    {
      x:
        x +
        13,
      y:
        y +
        67,
      font:
        boldFont,
      size:
        7,
      color:
        COLORS.muted,
    }
  );

  const valueText =
    normalizeText(
      value
    );

  page.drawText(
    valueText,
    {
      x:
        x +
        13,
      y:
        y +
        34,
      font:
        boldFont,
      size:
        22,
      color,
    }
  );

  if (
    detail
  ) {
    page.drawText(
      truncateText({
        text:
          detail,
        font:
          regularFont,
        size:
          7.2,
        maxWidth:
          width -
          26,
      }),
      {
        x:
          x +
          13,
        y:
          y +
          14,
        font:
          regularFont,
        size:
          7.2,
        color:
          COLORS.muted,
      }
    );
  }
};

const getSemanticColor = (
  dimension,
  value,
  index = 0
) => {
  const key =
    normalizeUpper(
      value
    );

  if (
    SEMANTIC_COLORS[
      dimension
    ]?.[
      key
    ]
  ) {
    return SEMANTIC_COLORS[
      dimension
    ][
      key
    ];
  }

  const fallback = [
    COLORS.blue,
    COLORS.cyan,
    COLORS.green,
    COLORS.yellow,
    COLORS.purple,
    COLORS.red,
    COLORS.gray,
  ];

  return fallback[
    index %
    fallback.length
  ];
};

const drawHorizontalBarChart = ({
  page,
  title,
  data = [],
  x,
  y,
  width,
  height,
  regularFont,
  boldFont,
  dimension,
  labelFormatter = null,
  maxItems = 8,
}) => {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color:
      COLORS.white,
    borderColor:
      COLORS.border,
    borderWidth:
      0.8,
  });

  page.drawText(
    normalizeText(
      title
    ),
    {
      x:
        x +
        13,
      y:
        y +
        height -
        22,
      font:
        boldFont,
      size:
        10,
      color:
        COLORS.navy,
    }
  );

  const rows =
    data.slice(
      0,
      maxItems
    );

  if (
    !rows.length
  ) {
    page.drawText(
      "Sin datos disponibles.",
      {
        x:
          x +
          13,
        y:
          y +
          height -
          48,
        font:
          regularFont,
        size:
          8,
        color:
          COLORS.muted,
      }
    );

    return;
  }

  const maxValue =
    Math.max(
      ...rows.map(
        (
          item
        ) =>
          Number(
            item.cantidad ||
            0
          )
      ),
      1
    );

  const rowHeight =
    Math.min(
      30,
      (
        height -
        52
      ) /
        rows.length
    );

  const labelWidth =
    Math.min(
      125,
      width *
        0.38
    );

  const chartX =
    x +
    13 +
    labelWidth;

  const chartWidth =
    width -
    26 -
    labelWidth -
    54;

  rows.forEach(
    (
      item,
      index
    ) => {
      const rowY =
        y +
        height -
        48 -
        index *
          rowHeight;

      const label =
        labelFormatter
          ? labelFormatter(
              item.key
            )
          : item.key;

      page.drawText(
        truncateText({
          text:
            label,
          font:
            regularFont,
          size:
            7.2,
          maxWidth:
            labelWidth -
            8,
        }),
        {
          x:
            x +
            13,
          y:
            rowY -
            2,
          font:
            regularFont,
          size:
            7.2,
          color:
            COLORS.textSoft,
        }
      );

      page.drawRectangle({
        x:
          chartX,
        y:
          rowY -
          3,
        width:
          chartWidth,
        height:
          10,
        color:
          COLORS.soft,
      });

      const barWidth =
        chartWidth *
        (
          Number(
            item.cantidad ||
            0
          ) /
          maxValue
        );

      page.drawRectangle({
        x:
          chartX,
        y:
          rowY -
          3,
        width:
          Math.max(
            1,
            barWidth
          ),
        height:
          10,
        color:
          getSemanticColor(
            dimension,
            item.key,
            index
          ),
      });

      const valueText =
        `${item.cantidad} (${formatPercent(
          item.porcentaje
        )})`;

      page.drawText(
        valueText,
        {
          x:
            chartX +
            chartWidth +
            6,
          y:
            rowY -
            2,
          font:
            boldFont,
          size:
            6.8,
          color:
            COLORS.text,
        }
      );
    }
  );
};

const getDominant = (
  distribution = []
) =>
  distribution?.[0] ||
  null;

const buildExecutiveInsights = (
  analytics
) => {
  const insights =
    [];

  const add =
    (
      title,
      distribution
    ) => {
      const dominant =
        getDominant(
          distribution
        );

      if (
        !dominant
      ) {
        return;
      }

      insights.push({
        title,

        text:
          `${normalizeText(
            dominant.key
          )} concentra ${dominant.cantidad} resultado(s), equivalente al ${formatPercent(
            dominant.porcentaje
          )} del universo analizado.`,
      });
    };

  add(
    "Animodo predominante",
    analytics.animodo
  );

  add(
    "Comunicación predominante",
    analytics.comunicacion
  );

  add(
    "Preferencia cerebral predominante",
    analytics.cerebro
  );

  add(
    "Sistema representacional predominante",
    analytics.vak
  );

  add(
    "Productividad predominante",
    analytics.productividad
  );

  add(
    "Personalidad con mayor frecuencia",
    analytics.personalidad
  );

  return insights;
};

const drawInsightCard = ({
  page,
  x,
  y,
  width,
  title,
  text,
  regularFont,
  boldFont,
}) => {
  page.drawRectangle({
    x,
    y,
    width,
    height:
      78,
    color:
      COLORS.blueSoft,
    borderColor:
      COLORS.border,
    borderWidth:
      0.6,
  });

  page.drawText(
    normalizeText(
      title
    ),
    {
      x:
        x +
        12,
      y:
        y +
        55,
      font:
        boldFont,
      size:
        8,
      color:
        COLORS.blue,
    }
  );

  drawWrappedText({
    page,
    text,
    x:
      x +
      12,
    y:
      y +
      38,
    maxWidth:
      width -
      24,
    font:
      regularFont,
    size:
      7.4,
    lineHeight:
      10.5,
    color:
      COLORS.textSoft,
    maxLines:
      3,
  });
};

const drawFilterSummary = ({
  page,
  filters,
  x,
  y,
  width,
  regularFont,
  boldFont,
}) => {
  const active =
    Object.entries(
      filters ||
      {}
    ).filter(
      ([
        ,
        value,
      ]) =>
        Boolean(
          value
        )
    );

  if (
    !active.length
  ) {
    page.drawText(
      "Alcance: todos los resultados completados de la empresa.",
      {
        x,
        y,
        font:
          regularFont,
        size:
          8,
        color:
          COLORS.textSoft,
      }
    );

    return;
  }

  const labels = {
    seccionId:
      "Sección",

    genero:
      "Género",

    rangoEtario:
      "Rango etario",

    animodo:
      "Animodo",

    comunicacion:
      "Comunicación",

    cerebro:
      "Cerebro",

    negociacion:
      "Negociación",

    vak:
      "VAK",

    persistencia:
      "Persistencia",

    productividad:
      "Productividad",

    personalidad:
      "Personalidad",
  };

  page.drawText(
    "Filtros aplicados:",
    {
      x,
      y,
      font:
        boldFont,
      size:
        8,
      color:
        COLORS.blue,
    }
  );

  drawWrappedText({
    page,
    text:
      active
        .map(
          ([
            key,
            value,
          ]) =>
            `${labels[key] || key}: ${value}`
        )
        .join(" | "),
    x:
      x +
      84,
    y,
    maxWidth:
      width -
      84,
    font:
      regularFont,
    size:
      7.6,
    lineHeight:
      10,
    color:
      COLORS.textSoft,
    maxLines:
      2,
  });
};

/* =========================================================
   TABLA DE PARTICIPANTES
========================================================= */

const drawParticipantsTablePages = ({
  pdfDoc,
  evaluations,
  regularFont,
  boldFont,
  startPageNumber,
}) => {
  const rowsPerPage =
    22;

  let pageNumber =
    startPageNumber;

  for (
    let offset = 0;
    offset <
    evaluations.length;
    offset +=
      rowsPerPage
  ) {
    const page =
      pdfDoc.addPage([
        PAGE_WIDTH,
        PAGE_HEIGHT,
      ]);

    drawPageHeader({
      page,
      regularFont,
      boldFont,
      title:
        "Anexo - Resultados individuales",
      subtitle:
        "Listado de participantes incluidos en el universo del informe.",
    });

    const headers = [
      {
        label:
          "Participante",
        x: 42,
        width:
          150,
      },

      {
        label:
          "Sección",
        x: 197,
        width:
          84,
      },

      {
        label:
          "Animodo",
        x: 286,
        width:
          74,
      },

      {
        label:
          "Comunicación",
        x: 365,
        width:
          70,
      },

      {
        label:
          "Productividad",
        x: 440,
        width:
          112,
      },
    ];

    page.drawRectangle({
      x:
        MARGIN,
      y:
        PAGE_HEIGHT -
        126,
      width:
        CONTENT_WIDTH,
      height:
        24,
      color:
        COLORS.blueSoft,
    });

    headers.forEach(
      (
        header
      ) => {
        page.drawText(
          header.label,
          {
            x:
              header.x,
            y:
              PAGE_HEIGHT -
              117,
            font:
              boldFont,
            size:
              6.8,
            color:
              COLORS.blue,
          }
        );
      }
    );

    const pageRows =
      evaluations.slice(
        offset,
        offset +
          rowsPerPage
      );

    pageRows.forEach(
      (
        evaluation,
        index
      ) => {
        const result =
          evaluation
            ?.resultado ||
          {};

        const section =
          getSnapshotSection(
            evaluation
          );

        const y =
          PAGE_HEIGHT -
          148 -
          index *
            29;

        if (
          index %
            2 ===
          0
        ) {
          page.drawRectangle({
            x:
              MARGIN,
            y:
              y -
              8,
            width:
              CONTENT_WIDTH,
            height:
              27,
            color:
              COLORS.soft,
          });
        }

        const productividad =
          result
            ?.productivityIndex
            ?.classification ||
          "-";

        const productividadPct =
          result
            ?.productivityIndex
            ?.percentage;

        const values = [
          {
            text:
              getParticipantName(
                evaluation
              ),
            x:
              42,
            width:
              150,
          },

          {
            text:
              section?.nombre ||
              "Sin sección",
            x:
              197,
            width:
              84,
          },

          {
            text:
              getAnimodoCategory(
                result
              ) ||
              "-",
            x:
              286,
            width:
              74,
          },

          {
            text:
              result
                ?.communication
                ?.dominantColor ||
              "-",
            x:
              365,
            width:
              70,
          },

          {
            text:
              Number.isFinite(
                Number(
                  productividadPct
                )
              )
                ? `${productividad} - ${roundNumber(
                    productividadPct
                  )}%`
                : productividad,
            x:
              440,
            width:
              112,
          },
        ];

        values.forEach(
          (
            cell
          ) => {
            page.drawText(
              truncateText({
                text:
                  cell.text,
                font:
                  regularFont,
                size:
                  6.6,
                maxWidth:
                  cell.width -
                  5,
              }),
              {
                x:
                  cell.x,
                y,
                font:
                  regularFont,
                size:
                  6.6,
                color:
                  COLORS.textSoft,
              }
            );
          }
        );
      }
    );

    drawFooter({
      page,
      regularFont,
      pageNumber,
    });

    pageNumber +=
      1;
  }

  return pageNumber;
};

/* =========================================================
   GENERADOR PRINCIPAL
========================================================= */

const generarInformePsicometricoEmpresa =
  async ({
    empresaId,
    filters = {},
  }) => {
    if (
      !empresaId
    ) {
      const error =
        new Error(
          "El ID de la empresa es requerido."
        );

      error.statusCode =
        400;

      throw error;
    }

    const {
      empresa,
      allEvaluations,
      evaluations,
      analytics,
    } =
      await loadCompanyData({
        empresaId,
        filters,
      });

    if (
      !allEvaluations.length
    ) {
      const error =
        new Error(
          "La empresa todavía no tiene resultados psicométricos completados."
        );

      error.statusCode =
        404;

      throw error;
    }

    if (
      !evaluations.length
    ) {
      const error =
        new Error(
          "No existen resultados para los filtros seleccionados."
        );

      error.statusCode =
        404;

      throw error;
    }

    const pdfDoc =
      await PDFDocument.create();

    const regularFont =
      await pdfDoc.embedFont(
        StandardFonts.Helvetica
      );

    const boldFont =
      await pdfDoc.embedFont(
        StandardFonts.HelveticaBold
      );

    const logo =
      await loadLogo({
        pdfDoc,
        empresa,
      });

    const companyName =
      empresa
        ?.nombreComercial ||
      empresa
        ?.razonSocial ||
      "Empresa";

    const companySector =
      [
        empresa?.sector,
        empresa?.subSector,
      ]
        .filter(Boolean)
        .join(" - ");

    const generatedAt =
      new Date();

    let pageNumber =
      1;

    /* =====================================================
       PÁGINA 1 - PORTADA
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ]);

      page.drawRectangle({
        x: 0,
        y: 0,
        width:
          PAGE_WIDTH,
        height:
          PAGE_HEIGHT,
        color:
          COLORS.navy,
      });

      page.drawRectangle({
        x: 0,
        y: 0,
        width:
          PAGE_WIDTH,
        height:
          174,
        color:
          COLORS.blue,
      });

      page.drawRectangle({
        x: 0,
        y:
          PAGE_HEIGHT -
          10,
        width:
          PAGE_WIDTH,
        height:
          10,
        color:
          COLORS.cyan,
      });

      drawContainedImage({
        page,
        image:
          logo.image,
        x:
          58,
        y:
          620,
        width:
          154,
        height:
          104,
        background:
          COLORS.white,
        padding:
          11,
      });

      page.drawText(
        "INFORME EMPRESARIAL",
        {
          x:
            58,
          y:
            555,
          font:
            boldFont,
          size:
            11,
          color:
            COLORS.cyan,
        }
      );

      page.drawText(
        "PROYECTO PENSAR",
        {
          x:
            58,
          y:
            519,
          font:
            boldFont,
          size:
            27,
          color:
            COLORS.white,
        }
      );

      drawWrappedText({
        page,
        text:
          companyName,
        x:
          58,
        y:
          468,
        maxWidth:
          475,
        font:
          boldFont,
        size:
          22,
        lineHeight:
          26,
        color:
          COLORS.white,
        maxLines:
          3,
      });

      if (
        companySector
      ) {
        drawWrappedText({
          page,
          text:
            companySector,
          x:
            58,
          y:
            390,
          maxWidth:
            460,
          font:
            regularFont,
          size:
            10,
          lineHeight:
            14,
          color:
            rgb(
              215 / 255,
              226 / 255,
              248 / 255
            ),
          maxLines:
            2,
        });
      }

      page.drawText(
        `${analytics.total} resultados incluidos`,
        {
          x:
            58,
          y:
            318,
          font:
            boldFont,
          size:
            14,
          color:
            COLORS.white,
        }
      );

      drawFilterSummary({
        page,
        filters,
        x:
          58,
        y:
          278,
        width:
          470,
        regularFont,
        boldFont,
      });

      page.drawText(
        `Fecha de generación: ${formatDate(
          generatedAt
        )}`,
        {
          x:
            58,
          y:
            120,
          font:
            regularFont,
          size:
            9,
          color:
            COLORS.white,
        }
      );

      page.drawText(
        "Documento de análisis organizacional",
        {
          x:
            58,
          y:
            88,
          font:
            boldFont,
          size:
            11,
          color:
            COLORS.white,
        }
      );

      page.drawText(
        `${BRAND.website} | ${BRAND.city}`,
        {
          x:
            58,
          y:
            56,
          font:
            regularFont,
          size:
            8,
          color:
            rgb(
              220 / 255,
              230 / 255,
              248 / 255
            ),
        }
      );
    }

    pageNumber +=
      1;

    /* =====================================================
       PÁGINA 2 - RESUMEN EJECUTIVO
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ]);

      drawPageHeader({
        page,
        regularFont,
        boldFont,
        title:
          "Resumen ejecutivo",
        subtitle:
          `Consolidado de ${analytics.total} evaluaciones psicométricas completadas.`,
      });

      const gap =
        10;

      const kpiWidth =
        (
          CONTENT_WIDTH -
          gap * 2
        ) /
        3;

      drawKpi({
        page,
        x:
          MARGIN,
        y:
          626,
        width:
          kpiWidth,
        label:
          "RESULTADOS",
        value:
          analytics.total,
        detail:
          "evaluaciones incluidas",
        regularFont,
        boldFont,
        color:
          COLORS.blue,
      });

      drawKpi({
        page,
        x:
          MARGIN +
          kpiWidth +
          gap,
        y:
          626,
        width:
          kpiWidth,
        label:
          "PRODUCTIVIDAD",
        value:
          formatPercent(
            analytics
              .productividadPromedio
          ),
        detail:
          "promedio general",
        regularFont,
        boldFont,
        color:
          COLORS.green,
      });

      drawKpi({
        page,
        x:
          MARGIN +
          (
            kpiWidth +
            gap
          ) *
            2,
        y:
          626,
        width:
          kpiWidth,
        label:
          "NEGOCIACIÓN",
        value:
          analytics
            .negociacionPromedio,
        detail:
          "puntaje promedio",
        regularFont,
        boldFont,
        color:
          COLORS.cyan,
      });

      drawHorizontalBarChart({
        page,
        title:
          "Distribución por secciones",
        data:
          analytics.secciones,
        x:
          MARGIN,
        y:
          342,
        width:
          318,
        height:
          254,
        regularFont,
        boldFont,
        dimension:
          "secciones",
        maxItems:
          8,
      });

      drawHorizontalBarChart({
        page,
        title:
          "Género",
        data:
          analytics.genero,
        x:
          370,
        y:
          469,
        width:
          183,
        height:
          127,
        regularFont,
        boldFont,
        dimension:
          "genero",
        maxItems:
          4,
      });

      drawHorizontalBarChart({
        page,
        title:
          "Rango etario",
        data:
          analytics.rangoEtario,
        x:
          370,
        y:
          342,
        width:
          183,
        height:
          117,
        regularFont,
        boldFont,
        dimension:
          "rangoEtario",
        labelFormatter: (
          key
        ) =>
          AGE_LABELS[
            key
          ] ||
          key,
        maxItems:
          4,
      });

      const insights =
        buildExecutiveInsights(
          analytics
        ).slice(
          0,
          3
        );

      page.drawText(
        "LECTURA EJECUTIVA",
        {
          x:
            MARGIN,
          y:
            310,
          font:
            boldFont,
          size:
            9,
          color:
            COLORS.blue,
        }
      );

      insights.forEach(
        (
          insight,
          index
        ) => {
          drawInsightCard({
            page,
            x:
              MARGIN,
            y:
              210 -
              index *
                86,
            width:
              CONTENT_WIDTH,
            title:
              insight.title,
            text:
              insight.text,
            regularFont,
            boldFont,
          });
        }
      );

      drawFooter({
        page,
        regularFont,
        pageNumber,
      });
    }

    pageNumber +=
      1;

    /* =====================================================
       PÁGINA 3 - ANIMODO / COMUNICACIÓN
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ]);

      drawPageHeader({
        page,
        regularFont,
        boldFont,
        title:
          "Perfil conductual y comunicación",
        subtitle:
          "Distribución agregada de Animodo y colores de la comunicación.",
      });

      drawHorizontalBarChart({
        page,
        title:
          "Animodo",
        data:
          analytics.animodo,
        x:
          MARGIN,
        y:
          425,
        width:
          CONTENT_WIDTH,
        height:
          300,
        regularFont,
        boldFont,
        dimension:
          "animodo",
        maxItems:
          8,
      });

      drawHorizontalBarChart({
        page,
        title:
          "Colores de la comunicación",
        data:
          analytics.comunicacion,
        x:
          MARGIN,
        y:
          112,
        width:
          CONTENT_WIDTH,
        height:
          286,
        regularFont,
        boldFont,
        dimension:
          "comunicacion",
        maxItems:
          6,
      });

      drawFooter({
        page,
        regularFont,
        pageNumber,
      });
    }

    pageNumber +=
      1;

    /* =====================================================
       PÁGINA 4 - CEREBRO / VAK
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ]);

      drawPageHeader({
        page,
        regularFont,
        boldFont,
        title:
          "Procesamiento y sistema representacional",
        subtitle:
          "Preferencias de cerebro y canales VAK observados en la empresa.",
      });

      drawHorizontalBarChart({
        page,
        title:
          "Tipos de cerebro",
        data:
          analytics.cerebro,
        x:
          MARGIN,
        y:
          425,
        width:
          CONTENT_WIDTH,
        height:
          300,
        regularFont,
        boldFont,
        dimension:
          "cerebro",
        maxItems:
          6,
      });

      drawHorizontalBarChart({
        page,
        title:
          "Sistema representacional VAK",
        data:
          analytics.vak,
        x:
          MARGIN,
        y:
          112,
        width:
          CONTENT_WIDTH,
        height:
          286,
        regularFont,
        boldFont,
        dimension:
          "vak",
        maxItems:
          6,
      });

      drawFooter({
        page,
        regularFont,
        pageNumber,
      });
    }

    pageNumber +=
      1;

    /* =====================================================
       PÁGINA 5 - NEGOCIACIÓN / PERSISTENCIA / PRODUCTIVIDAD
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ]);

      drawPageHeader({
        page,
        regularFont,
        boldFont,
        title:
          "Negociación, persistencia y productividad",
        subtitle:
          "Indicadores consolidados de desempeño y comportamiento.",
      });

      const chartWidth =
        (
          CONTENT_WIDTH -
          10
        ) /
        2;

      drawHorizontalBarChart({
        page,
        title:
          "Negociación",
        data:
          analytics.negociacion,
        x:
          MARGIN,
        y:
          430,
        width:
          chartWidth,
        height:
          295,
        regularFont,
        boldFont,
        dimension:
          "negociacion",
        maxItems:
          7,
      });

      drawHorizontalBarChart({
        page,
        title:
          "Persistencia",
        data:
          analytics.persistencia,
        x:
          MARGIN +
          chartWidth +
          10,
        y:
          430,
        width:
          chartWidth,
        height:
          295,
        regularFont,
        boldFont,
        dimension:
          "persistencia",
        maxItems:
          7,
      });

      drawHorizontalBarChart({
        page,
        title:
          "Productividad",
        data:
          analytics.productividad,
        x:
          MARGIN,
        y:
          112,
        width:
          CONTENT_WIDTH,
        height:
          288,
        regularFont,
        boldFont,
        dimension:
          "productividad",
        maxItems:
          8,
      });

      drawFooter({
        page,
        regularFont,
        pageNumber,
      });
    }

    pageNumber +=
      1;

    /* =====================================================
       PÁGINA 6 - PERSONALIDAD
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ]);

      drawPageHeader({
        page,
        regularFont,
        boldFont,
        title:
          "Distribución de personalidad",
        subtitle:
          "Frecuencia de perfiles de personalidad observados en los resultados.",
      });

      drawHorizontalBarChart({
        page,
        title:
          "Personalidades con mayor frecuencia",
        data:
          analytics.personalidad,
        x:
          MARGIN,
        y:
          348,
        width:
          CONTENT_WIDTH,
        height:
          377,
        regularFont,
        boldFont,
        dimension:
          "personalidad",
        maxItems:
          10,
      });

      page.drawRectangle({
        x:
          MARGIN,
        y:
          112,
        width:
          CONTENT_WIDTH,
        height:
          205,
        color:
          COLORS.blueSoft,
        borderColor:
          COLORS.border,
        borderWidth:
          0.8,
      });

      page.drawText(
        "LECTURA ORGANIZACIONAL",
        {
          x:
            MARGIN +
            18,
          y:
            286,
          font:
            boldFont,
          size:
            9,
          color:
            COLORS.blue,
        }
      );

      drawWrappedText({
        page,
        text:
          "La distribución de personalidad permite observar la diversidad de estilos presentes en la organización. Una concentración alta en uno o pocos perfiles puede facilitar ciertos patrones de comunicación y decisión, pero también puede generar puntos ciegos colectivos. El análisis debe complementarse con la estructura de áreas, cargos y objetivos de la empresa.",
        x:
          MARGIN +
          18,
        y:
          260,
        maxWidth:
          CONTENT_WIDTH -
          36,
        font:
          regularFont,
        size:
          9,
        lineHeight:
          14,
        color:
          COLORS.textSoft,
        maxLines:
          10,
      });

      drawFooter({
        page,
        regularFont,
        pageNumber,
      });
    }

    pageNumber +=
      1;

    /* =====================================================
       PÁGINA 7 - CONCLUSIONES
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ]);

      drawPageHeader({
        page,
        regularFont,
        boldFont,
        title:
          "Conclusiones empresariales",
        subtitle:
          "Síntesis de los principales hallazgos observados en el universo analizado.",
      });

      const insights =
        buildExecutiveInsights(
          analytics
        );

      let y =
        665;

      insights.forEach(
        (
          insight,
          index
        ) => {
          if (
            y <
            125
          ) {
            return;
          }

          page.drawCircle({
            x:
              MARGIN +
              9,
            y:
              y +
              4,
            size:
              9,
            color:
              COLORS.blue,
          });

          page.drawText(
            String(
              index +
              1
            ),
            {
              x:
                MARGIN +
                6,
              y:
                y +
                1,
              font:
                boldFont,
              size:
                7,
              color:
                COLORS.white,
            }
          );

          page.drawText(
            normalizeText(
              insight.title
            ),
            {
              x:
                MARGIN +
                30,
              y:
                y +
                2,
              font:
                boldFont,
              size:
                9,
              color:
                COLORS.navy,
            }
          );

          y =
            drawWrappedText({
              page,
              text:
                insight.text,
              x:
                MARGIN +
                30,
              y:
                y -
                16,
              maxWidth:
                CONTENT_WIDTH -
                30,
              font:
                regularFont,
              size:
                8.5,
              lineHeight:
                12.5,
              color:
                COLORS.textSoft,
              maxLines:
                3,
            }) -
            22;
        }
      );

      page.drawRectangle({
        x:
          MARGIN,
        y:
          78,
        width:
          CONTENT_WIDTH,
        height:
          76,
        color:
          COLORS.soft,
        borderColor:
          COLORS.border,
        borderWidth:
          0.8,
      });

      drawWrappedText({
        page,
        text:
          "Nota: este informe presenta tendencias agregadas. No sustituye el análisis individual ni constituye por sí solo una decisión de contratación, desvinculación o diagnóstico clínico. Su utilidad principal es orientar procesos de desarrollo, comunicación, liderazgo, negociación y productividad.",
        x:
          MARGIN +
          14,
        y:
          132,
        maxWidth:
          CONTENT_WIDTH -
          28,
        font:
          regularFont,
        size:
          7.7,
        lineHeight:
          10.8,
        color:
          COLORS.muted,
        maxLines:
          5,
      });

      drawFooter({
        page,
        regularFont,
        pageNumber,
      });
    }

    pageNumber +=
      1;

    /* =====================================================
       ANEXO - PARTICIPANTES
    ===================================================== */

    pageNumber =
      drawParticipantsTablePages({
        pdfDoc,
        evaluations,
        regularFont,
        boldFont,
        startPageNumber:
          pageNumber,
      });

    /* =====================================================
       METADATA
    ===================================================== */

    pdfDoc.setTitle(
      `Informe empresarial Proyecto Pensar - ${normalizeText(
        companyName
      )}`
    );

    pdfDoc.setAuthor(
      "iDr.Mind."
    );

    pdfDoc.setSubject(
      "Informe empresarial de resultados psicométricos Proyecto Pensar"
    );

    pdfDoc.setCreator(
      "iDr.Mind."
    );

    pdfDoc.setProducer(
      "iDr.Mind."
    );

    const bytes =
      await pdfDoc.save();

    return Buffer.from(
      bytes
    );
  };

module.exports =
  generarInformePsicometricoEmpresa;
