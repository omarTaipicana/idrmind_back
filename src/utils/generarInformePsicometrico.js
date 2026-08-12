const {
  PDFDocument,
  StandardFonts,
  rgb,
} = require("pdf-lib");

const PsychometricEvaluation = require(
  "../models/PsychometricEvaluation"
);

const PsychometricPersonality = require(
  "../models/PsychometricPersonality"
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

/* =========================================================
   CONSTANTES VISUALES
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

  text: rgb(
    16 / 255,
    24 / 255,
    40 / 255
  ),

  muted: rgb(
    102 / 255,
    112 / 255,
    133 / 255
  ),

  border: rgb(
    218 / 255,
    225 / 255,
    235 / 255
  ),

  soft: rgb(
    245 / 255,
    247 / 255,
    251 / 255
  ),

  white: rgb(1, 1, 1),

  success: rgb(
    18 / 255,
    183 / 255,
    106 / 255
  ),
};

/* =========================================================
   HELPERS
========================================================= */

const normalizeText = (
  value,
  fallback = "-"
) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value).trim();
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "es-EC",
    {
      timeZone:
        "America/Guayaquil",

      year: "numeric",
      month: "long",
      day: "2-digit",
    }
  ).format(
    new Date(value)
  );
};

const formatPercent = (
  value
) => {
  const number = Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return "0%";
  }

  return `${number.toFixed(1)}%`;
};

/* =========================================================
   AJUSTAR TEXTO A ANCHO
========================================================= */

const wrapText = ({
  text,
  font,
  fontSize,
  maxWidth,
}) => {
  const words = normalizeText(
    text,
    ""
  ).split(/\s+/);

  const lines = [];

  let currentLine = "";

  for (const word of words) {
    const testLine =
      currentLine
        ? `${currentLine} ${word}`
        : word;

    const width =
      font.widthOfTextAtSize(
        testLine,
        fontSize
      );

    if (
      width <= maxWidth
    ) {
      currentLine =
        testLine;
    } else {
      if (currentLine) {
        lines.push(
          currentLine
        );
      }

      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

/* =========================================================
   TEXTO MULTILÍNEA
========================================================= */

const drawWrappedText = ({
  page,
  text,
  x,
  y,
  maxWidth,
  font,
  size = 10,
  color = COLORS.text,
  lineHeight = 14,
}) => {
  const lines = wrapText({
    text,
    font,
    fontSize: size,
    maxWidth,
  });

  let currentY = y;

  for (const line of lines) {
    page.drawText(line, {
      x,
      y: currentY,
      size,
      font,
      color,
    });

    currentY -=
      lineHeight;
  }

  return currentY;
};

/* =========================================================
   ENCABEZADO INTERNO
========================================================= */

const drawHeader = ({
  page,
  title,
  subtitle,
  boldFont,
  regularFont,
}) => {
  const {
    width,
    height,
  } = page.getSize();

  page.drawRectangle({
    x: 0,
    y: height - 84,
    width,
    height: 84,
    color: COLORS.navy,
  });

  page.drawRectangle({
    x: 0,
    y: height - 88,
    width,
    height: 4,
    color: COLORS.cyan,
  });

  page.drawText(
    "PROYECTO PENSAR",
    {
      x: 42,
      y: height - 38,
      font: boldFont,
      size: 10,
      color: COLORS.cyan,
    }
  );

  page.drawText(
    title,
    {
      x: 42,
      y: height - 60,
      font: boldFont,
      size: 18,
      color: COLORS.white,
    }
  );

  if (subtitle) {
    page.drawText(
      subtitle,
      {
        x: 42,
        y: height - 76,
        font: regularFont,
        size: 8,
        color: rgb(
          210 / 255,
          222 / 255,
          240 / 255
        ),
      }
    );
  }
};

/* =========================================================
   PIE DE PÁGINA
========================================================= */

const drawFooter = ({
  page,
  pageNumber,
  regularFont,
}) => {
  const {
    width,
  } = page.getSize();

  page.drawLine({
    start: {
      x: 42,
      y: 35,
    },

    end: {
      x: width - 42,
      y: 35,
    },

    thickness: 0.7,
    color: COLORS.border,
  });

  page.drawText(
    "iDr.Mind - Informe confidencial de resultados",
    {
      x: 42,
      y: 21,
      size: 7.5,
      font: regularFont,
      color: COLORS.muted,
    }
  );

  page.drawText(
    `Página ${pageNumber}`,
    {
      x: width - 82,
      y: 21,
      size: 7.5,
      font: regularFont,
      color: COLORS.muted,
    }
  );
};

/* =========================================================
   TARJETA SIMPLE
========================================================= */

const drawCard = ({
  page,
  x,
  y,
  width,
  height,
  title,
  value,
  label,
  boldFont,
  regularFont,
}) => {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor:
      COLORS.border,
    borderWidth: 1,
    color: COLORS.soft,
  });

  page.drawText(
    title,
    {
      x: x + 14,
      y:
        y +
        height -
        20,

      size: 8,
      font: regularFont,
      color: COLORS.muted,
    }
  );

  page.drawText(
    normalizeText(value),
    {
      x: x + 14,
      y:
        y +
        height -
        43,

      size: 15,
      font: boldFont,
      color: COLORS.navy,
    }
  );

  if (label) {
    page.drawText(
      label,
      {
        x: x + 14,
        y: y + 12,
        size: 7.5,
        font: regularFont,
        color: COLORS.muted,
      }
    );
  }
};

/* =========================================================
   BARRA PORCENTUAL
========================================================= */

const drawPercentageBar = ({
  page,
  x,
  y,
  width,
  label,
  value,
  font,
  boldFont,
}) => {
  const percentage =
    Math.min(
      Math.max(
        Number(value) || 0,
        0
      ),
      100
    );

  page.drawText(
    label,
    {
      x,
      y: y + 10,
      size: 9,
      font: boldFont,
      color: COLORS.text,
    }
  );

  page.drawText(
    formatPercent(
      percentage
    ),
    {
      x: x + width - 38,
      y: y + 10,
      size: 8,
      font,
      color: COLORS.muted,
    }
  );

  page.drawRectangle({
    x,
    y,
    width,
    height: 7,
    color: COLORS.border,
  });

  page.drawRectangle({
    x,
    y,
    width:
      width *
      (percentage / 100),
    height: 7,
    color: COLORS.blue,
  });
};

/* =========================================================
   CARGAR IMAGEN REMOTA DE PERSONALIDAD
========================================================= */

const loadRemoteImage = async ({
  pdfDoc,
  url,
}) => {
  if (!url) {
    return null;
  }

  try {
    const response =
      await fetch(url);

    if (!response.ok) {
      return null;
    }

    const bytes =
      await response.arrayBuffer();

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      contentType.includes(
        "png"
      )
    ) {
      return await pdfDoc.embedPng(
        bytes
      );
    }

    return await pdfDoc.embedJpg(
      bytes
    );
  } catch (error) {
    console.error(
      "No se pudo cargar imagen de personalidad:",
      error.message
    );

    return null;
  }
};

/* =========================================================
   OBTENER DATOS COMPLETOS
========================================================= */

const getReportData = async (
  evaluationId
) => {
  const evaluation =
    await PsychometricEvaluation.findByPk(
      evaluationId,
      {
        include: [
          {
            model:
              Inscripcion,

            as: "inscripcion",

            include: [
              {
                model: User,
                as: "user",
              },

              {
                model: Course,
                as: "course",
              },
            ],
          },

          {
            model:
              PsychometricPersonality,

            as:
              "personality",
          },
        ],
      }
    );

  if (!evaluation) {
    const error =
      new Error(
        "La evaluación psicométrica no existe."
      );

    error.statusCode = 404;

    throw error;
  }

  if (
    evaluation.estado !==
    "completada"
  ) {
    const error =
      new Error(
        "La evaluación todavía no está completada."
      );

    error.statusCode = 409;

    throw error;
  }

  if (
    !evaluation.resultado
  ) {
    const error =
      new Error(
        "La evaluación no tiene resultados calculados."
      );

    error.statusCode = 409;

    throw error;
  }

  const user =
    evaluation.inscripcion
      ?.user;

  const course =
    evaluation.inscripcion
      ?.course;

  return {
    evaluation,
    user,
    course,

    personality:
      evaluation.personality,

    result:
      evaluation.resultado,
  };
};

/* =========================================================
   GENERAR INFORME
========================================================= */

const generarInformePsicometrico =
  async ({
    evaluationId,
  }) => {
    const {
      evaluation,
      user,
      course,
      personality,
      result,
    } = await getReportData(
      evaluationId
    );

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

    /* =====================================================
       INFORMACIÓN NORMALIZADA
    ===================================================== */

    const nombreCompleto = [
      user?.firstName,
      user?.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    const animodo =
      result?.animodo || {};

    const communication =
      result?.communication ||
      {};

    const brain =
      result?.brain || {};

    const negotiation =
      result?.negotiation || {};

    const vak =
      result?.vak || {};

    const persistence =
      result?.persistence || {};

    /* =====================================================
       PÁGINA 1 - PORTADA
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          595.28,
          841.89,
        ]);

      const {
        width,
        height,
      } = page.getSize();

      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color:
          COLORS.white,
      });

      page.drawRectangle({
        x: 0,
        y:
          height -
          300,
        width,
        height: 300,
        color:
          COLORS.navy,
      });

      page.drawRectangle({
        x: 0,
        y:
          height -
          306,
        width,
        height: 6,
        color:
          COLORS.cyan,
      });

      page.drawText(
        "iDr.Mind",
        {
          x: 50,
          y:
            height -
            75,

          font: boldFont,
          size: 13,
          color:
            COLORS.cyan,
        }
      );

      page.drawText(
        "INFORME DE RESULTADOS",
        {
          x: 50,
          y:
            height -
            135,

          font: boldFont,
          size: 27,
          color:
            COLORS.white,
        }
      );

      page.drawText(
        "PROYECTO PENSAR",
        {
          x: 50,
          y:
            height -
            170,

          font: boldFont,
          size: 22,
          color:
            COLORS.white,
        }
      );

      drawWrappedText({
        page,

        text:
          "Evaluación integral de habilidades, estilos de pensamiento, comunicación, aprendizaje y negociación.",

        x: 50,
        y:
          height -
          210,

        maxWidth: 410,

        font:
          regularFont,

        size: 10,

        lineHeight: 15,

        color: rgb(
          215 / 255,
          225 / 255,
          240 / 255
        ),
      });

      page.drawText(
        normalizeText(
          nombreCompleto,
          "Participante"
        ),
        {
          x: 50,
          y: 440,
          font: boldFont,
          size: 20,
          color:
            COLORS.navy,
        }
      );

      page.drawText(
        `Evaluación N.º ${evaluation.numeroEvaluacion}`,
        {
          x: 50,
          y: 410,
          font:
            regularFont,
          size: 10,
          color:
            COLORS.muted,
        }
      );

      page.drawText(
        formatDate(
          evaluation.fechaFinalizacion
        ),
        {
          x: 50,
          y: 392,
          font:
            regularFont,
          size: 9,
          color:
            COLORS.muted,
        }
      );

      page.drawRectangle({
        x: 50,
        y: 270,
        width: 495,
        height: 80,
        borderColor:
          COLORS.border,
        borderWidth: 1,
        color:
          COLORS.soft,
      });

      page.drawText(
        "PERFIL INTEGRAL",
        {
          x: 68,
          y: 324,
          size: 8,
          font:
            regularFont,
          color:
            COLORS.muted,
        }
      );

      page.drawText(
        normalizeText(
          personality?.nombre,
          "Resultado psicométrico"
        ),
        {
          x: 68,
          y: 296,
          size: 17,
          font: boldFont,
          color:
            COLORS.blue,
        }
      );

      page.drawText(
        normalizeText(
          course?.nombre,
          "Proyecto Pensar"
        ),
        {
          x: 50,
          y: 92,
          size: 9,
          font:
            regularFont,
          color:
            COLORS.muted,
        }
      );

      page.drawText(
        "Documento personal y confidencial",
        {
          x: 50,
          y: 72,
          size: 8,
          font:
            regularFont,
          color:
            COLORS.muted,
        }
      );
    }

    /* =====================================================
       PÁGINA 2 - RESUMEN EJECUTIVO
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          595.28,
          841.89,
        ]);

      drawHeader({
        page,
        title:
          "Resumen ejecutivo",

        subtitle:
          normalizeText(
            nombreCompleto
          ),

        boldFont,
        regularFont,
      });

      drawCard({
        page,
        x: 42,
        y: 620,
        width: 155,
        height: 85,
        title: "ANIMODO",
        value:
          animodo.animal,
        label:
          "Perfil conductual",
        boldFont,
        regularFont,
      });

      drawCard({
        page,
        x: 220,
        y: 620,
        width: 155,
        height: 85,
        title:
          "TIPO DE CEREBRO",
        value:
          brain.brainType,
        label:
          brain.headColor
            ? `Color ${brain.headColor}`
            : null,
        boldFont,
        regularFont,
      });

      drawCard({
        page,
        x: 398,
        y: 620,
        width: 155,
        height: 85,
        title:
          "COMUNICACIÓN",
        value:
          communication
            .communicationType,
        label:
          communication
            .dominantColor
            ? `Color ${communication.dominantColor}`
            : null,
        boldFont,
        regularFont,
      });

      drawCard({
        page,
        x: 42,
        y: 510,
        width: 155,
        height: 85,
        title: "VAK",
        value:
          vak.dominantStyle,
        label:
          "Estilo predominante",
        boldFont,
        regularFont,
      });

      drawCard({
        page,
        x: 220,
        y: 510,
        width: 155,
        height: 85,
        title:
          "NEGOCIACIÓN",
        value:
          negotiation
            .classification,
        label:
          `Puntaje ${normalizeText(
            negotiation
              .totalScore
          )}`,
        boldFont,
        regularFont,
      });

      drawCard({
        page,
        x: 398,
        y: 510,
        width: 155,
        height: 85,
        title:
          "PERSISTENCIA",
        value:
          persistence.level,
        label:
          `Índice ${normalizeText(
            persistence.score
          )}`,
        boldFont,
        regularFont,
      });

      page.drawText(
        "Perfil de personalidad",
        {
          x: 42,
          y: 465,
          font: boldFont,
          size: 15,
          color:
            COLORS.navy,
        }
      );

      drawWrappedText({
        page,

        text:
          personality?.descripcion ||
          "La interpretación detallada del perfil se construye a partir de la combinación de Animodo, tipo de cerebro y estilo de comunicación.",

        x: 42,
        y: 438,

        maxWidth: 510,

        font:
          regularFont,

        size: 10,

        lineHeight: 15,

        color:
          COLORS.text,
      });

      drawFooter({
        page,
        pageNumber: 2,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 3 - ANIMODO + PERSONALIDAD
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          595.28,
          841.89,
        ]);

      drawHeader({
        page,
        title:
          "Animodo y personalidad",

        subtitle:
          "Cómo tiendes a sentir, pensar, actuar y observar",

        boldFont,
        regularFont,
      });

      page.drawText(
        `Resultado Animodo: ${normalizeText(
          animodo.animal
        )}`,
        {
          x: 42,
          y: 700,
          font: boldFont,
          size: 17,
          color:
            COLORS.navy,
        }
      );

      const axis =
        animodo.axes ||
        {};

      page.drawText(
        "Eje Sentir - Pensar",
        {
          x: 42,
          y: 660,
          font: boldFont,
          size: 10,
          color:
            COLORS.text,
        }
      );

      page.drawText(
        normalizeText(
          axis.sentirPensar
        ),
        {
          x: 455,
          y: 660,
          font:
            regularFont,
          size: 10,
          color:
            COLORS.blue,
        }
      );

      page.drawText(
        "Eje Actuar - Observar",
        {
          x: 42,
          y: 625,
          font: boldFont,
          size: 10,
          color:
            COLORS.text,
        }
      );

      page.drawText(
        normalizeText(
          axis.actuarObservar
        ),
        {
          x: 455,
          y: 625,
          font:
            regularFont,
          size: 10,
          color:
            COLORS.blue,
        }
      );

      page.drawText(
        "Descripción del perfil",
        {
          x: 42,
          y: 570,
          font: boldFont,
          size: 14,
          color:
            COLORS.navy,
        }
      );

      let currentY =
        drawWrappedText({
          page,

          text:
            personality?.descripcion ||
            "No existe una descripción configurada para esta personalidad.",

          x: 42,
          y: 542,

          maxWidth: 510,

          font:
            regularFont,

          size: 10,

          lineHeight: 15,
        });

      currentY -= 25;

      page.drawText(
        "Forma de pensar",
        {
          x: 42,
          y: currentY,
          font: boldFont,
          size: 12,
          color:
            COLORS.blue,
        }
      );

      currentY -= 22;

      currentY =
        drawWrappedText({
          page,

          text:
            personality?.formaPensar ||
            "Sin descripción disponible.",

          x: 42,
          y: currentY,

          maxWidth: 510,

          font:
            regularFont,

          size: 9.5,

          lineHeight: 14,
        });

      currentY -= 25;

      page.drawText(
        "Forma de aprender",
        {
          x: 42,
          y: currentY,
          font: boldFont,
          size: 12,
          color:
            COLORS.blue,
        }
      );

      currentY -= 22;

      drawWrappedText({
        page,

        text:
          personality?.formaAprender ||
          "Sin descripción disponible.",

        x: 42,
        y: currentY,

        maxWidth: 510,

        font:
          regularFont,

        size: 9.5,

        lineHeight: 14,
      });

      drawFooter({
        page,
        pageNumber: 3,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 4 - CEREBRO + VAK
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          595.28,
          841.89,
        ]);

      drawHeader({
        page,
        title:
          "Pensamiento y aprendizaje",

        subtitle:
          "Tipo de cerebro y sistema representacional VAK",

        boldFont,
        regularFont,
      });

      page.drawText(
        "Tipo de cerebro",
        {
          x: 42,
          y: 700,
          size: 15,
          font: boldFont,
          color:
            COLORS.navy,
        }
      );

      page.drawText(
        normalizeText(
          brain.brainType
        ),
        {
          x: 42,
          y: 675,
          size: 12,
          font: boldFont,
          color:
            COLORS.blue,
        }
      );

      const brainPercentages =
        brain.percentages ||
        {};

      drawPercentageBar({
        page,
        x: 42,
        y: 625,
        width: 225,
        label: "Pensante",
        value:
          brainPercentages
            .PENSANTE,
        font:
          regularFont,
        boldFont,
      });

      drawPercentageBar({
        page,
        x: 42,
        y: 585,
        width: 225,
        label: "Emocional",
        value:
          brainPercentages
            .EMOCIONAL,
        font:
          regularFont,
        boldFont,
      });

      drawPercentageBar({
        page,
        x: 42,
        y: 545,
        width: 225,
        label: "Reptiliano",
        value:
          brainPercentages
            .REPTILIANO,
        font:
          regularFont,
        boldFont,
      });

      page.drawText(
        "Estilo VAK",
        {
          x: 315,
          y: 700,
          size: 15,
          font: boldFont,
          color:
            COLORS.navy,
        }
      );

      page.drawText(
        normalizeText(
          vak.dominantStyle
        ),
        {
          x: 315,
          y: 675,
          size: 12,
          font: boldFont,
          color:
            COLORS.blue,
        }
      );

      const vakPercentages =
        vak.percentages ||
        {};

      drawPercentageBar({
        page,
        x: 315,
        y: 625,
        width: 225,
        label: "Visual",
        value:
          vakPercentages.VISUAL,
        font:
          regularFont,
        boldFont,
      });

      drawPercentageBar({
        page,
        x: 315,
        y: 585,
        width: 225,
        label: "Auditivo",
        value:
          vakPercentages.AUDITIVO,
        font:
          regularFont,
        boldFont,
      });

      drawPercentageBar({
        page,
        x: 315,
        y: 545,
        width: 225,
        label:
          "Kinestésico",
        value:
          vakPercentages
            .KINESTESICO,
        font:
          regularFont,
        boldFont,
      });

      page.drawText(
        "Interpretación",
        {
          x: 42,
          y: 485,
          size: 14,
          font: boldFont,
          color:
            COLORS.navy,
        }
      );

      drawWrappedText({
        page,

        text:
          personality?.formaAprender ||
          "El estilo dominante refleja las vías que tienden a facilitar la adquisición, organización y recuperación de información.",

        x: 42,
        y: 458,

        maxWidth: 510,

        font:
          regularFont,

        size: 10,

        lineHeight: 15,
      });

      drawFooter({
        page,
        pageNumber: 4,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 5 - COMUNICACIÓN + NEGOCIACIÓN
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          595.28,
          841.89,
        ]);

      drawHeader({
        page,
        title:
          "Comunicación y negociación",

        subtitle:
          "Preferencias de interacción y comportamiento negociador",

        boldFont,
        regularFont,
      });

      page.drawText(
        "Colores de la comunicación",
        {
          x: 42,
          y: 700,
          size: 15,
          font: boldFont,
          color:
            COLORS.navy,
        }
      );

      page.drawText(
        normalizeText(
          communication
            .communicationType
        ),
        {
          x: 42,
          y: 675,
          size: 12,
          font: boldFont,
          color:
            COLORS.blue,
        }
      );

      const communicationPercentages =
        communication
          .percentages ||
        {};

      drawPercentageBar({
        page,
        x: 42,
        y: 625,
        width: 225,
        label: "Amarillo",
        value:
          communicationPercentages
            .AMARILLO,
        font:
          regularFont,
        boldFont,
      });

      drawPercentageBar({
        page,
        x: 42,
        y: 585,
        width: 225,
        label: "Azul",
        value:
          communicationPercentages
            .AZUL,
        font:
          regularFont,
        boldFont,
      });

      drawPercentageBar({
        page,
        x: 315,
        y: 625,
        width: 225,
        label: "Rojo",
        value:
          communicationPercentages
            .ROJO,
        font:
          regularFont,
        boldFont,
      });

      drawPercentageBar({
        page,
        x: 315,
        y: 585,
        width: 225,
        label: "Verde",
        value:
          communicationPercentages
            .VERDE,
        font:
          regularFont,
        boldFont,
      });

      page.drawText(
        "Forma de comunicación",
        {
          x: 42,
          y: 520,
          size: 13,
          font: boldFont,
          color:
            COLORS.navy,
        }
      );

      let currentY =
        drawWrappedText({
          page,

          text:
            personality
              ?.descripcionComunicacion ||
            "Sin descripción específica configurada.",

          x: 42,
          y: 493,

          maxWidth: 510,

          font:
            regularFont,

          size: 9.5,

          lineHeight: 14,
        });

      currentY -= 28;

      page.drawText(
        "Nivel de negociación",
        {
          x: 42,
          y: currentY,
          size: 13,
          font: boldFont,
          color:
            COLORS.navy,
        }
      );

      currentY -= 26;

      page.drawText(
        `Clasificación: ${normalizeText(
          negotiation
            .classification
        )}`,
        {
          x: 42,
          y: currentY,
          size: 10,
          font: boldFont,
          color:
            COLORS.blue,
        }
      );

      currentY -= 20;

      page.drawText(
        `Puntaje obtenido: ${normalizeText(
          negotiation.totalScore
        )}`,
        {
          x: 42,
          y: currentY,
          size: 9.5,
          font:
            regularFont,
          color:
            COLORS.text,
        }
      );

      drawFooter({
        page,
        pageNumber: 5,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 6 - PERSISTENCIA + RECOMENDACIONES
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          595.28,
          841.89,
        ]);

      drawHeader({
        page,
        title:
          "Síntesis y recomendaciones",

        subtitle:
          "Orientaciones para el desarrollo personal",

        boldFont,
        regularFont,
      });

      page.drawText(
        "Nivel de persistencia",
        {
          x: 42,
          y: 700,
          size: 15,
          font: boldFont,
          color:
            COLORS.navy,
        }
      );

      page.drawText(
        normalizeText(
          persistence.level
        ),
        {
          x: 42,
          y: 674,
          size: 14,
          font: boldFont,
          color:
            COLORS.blue,
        }
      );

      page.drawText(
        `Puntaje: ${normalizeText(
          persistence.score
        )}`,
        {
          x: 42,
          y: 652,
          size: 9.5,
          font:
            regularFont,
          color:
            COLORS.text,
        }
      );

      const factors =
        Array.isArray(
          persistence.factors
        )
          ? persistence.factors
          : [];

      if (factors.length) {
        page.drawText(
          "Factores observados:",
          {
            x: 42,
            y: 620,
            size: 10,
            font: boldFont,
            color:
              COLORS.text,
          }
        );

        let y = 598;

        for (
          const factor
          of factors
        ) {
          page.drawText(
            `• ${normalizeText(
              factor
            )
              .replace(
                /_/g,
                " "
              )
              .toLowerCase()}`,
            {
              x: 55,
              y,
              size: 9,
              font:
                regularFont,
              color:
                COLORS.text,
            }
          );

          y -= 18;
        }
      }

      page.drawText(
        "Recomendaciones generales",
        {
          x: 42,
          y: 500,
          size: 15,
          font: boldFont,
          color:
            COLORS.navy,
        }
      );

      const recommendations = [
        `Aprovecha las fortalezas asociadas a tu perfil ${normalizeText(
          personality?.nombre,
          "personal"
        )}.`,

        `Adapta tu comunicación considerando tu estilo predominante ${normalizeText(
          communication
            .communicationType
        )}.`,

        `Utiliza estrategias de aprendizaje compatibles con tu modalidad ${normalizeText(
          vak.dominantStyle
        )}.`,

        `Reconoce las ventajas y límites de tu tipo de cerebro ${normalizeText(
          brain.brainType
        )} al tomar decisiones.`,

        `En negociación, revisa tu clasificación ${normalizeText(
          negotiation
            .classification
        )} y busca equilibrar objetivos, relación y flexibilidad.`,

        "Utiliza este informe como una herramienta de autoconocimiento y desarrollo, no como una etiqueta rígida.",
      ];

      let y = 465;

      recommendations.forEach(
        (
          recommendation,
          index
        ) => {
          page.drawCircle({
            x: 52,
            y: y + 3,
            size: 9,
            color:
              COLORS.blue,
          });

          page.drawText(
            String(index + 1),
            {
              x:
                index + 1 >=
                10
                  ? 47
                  : 49,

              y,

              size: 7,
              font: boldFont,
              color:
                COLORS.white,
            }
          );

          y =
            drawWrappedText({
              page,

              text:
                recommendation,

              x: 72,
              y: y + 4,

              maxWidth:
                465,

              font:
                regularFont,

              size: 9.5,

              lineHeight: 14,
            }) - 19;
        }
      );

      drawFooter({
        page,
        pageNumber: 6,
        regularFont,
      });
    }

    /* =====================================================
       INSERTAR IMAGEN DE PERSONALIDAD

       Por ahora se carga para verificar que la URL funciona.
       En el siguiente ajuste la colocamos visualmente
       en portada/resumen.
    ===================================================== */

    await loadRemoteImage({
      pdfDoc,

      url:
        personality
          ?.imagenUrl ||
        result
          ?.personality
          ?.imagenUrl,
    });

    /* =====================================================
       SERIALIZAR A BUFFER
    ===================================================== */

    const pdfBytes =
      await pdfDoc.save();

    return Buffer.from(
      pdfBytes
    );
  };

module.exports =
  generarInformePsicometrico;