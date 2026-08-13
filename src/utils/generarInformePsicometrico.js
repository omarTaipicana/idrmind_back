const {
  PDFDocument,
  StandardFonts,
  rgb,
} = require("pdf-lib");

const fs = require("fs");
const path = require("path");

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
   DOCUMENTO
========================================================= */

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const MARGIN = 42;

/* =========================================================
   MARCA
========================================================= */

const BRAND = {
  logoUrl:
    "https://idrmind.com/images/test_logo.png",

  website:
    "www.idrmind.com",

  city:
    "Quito, Ecuador",

  email:
    "idrmind@gmail.com",

  phone:
    "097 900 2223 / 096 279 9793",
};

/* =========================================================
   COLORES
========================================================= */

const COLORS = {
  navy: rgb(
    8 / 255,
    34 / 255,
    76 / 255
  ),

  blue: rgb(
    30 / 255,
    83 / 255,
    157 / 255
  ),

  blueLight: rgb(
    64 / 255,
    170 / 255,
    222 / 255
  ),

  blueSoft: rgb(
    238 / 255,
    244 / 255,
    252 / 255
  ),

  cyan: rgb(
    40 / 255,
    167 / 255,
    232 / 255
  ),

  text: rgb(
    22 / 255,
    29 / 255,
    42 / 255
  ),

  textSoft: rgb(
    63 / 255,
    72 / 255,
    88 / 255
  ),

  muted: rgb(
    105 / 255,
    115 / 255,
    132 / 255
  ),

  border: rgb(
    220 / 255,
    225 / 255,
    232 / 255
  ),

  soft: rgb(
    248 / 255,
    250 / 255,
    252 / 255
  ),

  white: rgb(
    1,
    1,
    1
  ),

  grayShape: rgb(
    215 / 255,
    218 / 255,
    223 / 255
  ),

  green: rgb(
    12 / 255,
    133 / 255,
    78 / 255
  ),

  yellow: rgb(
    244 / 255,
    196 / 255,
    0 / 255
  ),

  red: rgb(
    215 / 255,
    58 / 255,
    48 / 255
  ),
};

/* =========================================================
   REPARAR MOJIBAKE
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
      // Mantener original
    }
  }

  return text;
};

/* =========================================================
   NORMALIZAR TEXTO
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

const prettyText = (
  value,
  fallback = "-"
) => {
  return normalizeText(
    value,
    fallback
  )
    .replace(
      /_/g,
      " "
    )
    .trim();
};

/* =========================================================
   FECHA
========================================================= */

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

        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return "-";
  }
};

/* =========================================================
   PORCENTAJE
========================================================= */

const formatPercent = (
  value
) => {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return "0%";
  }

  return `${Math.round(
    number
  )}%`;
};

/* =========================================================
   WRAP TEXTO
========================================================= */

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

  const lines = [];

  let current = "";

  for (
    const word of
    words
  ) {
    const candidate =
      current
        ? `${current} ${word}`
        : word;

    let width;

    try {
      width =
        font.widthOfTextAtSize(
          candidate,
          fontSize
        );
    } catch {
      continue;
    }

    if (
      width <=
      maxWidth
    ) {
      current =
        candidate;
    } else {
      if (current) {
        lines.push(
          current
        );
      }

      current =
        word;
    }
  }

  if (current) {
    lines.push(
      current
    );
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
  lineHeight = 14,
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

    if (
      lines.length
    ) {
      lines[
        lines.length -
          1
      ] += "...";
    }
  }

  let currentY =
    y;

  for (
    const line of
    lines
  ) {
    page.drawText(
      normalizeText(
        line,
        ""
      ),
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

/* =========================================================
   CENTRAR TEXTO
========================================================= */

const drawCenteredText = ({
  page,
  text,
  y,
  font,
  size,
  color = COLORS.text,
}) => {
  const safe =
    normalizeText(
      text,
      ""
    );

  const width =
    font.widthOfTextAtSize(
      safe,
      size
    );

  page.drawText(
    safe,
    {
      x:
        (
          PAGE_WIDTH -
          width
        ) /
        2,

      y,

      font,
      size,
      color,
    }
  );
};

/* =========================================================
   TEXTO CENTRADO EN BLOQUE
========================================================= */

const drawCenteredWrappedText = ({
  page,
  text,
  centerX,
  y,
  maxWidth,
  font,
  size,
  lineHeight,
  color,
  maxLines,
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
    const line of
    lines
  ) {
    const width =
      font.widthOfTextAtSize(
        line,
        size
      );

    page.drawText(
      line,
      {
        x:
          centerX -
          width / 2,

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

/* =========================================================
   PIE
========================================================= */

const drawFooter = ({
  page,
  number,
  regularFont,
}) => {
  page.drawLine({
    start: {
      x:
        MARGIN,

      y: 32,
    },

    end: {
      x:
        PAGE_WIDTH -
        MARGIN,

      y: 32,
    },

    thickness:
      0.5,

    color:
      COLORS.border,
  });

  page.drawText(
    "iDr.Mind - Informe confidencial de resultados",
    {
      x:
        MARGIN,

      y: 18,

      font:
        regularFont,

      size:
        6.5,

      color:
        COLORS.muted,
    }
  );

  page.drawText(
    `Página ${number}`,
    {
      x:
        PAGE_WIDTH -
        MARGIN -
        38,

      y: 18,

      font:
        regularFont,

      size:
        6.5,

      color:
        COLORS.muted,
    }
  );
};

/* =========================================================
   RESOLVER UBICACIONES DE IMAGEN
========================================================= */

const getImageCandidates = (
  imageUrl
) => {
  if (!imageUrl) {
    return [];
  }

  const raw =
    String(
      imageUrl
    )
      .trim()
      .replace(
        /\\/g,
        "/"
      );

  const candidates =
    [];

  const addRemote = (
    value
  ) => {
    if (
      value &&
      !candidates.some(
        (c) =>
          c.type ===
            "remote" &&
          c.value ===
            value
      )
    ) {
      candidates.push({
        type:
          "remote",

        value,
      });
    }
  };

  const addLocal = (
    value
  ) => {
    if (
      value &&
      !candidates.some(
        (c) =>
          c.type ===
            "local" &&
          c.value ===
            value
      )
    ) {
      candidates.push({
        type:
          "local",

        value,
      });
    }
  };

  /* =====================================================
     URL ABSOLUTA
  ===================================================== */

  if (
    /^https?:\/\//i.test(
      raw
    )
  ) {
    addRemote(
      raw
    );

    if (
      raw.startsWith(
        "http://"
      )
    ) {
      addRemote(
        raw.replace(
          /^http:\/\//i,
          "https://"
        )
      );
    }

    try {
      const parsed =
        new URL(raw);

      const pathname =
        decodeURIComponent(
          parsed.pathname
        );

      addLocal(
        path.resolve(
          process.cwd(),
          pathname.replace(
            /^\/+/,
            ""
          )
        )
      );
    } catch {
      // ignore
    }

    return candidates;
  }

  /* =====================================================
     RUTA LOCAL ABSOLUTA
  ===================================================== */

  if (
    path.isAbsolute(
      raw
    )
  ) {
    addLocal(
      raw
    );
  }

  const relative =
    raw.replace(
      /^\/+/,
      ""
    );

  /* =====================================================
     BACK
  ===================================================== */

  addLocal(
    path.resolve(
      process.cwd(),
      relative
    )
  );

  addLocal(
    path.resolve(
      __dirname,
      "..",
      relative
    )
  );

  addLocal(
    path.resolve(
      __dirname,
      "..",
      "..",
      relative
    )
  );

  /* =====================================================
     FRONT
  ===================================================== */

  const FRONTEND_URL =
    (
      process.env
        .FRONTEND_URL ||
      "https://idrmind.com"
    ).replace(
      /\/+$/,
      ""
    );

  addRemote(
    `${FRONTEND_URL}/${relative}`
  );

  /* =====================================================
     API
  ===================================================== */

  const API_PUBLIC_URL =
    (
      process.env
        .API_PUBLIC_URL ||
      process.env
        .BACKEND_URL ||
      "https://api.idrmind.com"
    ).replace(
      /\/+$/,
      ""
    );

  addRemote(
    `${API_PUBLIC_URL}/${relative}`
  );

  return candidates;
};

/* =========================================================
   EMBEBER BYTES COMO PNG/JPG
========================================================= */

const embedImage = async ({
  pdfDoc,
  bytes,
  source,
  contentType = "",
}) => {
  const extension =
    String(
      source
    ).toLowerCase();

  const type =
    String(
      contentType
    ).toLowerCase();

  if (
    type.includes(
      "png"
    ) ||
    extension.endsWith(
      ".png"
    )
  ) {
    try {
      return await pdfDoc.embedPng(
        bytes
      );
    } catch {
      // continúa
    }
  }

  if (
    type.includes(
      "jpeg"
    ) ||
    type.includes(
      "jpg"
    ) ||
    extension.endsWith(
      ".jpg"
    ) ||
    extension.endsWith(
      ".jpeg"
    )
  ) {
    try {
      return await pdfDoc.embedJpg(
        bytes
      );
    } catch {
      // continúa
    }
  }

  try {
    return await pdfDoc.embedPng(
      bytes
    );
  } catch {
    // continúa
  }

  try {
    return await pdfDoc.embedJpg(
      bytes
    );
  } catch {
    return null;
  }
};

/* =========================================================
   CARGAR IMAGEN
========================================================= */

const loadPdfImage =
  async ({
    pdfDoc,
    imageUrl,
    label =
      "imagen",
  }) => {
    console.log(
      "======================================"
    );

    console.log(
      `🖼️ CARGANDO ${label.toUpperCase()}`
    );

    console.log(
      "Origen:",
      imageUrl
    );

    const candidates =
      getImageCandidates(
        imageUrl
      );

    if (
      !candidates.length
    ) {
      console.log(
        "❌ No hay candidatos."
      );

      console.log(
        "======================================"
      );

      return null;
    }

    for (
      const candidate of
      candidates
    ) {
      console.log(
        `🔎 ${candidate.type}:`,
        candidate.value
      );

      try {
        /* =================================================
           LOCAL
        ================================================= */

        if (
          candidate.type ===
          "local"
        ) {
          if (
            !fs.existsSync(
              candidate.value
            )
          ) {
            console.log(
              "   ↳ no existe"
            );

            continue;
          }

          const bytes =
            await fs.promises.readFile(
              candidate.value
            );

          const image =
            await embedImage({
              pdfDoc,
              bytes,

              source:
                candidate.value,
            });

          if (image) {
            console.log(
              `✅ ${label} cargada localmente`
            );

            console.log(
              candidate.value
            );

            console.log(
              "======================================"
            );

            return image;
          }

          continue;
        }

        /* =================================================
           REMOTA
        ================================================= */

        const response =
          await fetch(
            candidate.value,
            {
              redirect:
                "follow",

              headers: {
                "User-Agent":
                  "Mozilla/5.0 iDrMind-PDF",
              },
            }
          );

        console.log(
          "   ↳ HTTP",
          response.status
        );

        if (
          !response.ok
        ) {
          continue;
        }

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        console.log(
          "   ↳",
          contentType
        );

        if (
          contentType.includes(
            "text/html"
          )
        ) {
          console.log(
            "   ↳ descartado: devolvió HTML"
          );

          continue;
        }

        const bytes =
          await response.arrayBuffer();

        const image =
          await embedImage({
            pdfDoc,
            bytes,

            source:
              candidate.value,

            contentType,
          });

        if (image) {
          console.log(
            `✅ ${label} cargada remotamente`
          );

          console.log(
            candidate.value
          );

          console.log(
            "======================================"
          );

          return image;
        }
      } catch (
        error
      ) {
        console.log(
          "   ↳ ERROR:",
          error.message
        );
      }
    }

    console.log(
      `❌ No fue posible cargar ${label}`
    );

    console.log(
      "======================================"
    );

    return null;
  };

/* =========================================================
   IMAGEN CONTENIDA
========================================================= */

const drawContainedImage = ({
  page,
  image,
  x,
  y,
  width,
  height,
  padding = 8,
  background =
    COLORS.white,
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
    page.drawRectangle({
      x:
        x +
        padding,

      y:
        y +
        padding,

      width:
        width -
        padding * 2,

      height:
        height -
        padding * 2,

      color:
        COLORS.soft,
    });

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
   HEADER CORPORATIVO
========================================================= */

const drawCorporateHeader = ({
  page,
  fullName,
  logoImage,
  boldFont,
  regularFont,
}) => {
  /* =====================================================
     LOGO
  ===================================================== */

  if (
    logoImage
  ) {
    drawContainedImage({
      page,

      image:
        logoImage,

      x: 42,
      y: 765,

      width: 205,
      height: 62,

      padding: 0,
    });
  } else {
    page.drawText(
      "iDr.Mind",
      {
        x: 42,
        y: 798,

        size: 17,

        font:
          boldFont,

        color:
          COLORS.navy,
      }
    );
  }

  /* =====================================================
     CONTACTO
  ===================================================== */

  const contactX =
    335;

  page.drawText(
    BRAND.city,
    {
      x:
        contactX,

      y: 806,

      size:
        7.2,

      font:
        regularFont,

      color:
        COLORS.textSoft,
    }
  );

  page.drawText(
    BRAND.phone,
    {
      x:
        contactX,

      y: 791,

      size:
        7.2,

      font:
        regularFont,

      color:
        COLORS.textSoft,
    }
  );

  page.drawText(
    BRAND.email,
    {
      x:
        contactX,

      y: 776,

      size:
        7.2,

      font:
        regularFont,

      color:
        COLORS.textSoft,
    }
  );

  page.drawText(
    BRAND.website,
    {
      x:
        contactX,

      y: 761,

      size:
        7.2,

      font:
        regularFont,

      color:
        COLORS.textSoft,
    }
  );

  /* =====================================================
     LÍNEA CORPORATIVA
  ===================================================== */

  const lineY =
    744;

  const lineWidth =
    128;

  page.drawRectangle({
    x: 42,
    y:
      lineY,

    width:
      lineWidth,

    height: 2,

    color:
      COLORS.blue,
  });

  page.drawRectangle({
    x: 170,
    y:
      lineY,

    width:
      lineWidth,

    height: 2,

    color:
      COLORS.yellow,
  });

  page.drawRectangle({
    x: 298,
    y:
      lineY,

    width:
      lineWidth,

    height: 2,

    color:
      COLORS.green,
  });

  page.drawRectangle({
    x: 426,
    y:
      lineY,

    width: 127,

    height: 2,

    color:
      COLORS.red,
  });

  /* =====================================================
     NOMBRE PARTICIPANTE
  ===================================================== */

  if (
    fullName
  ) {
    drawCenteredWrappedText({
      page,

      text:
        normalizeText(
          fullName
        ).toUpperCase(),

      centerX:
        PAGE_WIDTH /
        2,

      y: 708,

      maxWidth: 500,

      font:
        boldFont,

      size:
        fullName.length >
        40
          ? 11.5
          : 13.5,

      lineHeight:
        15,

      color:
        COLORS.blue,

      maxLines: 2,
    });
  }
};

/* =========================================================
   TARJETA RESULTADO GENERAL
========================================================= */

const drawResultCard = ({
  page,
  x,
  y,
  width,
  height,
  title,
  value,
  subtitle,
  regularFont,
  boldFont,
  active = false,
}) => {
  page.drawRectangle({
    x,
    y,
    width,
    height,

    color:
      active
        ? COLORS.blueSoft
        : COLORS.soft,

    borderColor:
      active
        ? COLORS.blue
        : COLORS.border,

    borderWidth:
      active
        ? 1.4
        : 1,
  });

  page.drawText(
    normalizeText(
      title,
      ""
    ),
    {
      x:
        x + 12,

      y:
        y +
        height -
        20,

      size:
        7,

      font:
        boldFont,

      color:
        COLORS.muted,
    }
  );

  drawWrappedText({
    page,

    text:
      value,

    x:
      x + 12,

    y:
      y +
      height -
      44,

    maxWidth:
      width -
      24,

    font:
      boldFont,

    size:
      String(
        value ||
        ""
      ).length >
      20
        ? 9
        : 13,

    lineHeight:
      13,

    color:
      COLORS.navy,

    maxLines: 3,
  });

  if (
    subtitle
  ) {
    drawWrappedText({
      page,

      text:
        subtitle,

      x:
        x + 12,

      y:
        y + 14,

      maxWidth:
        width -
        24,

      font:
        regularFont,

      size:
        7,

      lineHeight:
        9,

      color:
        COLORS.muted,

      maxLines: 2,
    });
  }
};

/* =========================================================
   RESULTADO EJECUTIVO
   SIN MARCO PESADO
========================================================= */

const drawExecutiveResult = ({
  page,
  x,
  y,
  width,
  title,
  value,
  subtitle,
  accentColor =
    COLORS.blue,
  regularFont,
  boldFont,
}) => {
  const safeTitle =
    normalizeText(
      title,
      ""
    );

  const safeValue =
    normalizeText(
      value,
      "-"
    );

  const safeSubtitle =
    normalizeText(
      subtitle,
      ""
    );

  /*
   * Acento visual.
   */
  page.drawRectangle({
    x,
    y:
      y + 4,

    width: 34,
    height: 3,

    color:
      accentColor,
  });

  /*
   * Título pequeño.
   */
  page.drawText(
    safeTitle,
    {
      x,
      y:
        y - 16,

      size: 7.4,

      font:
        boldFont,

      color:
        COLORS.muted,
    }
  );

  /*
   * Valor principal.
   */
  const valueSize =
    safeValue.length >
    25
      ? 10
      : safeValue.length >
          16
        ? 11.5
        : 15;

  drawWrappedText({
    page,

    text:
      safeValue,

    x,
    y:
      y - 44,

    maxWidth:
      width,

    font:
      boldFont,

    size:
      valueSize,

    lineHeight:
      valueSize +
      3,

    color:
      COLORS.navy,

    maxLines: 3,
  });

  /*
   * Detalle.
   */
  if (
    safeSubtitle
  ) {
    drawWrappedText({
      page,

      text:
        safeSubtitle,

      x,
      y:
        y - 88,

      maxWidth:
        width,

      font:
        regularFont,

      size: 7.2,

      lineHeight:
        9.5,

      color:
        COLORS.textSoft,

      maxLines: 3,
    });
  }
};

/* =========================================================
   COLOR EJECUTIVO SEGÚN RESULTADO
========================================================= */

const getExecutiveColor = (
  type,
  value
) => {
  const normalized =
    String(
      value ||
      ""
    ).toUpperCase();

  if (
    type ===
    "communication"
  ) {
    if (
      normalized.includes(
        "ROJO"
      )
    ) {
      return COLORS.red;
    }

    if (
      normalized.includes(
        "VERDE"
      )
    ) {
      return COLORS.green;
    }

    if (
      normalized.includes(
        "AMARILLO"
      )
    ) {
      return COLORS.yellow;
    }

    return COLORS.blue;
  }

  if (
    type ===
    "persistence"
  ) {
    if (
      normalized ===
      "SI"
    ) {
      return COLORS.green;
    }

    if (
      normalized ===
      "NO"
    ) {
      return COLORS.red;
    }

    return COLORS.yellow;
  }

  if (
    type ===
    "negotiation"
  ) {
    if (
      normalized.includes(
        "BAJO"
      )
    ) {
      return COLORS.red;
    }

    if (
      normalized.includes(
        "ALTO"
      )
    ) {
      return COLORS.green;
    }

    return COLORS.yellow;
  }

  if (
    type ===
    "vak"
  ) {
    return COLORS.cyan;
  }

  if (
    type ===
    "brain"
  ) {
    return COLORS.blue;
  }

  if (
    type ===
    "animodo"
  ) {
    return COLORS.green;
  }

  return COLORS.blue;
};

/* =========================================================
   BARRA
========================================================= */

const drawBar = ({
  page,
  x,
  y,
  width,
  label,
  value,
  boldFont,
  regularFont,
}) => {
  const percentage =
    Math.max(
      0,
      Math.min(
        100,
        Number(value) ||
          0
      )
    );

  page.drawText(
    normalizeText(
      label,
      ""
    ),
    {
      x,
      y:
        y + 13,

      size:
        8,

      font:
        boldFont,

      color:
        COLORS.text,
    }
  );

  const valueText =
    formatPercent(
      percentage
    );

  const textWidth =
    regularFont.widthOfTextAtSize(
      valueText,
      7.5
    );

  page.drawText(
    valueText,
    {
      x:
        x +
        width -
        textWidth,

      y:
        y + 13,

      size:
        7.5,

      font:
        regularFont,

      color:
        COLORS.muted,
    }
  );

  page.drawRectangle({
    x,
    y,
    width,
    height: 7,

    color:
      COLORS.border,
  });

  page.drawRectangle({
    x,
    y,

    width:
      width *
      percentage /
      100,

    height: 7,

    color:
      COLORS.blue,
  });
};

/* =========================================================
   TITULO DE BLOQUE
========================================================= */

const drawBlockTitle = ({
  page,
  title,
  x,
  y,
  boldFont,
  size = 12,
}) => {
  page.drawText(
    normalizeText(
      title,
      ""
    ),
    {
      x,
      y,

      size,

      font:
        boldFont,

      color:
        COLORS.text,
    }
  );
};

/* =========================================================
   OBTENER DATOS
========================================================= */

const getReportData =
  async (
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

              as:
                "inscripcion",

              include: [
                {
                  model:
                    User,

                  as:
                    "user",
                },

                {
                  model:
                    Course,

                  as:
                    "course",
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

    if (
      !evaluation
    ) {
      const error =
        new Error(
          "La evaluación psicométrica no existe."
        );

      error.statusCode =
        404;

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

      error.statusCode =
        409;

      throw error;
    }

    if (
      !evaluation.resultado
    ) {
      const error =
        new Error(
          "La evaluación no tiene resultados calculados."
        );

      error.statusCode =
        409;

      throw error;
    }

    return {
      evaluation,

      user:
        evaluation
          .inscripcion
          ?.user ||
        {},

      course:
        evaluation
          .inscripcion
          ?.course ||
        {},

      personality:
        evaluation
          .personality ||
        evaluation
          .resultado
          ?.personality ||
        {},

      result:
        evaluation
          .resultado,
    };
  };

/* =========================================================
   GENERADOR PRINCIPAL
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
    } =
      await getReportData(
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
       RESULTADOS
    ===================================================== */

    const resultPersonality =
      result?.personality ||
      {};

    const animodo =
      result?.animodo ||
      {};

    const communication =
      result
        ?.communication ||
      {};

    const brain =
      result?.brain ||
      {};

    const negotiation =
      result
        ?.negotiation ||
      {};

    const vak =
      result?.vak ||
      {};

    const persistence =
      result
        ?.persistence ||
      {};

    const fullName =
      [
        user?.grado,
        user?.firstName,
        user?.lastName,
      ]
        .filter(Boolean)
        .map(
          repairMojibake
        )
        .join(" ");

    const animodoResult =
      animodo?.animal ||
      resultPersonality
        ?.resultadoAnimodo ||
      personality?.animal ||
      "-";

    const animal =
      resultPersonality
        ?.animal ||
      personality?.animal ||
      "-";

    const communicationType =
      communication
        ?.communicationType ||
      resultPersonality
        ?.tipoComunicacion ||
      personality
        ?.tipoComunicacion ||
      "-";

    const chestColor =
      communication
        ?.dominantColor ||
      resultPersonality
        ?.colorPecho ||
      personality
        ?.colorPecho ||
      "-";

    const brainCategory =
      brain
        ?.brainCategory ||
      resultPersonality
        ?.categoriaCerebro ||
      "-";

    const brainType =
      brain
        ?.brainType ||
      resultPersonality
        ?.tipoCerebro ||
      personality
        ?.tipoCerebro ||
      "-";

    const headColor =
      brain
        ?.headColor ||
      resultPersonality
        ?.colorCabeza ||
      personality
        ?.colorCabeza ||
      "-";

    const imageUrl =
      personality
        ?.imagenUrl ||
      resultPersonality
        ?.imagenUrl ||
      null;

    /* =====================================================
       LOG
    ===================================================== */

    console.log(
      "======================================"
    );

    console.log(
      "PDF PROYECTO PENSAR"
    );

    console.log(
      "evaluationId:",
      evaluationId
    );

    console.log(
      "personalityId:",
      evaluation
        ?.personalityId
    );

    console.log(
      "animal:",
      animal
    );

    console.log(
      "imagenUrl personalidad:",
      imageUrl
    );

    console.log(
      "logo:",
      BRAND.logoUrl
    );

    console.log(
      "======================================"
    );

    /* =====================================================
       IMÁGENES
    ===================================================== */

    const logoImage =
      await loadPdfImage({
        pdfDoc,

        imageUrl:
          BRAND.logoUrl,

        label:
          "logo institucional",
      });

    const personalityImage =
      await loadPdfImage({
        pdfDoc,

        imageUrl,

        label:
          "imagen personalidad",
      });

    /* =====================================================
       PÁGINA 1
       PORTADA
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
          COLORS.white,
      });

      /* =================================================
         FORMAS DECORATIVAS
      ================================================= */

      page.drawRectangle({
        x: 465,
        y: 710,

        width: 130,
        height: 132,

        color:
          COLORS.blue,
      });

      page.drawRectangle({
        x: 410,
        y: 665,

        width: 105,
        height: 105,

        color:
          COLORS.blueLight,
      });

      page.drawRectangle({
        x: 0,
        y: 0,

        width: 100,
        height: 115,

        color:
          COLORS.blue,
      });

      page.drawRectangle({
        x: 78,
        y: 45,

        width: 105,
        height: 105,

        color:
          COLORS.blueLight,
      });

      for (
        let row = 0;
        row < 4;
        row++
      ) {
        for (
          let col = 0;
          col < 6;
          col++
        ) {
          page.drawCircle({
            x:
              24 +
              col * 18,

            y:
              818 -
              row * 18,

            size: 2,

            color:
              COLORS.blue,
          });
        }
      }

      /* =================================================
         LOGO
      ================================================= */

      if (
        logoImage
      ) {
        drawContainedImage({
          page,

          image:
            logoImage,

          x: 172,
          y: 615,

          width: 250,
          height: 105,

          padding: 0,
        });
      } else {
        drawCenteredText({
          page,

          text:
            "iDr. MIND",

          y: 655,

          font:
            boldFont,

          size: 24,

          color:
            COLORS.navy,
        });
      }

      /* =================================================
         TÍTULO
      ================================================= */

      drawCenteredText({
        page,

        text:
          "INFORME DE",

        y: 515,

        font:
          boldFont,

        size: 36,

        color:
          COLORS.blue,
      });

      drawCenteredText({
        page,

        text:
          "RESULTADOS",

        y: 466,

        font:
          boldFont,

        size: 42,

        color:
          COLORS.blue,
      });

      drawCenteredText({
        page,

        text:
          "OBTENIDOS DEL TEST",

        y: 408,

        font:
          boldFont,

        size: 12,

        color:
          COLORS.text,
      });

      drawCenteredText({
        page,

        text:
          "PROYECTO PENSAR",

        y: 388,

        font:
          boldFont,

        size: 12,

        color:
          COLORS.text,
      });

      drawCenteredWrappedText({
        page,

        text:
          normalizeText(
            course?.nombre,
            "Test Psicotécnico de Personalidad"
          ),

        centerX:
          PAGE_WIDTH /
          2,

        y: 348,

        maxWidth: 400,

        font:
          regularFont,

        size: 9,

        lineHeight: 12,

        color:
          COLORS.muted,

        maxLines: 2,
      });

      /* =================================================
         PARTICIPANTE
      ================================================= */

      page.drawText(
        "PARTICIPANTE",
        {
          x: 68,
          y: 288,

          size:
            7,

          font:
            boldFont,

          color:
            COLORS.muted,
        }
      );

      drawWrappedText({
        page,

        text:
          fullName,

        x: 68,
        y: 261,

        maxWidth: 460,

        font:
          boldFont,

        size:
          fullName.length >
          45
            ? 13
            : 16,

        lineHeight:
          19,

        color:
          COLORS.navy,

        maxLines: 2,
      });

      /* =================================================
         DATOS
      ================================================= */

      page.drawRectangle({
        x: 68,
        y: 168,

        width: 460,
        height: 62,

        color:
          COLORS.soft,

        borderColor:
          COLORS.border,

        borderWidth: 1,
      });

      page.drawText(
        "EVALUACIÓN",
        {
          x: 88,
          y: 205,

          size:
            6.5,

          font:
            boldFont,

          color:
            COLORS.muted,
        }
      );

      page.drawText(
        `N. ${normalizeText(
          evaluation
            ?.numeroEvaluacion
        )}`,
        {
          x: 88,
          y: 185,

          size:
            9,

          font:
            boldFont,

          color:
            COLORS.navy,
        }
      );

      page.drawText(
        "FECHA",
        {
          x: 245,
          y: 205,

          size:
            6.5,

          font:
            boldFont,

          color:
            COLORS.muted,
        }
      );

      page.drawText(
        formatDate(
          evaluation
            ?.fechaFinalizacion
        ),
        {
          x: 245,
          y: 185,

          size:
            8,

          font:
            boldFont,

          color:
            COLORS.navy,
        }
      );

      page.drawText(
        "ESTADO",
        {
          x: 430,
          y: 205,

          size:
            6.5,

          font:
            boldFont,

          color:
            COLORS.muted,
        }
      );

      page.drawText(
        "FINALIZADO",
        {
          x: 430,
          y: 185,

          size:
            8,

          font:
            boldFont,

          color:
            COLORS.green,
        }
      );

      drawCenteredText({
        page,

        text:
          "Documento personal y confidencial",

        y: 90,

        font:
          regularFont,

        size: 7,

        color:
          COLORS.muted,
      });
    }

    /* =====================================================
       PÁGINA 2
       DIAGNÓSTICO EJECUTIVO MEJORADO
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ]);

      drawCorporateHeader({
        page,
        fullName,
        logoImage,
        boldFont,
        regularFont,
      });

      /* =================================================
         TÍTULO
      ================================================= */

      page.drawText(
        "DIAGNÓSTICO EJECUTIVO",
        {
          x: MARGIN,
          y: 660,

          size: 8.5,

          font:
            boldFont,

          color:
            COLORS.blue,
        }
      );

      page.drawText(
        "Síntesis general",
        {
          x: MARGIN,
          y: 631,

          size: 21,

          font:
            boldFont,

          color:
            COLORS.navy,
        }
      );

      page.drawText(
        "de resultados",
        {
          x: MARGIN,
          y: 605,

          size: 21,

          font:
            boldFont,

          color:
            COLORS.navy,
        }
      );

      /*
       * Firma gráfica del título.
       */
      page.drawRectangle({
        x:
          MARGIN,

        y: 584,

        width: 74,

        height: 3,

        color:
          COLORS.blue,
      });

      page.drawRectangle({
        x:
          MARGIN +
          74,

        y: 584,

        width: 28,

        height: 3,

        color:
          COLORS.yellow,
      });

      /* =================================================
         PERSISTENCIA SUPERIOR
      ================================================= */

      drawExecutiveResult({
        page,

        x: 250,
        y: 563,

        width: 105,

        title:
          "PERSISTENCIA",

        value:
          persistence
            ?.level,

        subtitle:
          `Índice ${normalizeText(
            persistence
              ?.score
          )} / 4`,

        accentColor:
          getExecutiveColor(
            "persistence",
            persistence
              ?.level
          ),

        regularFont,
        boldFont,
      });

      /* =================================================
         COMUNICACIÓN
      ================================================= */

      drawExecutiveResult({
        page,

        x: 40,
        y: 500,

        width: 135,

        title:
          "COMUNICACIÓN",

        value:
          communicationType,

        subtitle:
          `Color dominante: ${chestColor}`,

        accentColor:
          getExecutiveColor(
            "communication",
            chestColor
          ),

        regularFont,
        boldFont,
      });

      /* =================================================
         VAK
      ================================================= */

      drawExecutiveResult({
        page,

        x: 420,
        y: 500,

        width: 135,

        title:
          "SISTEMA VAK",

        value:
          prettyText(
            vak
              ?.dominantStyle
          ),

        subtitle:
          "Canal predominante",

        accentColor:
          getExecutiveColor(
            "vak",
            vak
              ?.dominantStyle
          ),

        regularFont,
        boldFont,
      });

      /* =================================================
         HALO CENTRAL
      ================================================= */

      page.drawCircle({
        x: 298,
        y: 376,

        size: 112,

        color:
          COLORS.soft,
      });

      page.drawCircle({
        x: 298,
        y: 376,

        size: 99,

        color:
          COLORS.white,
      });

      /* =================================================
         PERSONAJE
      ================================================= */

      drawContainedImage({
        page,

        image:
          personalityImage,

        x: 195,
        y: 277,

        width: 206,
        height: 220,

        padding: 0,

        background:
          COLORS.white,
      });

      /*
       * Nombre animal.
       */
      drawCenteredWrappedText({
        page,

        text:
          animal,

        centerX: 298,

        y: 263,

        maxWidth: 200,

        font:
          boldFont,

        size: 13,

        lineHeight: 15,

        color:
          COLORS.navy,

        maxLines: 2,
      });

      /*
       * Nombre completo del perfil.
       */
      const executivePersonalityName =
        personality
          ?.nombre ||
        resultPersonality
          ?.nombre ||
        "";

      if (
        executivePersonalityName &&
        executivePersonalityName
          .toUpperCase() !==
          String(
            animal
          ).toUpperCase()
      ) {
        drawCenteredWrappedText({
          page,

          text:
            executivePersonalityName,

          centerX: 298,

          y: 242,

          maxWidth: 220,

          font:
            regularFont,

          size: 7.5,

          lineHeight: 10,

          color:
            COLORS.muted,

          maxLines: 2,
        });
      }

      /* =================================================
         NEGOCIACIÓN
      ================================================= */

      drawExecutiveResult({
        page,

        x: 40,
        y: 350,

        width: 135,

        title:
          "NEGOCIACIÓN",

        value:
          negotiation
            ?.classification,

        subtitle:
          `Puntaje ${normalizeText(
            negotiation
              ?.totalScore
          )} / 90`,

        accentColor:
          getExecutiveColor(
            "negotiation",
            negotiation
              ?.classification
          ),

        regularFont,
        boldFont,
      });

      /* =================================================
         CEREBRO
      ================================================= */

      drawExecutiveResult({
        page,

        x: 420,
        y: 350,

        width: 135,

        title:
          "TIPO DE CEREBRO",

        value:
          brainCategory,

        subtitle:
          brainType,

        accentColor:
          getExecutiveColor(
            "brain",
            brainCategory
          ),

        regularFont,
        boldFont,
      });

      /* =================================================
         ANIMODO
      ================================================= */

      page.drawLine({
        start: {
          x: 150,
          y: 178,
        },

        end: {
          x: 445,
          y: 178,
        },

        thickness:
          0.7,

        color:
          COLORS.border,
      });

      drawCenteredText({
        page,

        text:
          "ANIMODO",

        y: 151,

        font:
          boldFont,

        size: 7.5,

        color:
          COLORS.muted,
      });

      drawCenteredWrappedText({
        page,

        text:
          animodoResult,

        centerX: 298,

        y: 126,

        maxWidth: 300,

        font:
          boldFont,

        size:
          String(
            animodoResult ||
            ""
          ).length >
          25
            ? 11.5
            : 14.5,

        lineHeight: 16,

        color:
          COLORS.navy,

        maxLines: 2,
      });

      drawCenteredWrappedText({
        page,

        text:
          `Sentir / Pensar ${normalizeText(
            animodo
              ?.axes
              ?.sentirPensar
          )}   -   Actuar / Observar ${normalizeText(
            animodo
              ?.axes
              ?.actuarObservar
          )}`,

        centerX: 298,

        y: 88,

        maxWidth: 330,

        font:
          regularFont,

        size: 7.5,

        lineHeight: 10,

        color:
          COLORS.textSoft,

        maxLines: 2,
      });

      page.drawRectangle({
        x: 264,
        y: 65,

        width: 68,
        height: 3,

        color:
          getExecutiveColor(
            "animodo",
            animodoResult
          ),
      });

      drawFooter({
        page,
        number: 2,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 3
       TIPO DE CEREBRO + VAK
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ]);

      drawCorporateHeader({
        page,
        fullName,
        logoImage,
        boldFont,
        regularFont,
      });

      /* =================================================
         CEREBRO
      ================================================= */

      drawBlockTitle({
        page,

        title:
          "TIPO DE CEREBRO",

        x: 60,
        y: 665,

        boldFont,
      });

      const brainScores =
        brain?.scores ||
        {};

      drawResultCard({
        page,

        x: 45,
        y: 525,

        width: 145,
        height: 105,

        title:
          "IZQUIERDO",

        value:
          brainScores
            ?.IZQUIERDO ??
          0,

        subtitle:
          "Pensar / Visual",

        regularFont,
        boldFont,

        active:
          brainCategory ===
          "IZQUIERDO",
      });

      drawResultCard({
        page,

        x: 205,
        y: 525,

        width: 145,
        height: 105,

        title:
          "CENTRAL",

        value:
          brainScores
            ?.CENTRAL ??
          0,

        subtitle:
          "Hacer / Auditivo",

        regularFont,
        boldFont,

        active:
          brainCategory ===
          "CENTRAL",
      });

      drawResultCard({
        page,

        x: 365,
        y: 525,

        width: 145,
        height: 105,

        title:
          "DERECHO",

        value:
          brainScores
            ?.DERECHO ??
          0,

        subtitle:
          "Sentir / Kinestésico",

        regularFont,
        boldFont,

        active:
          brainCategory ===
          "DERECHO",
      });

      page.drawText(
        "RESULTADO",
        {
          x: 55,
          y: 490,

          size: 7,

          font:
            boldFont,

          color:
            COLORS.muted,
        }
      );

      drawWrappedText({
        page,

        text:
          brainType,

        x: 55,
        y: 470,

        maxWidth: 475,

        font:
          boldFont,

        size: 11,

        lineHeight: 13,

        color:
          COLORS.blue,

        maxLines: 2,
      });

      drawWrappedText({
        page,

        text:
          `Categoría: ${brainCategory}. Color asociado: ${headColor}. ${normalizeText(
            personality
              ?.formaPensar ||
            resultPersonality
              ?.formaPensar ||
            ""
          )}`,

        x: 55,
        y: 435,

        maxWidth: 475,

        font:
          regularFont,

        size: 8.7,

        lineHeight: 12.5,

        color:
          COLORS.textSoft,

        maxLines: 7,
      });

      /* =================================================
         DIVISOR
      ================================================= */

      page.drawLine({
        start: {
          x: MARGIN,
          y: 355,
        },

        end: {
          x:
            PAGE_WIDTH -
            MARGIN,

          y: 355,
        },

        thickness: 1,

        color:
          COLORS.border,
      });

      /* =================================================
         VAK
      ================================================= */

      drawBlockTitle({
        page,

        title:
          "SISTEMA REPRESENTACIONAL VAK",

        x: 60,
        y: 320,

        boldFont,
      });

      const vakScores =
        vak?.scores ||
        {};

      drawResultCard({
        page,

        x: 45,
        y: 180,

        width: 145,
        height: 105,

        title:
          "VISUAL",

        value:
          vakScores
            ?.VISUAL ??
          0,

        subtitle:
          "Cantidad",

        regularFont,
        boldFont,

        active:
          vak
            ?.dominantStyle ===
          "VISUAL",
      });

      drawResultCard({
        page,

        x: 205,
        y: 180,

        width: 145,
        height: 105,

        title:
          "AUDITIVO",

        value:
          vakScores
            ?.AUDITIVO ??
          0,

        subtitle:
          "Cantidad",

        regularFont,
        boldFont,

        active:
          vak
            ?.dominantStyle ===
          "AUDITIVO",
      });

      drawResultCard({
        page,

        x: 365,
        y: 180,

        width: 145,
        height: 105,

        title:
          "KINESTÉSICO",

        value:
          vakScores
            ?.KINESTESICO ??
          0,

        subtitle:
          "Cantidad",

        regularFont,
        boldFont,

        active:
          vak
            ?.dominantStyle ===
          "KINESTESICO",
      });

      drawWrappedText({
        page,

        text:
          `Canal predominante: ${prettyText(
            vak
              ?.dominantStyle
          )}. ${normalizeText(
            personality
              ?.formaAprender ||
            resultPersonality
              ?.formaAprender ||
            ""
          )}`,

        x: 55,
        y: 145,

        maxWidth: 475,

        font:
          regularFont,

        size: 8.7,

        lineHeight: 12.5,

        color:
          COLORS.textSoft,

        maxLines: 6,
      });

      drawFooter({
        page,
        number: 3,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 4
       NEGOCIACIÓN + COMUNICACIÓN
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ]);

      drawCorporateHeader({
        page,
        fullName,
        logoImage,
        boldFont,
        regularFont,
      });

      /* =================================================
         NEGOCIACIÓN
      ================================================= */

      drawBlockTitle({
        page,

        title:
          "NIVEL DE NEGOCIACIÓN",

        x: 60,
        y: 665,

        boldFont,
      });

      page.drawRectangle({
        x: 78,
        y: 505,

        width: 125,
        height: 125,

        color:
          COLORS.blue,
      });

      const negotiationScoreText =
        normalizeText(
          negotiation
            ?.totalScore
        );

      const negotiationScoreWidth =
        boldFont.widthOfTextAtSize(
          negotiationScoreText,
          32
        );

      page.drawText(
        negotiationScoreText,
        {
          x:
            78 +
            (
              125 -
              negotiationScoreWidth
            ) /
              2,

          y: 550,

          size: 32,

          font:
            boldFont,

          color:
            COLORS.white,
        }
      );

      page.drawText(
        "de 90",
        {
          x: 120,
          y: 530,

          size: 7,

          font:
            regularFont,

          color:
            COLORS.white,
        }
      );

      page.drawText(
        "CLASIFICACIÓN",
        {
          x: 280,
          y: 615,

          size: 7,

          font:
            boldFont,

          color:
            COLORS.muted,
        }
      );

      page.drawText(
        normalizeText(
          negotiation
            ?.classification
        ),
        {
          x: 280,
          y: 590,

          size: 15,

          font:
            boldFont,

          color:
            getExecutiveColor(
              "negotiation",
              negotiation
                ?.classification
            ),
        }
      );

      drawWrappedText({
        page,

        text:
          negotiation
            ?.quality ||
          "Resultado correspondiente a la forma negociadora.",

        x: 280,
        y: 555,

        maxWidth: 255,

        font:
          regularFont,

        size: 9,

        lineHeight: 13,

        color:
          COLORS.textSoft,

        maxLines: 8,
      });

      /* =================================================
         DIVISOR
      ================================================= */

      page.drawLine({
        start: {
          x: MARGIN,
          y: 430,
        },

        end: {
          x:
            PAGE_WIDTH -
            MARGIN,

          y: 430,
        },

        thickness: 1,

        color:
          COLORS.border,
      });

      /* =================================================
         COMUNICACIÓN
      ================================================= */

      drawBlockTitle({
        page,

        title:
          "COLORES DE LA COMUNICACIÓN",

        x: 60,
        y: 395,

        boldFont,
      });

      const percentages =
        communication
          ?.percentages ||
        {};

      drawBar({
        page,

        x: 60,
        y: 338,

        width: 210,

        label:
          "Amarillo",

        value:
          percentages
            ?.AMARILLO,

        regularFont,
        boldFont,
      });

      drawBar({
        page,

        x: 60,
        y: 295,

        width: 210,

        label:
          "Rojo",

        value:
          percentages
            ?.ROJO,

        regularFont,
        boldFont,
      });

      drawBar({
        page,

        x: 315,
        y: 338,

        width: 210,

        label:
          "Azul",

        value:
          percentages
            ?.AZUL,

        regularFont,
        boldFont,
      });

      drawBar({
        page,

        x: 315,
        y: 295,

        width: 210,

        label:
          "Verde",

        value:
          percentages
            ?.VERDE,

        regularFont,
        boldFont,
      });

      page.drawText(
        "RESULTADO",
        {
          x: 60,
          y: 250,

          size: 7,

          font:
            boldFont,

          color:
            COLORS.muted,
        }
      );

      page.drawText(
        `${normalizeText(
          communicationType
        )} - ${normalizeText(
          chestColor
        )}`,
        {
          x: 60,
          y: 228,

          size: 12,

          font:
            boldFont,

          color:
            getExecutiveColor(
              "communication",
              chestColor
            ),
        }
      );

      drawWrappedText({
        page,

        text:
          personality
            ?.descripcionComunicacion ||
          resultPersonality
            ?.descripcionComunicacion ||
          "Sin descripción específica configurada.",

        x: 60,
        y: 198,

        maxWidth: 470,

        font:
          regularFont,

        size: 8.7,

        lineHeight: 12.5,

        color:
          COLORS.textSoft,

        maxLines: 9,
      });

      drawFooter({
        page,
        number: 4,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 5
       PERSISTENCIA + ANIMODO
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ]);

      drawCorporateHeader({
        page,
        fullName,
        logoImage,
        boldFont,
        regularFont,
      });

      /* =================================================
         PERSISTENCIA
      ================================================= */

      drawBlockTitle({
        page,

        title:
          "NIVEL DE PERSISTENCIA",

        x: 60,
        y: 665,

        boldFont,
      });

      const persistenceColor =
        getExecutiveColor(
          "persistence",
          persistence
            ?.level
        );

      page.drawRectangle({
        x: 85,
        y: 510,

        width: 120,
        height: 120,

        color:
          persistenceColor,
      });

      const persistenceText =
        normalizeText(
          persistence
            ?.level
        );

      const persistenceWidth =
        boldFont.widthOfTextAtSize(
          persistenceText,
          28
        );

      page.drawText(
        persistenceText,
        {
          x:
            85 +
            (
              120 -
              persistenceWidth
            ) /
              2,

          y: 552,

          size: 28,

          font:
            boldFont,

          color:
            COLORS.white,
        }
      );

      page.drawText(
        "INDICADOR INTEGRADO",
        {
          x: 280,
          y: 615,

          size: 7,

          font:
            boldFont,

          color:
            COLORS.muted,
        }
      );

      page.drawText(
        `Índice ${normalizeText(
          persistence
            ?.score
        )} / 4`,
        {
          x: 280,
          y: 588,

          size: 14,

          font:
            boldFont,

          color:
            persistenceColor,
        }
      );

      drawWrappedText({
        page,

        text:
          "El indicador de persistencia integra los resultados obtenidos en Animodo, comunicación, tipo de cerebro y forma negociadora.",

        x: 280,
        y: 552,

        maxWidth: 245,

        font:
          regularFont,

        size: 9,

        lineHeight: 13,

        color:
          COLORS.textSoft,

        maxLines: 7,
      });

      /* =================================================
         DIVISOR
      ================================================= */

      page.drawLine({
        start: {
          x: MARGIN,
          y: 430,
        },

        end: {
          x:
            PAGE_WIDTH -
            MARGIN,

          y: 430,
        },

        thickness: 1,

        color:
          COLORS.border,
      });

      /* =================================================
         ANIMODO
      ================================================= */

      drawBlockTitle({
        page,

        title:
          "ANIMODO",

        x: 60,
        y: 395,

        boldFont,
      });

      drawResultCard({
        page,

        x: 45,
        y: 255,

        width: 145,
        height: 105,

        title:
          "SENTIR / PENSAR",

        value:
          animodo
            ?.axes
            ?.sentirPensar,

        subtitle:
          "Eje",

        regularFont,
        boldFont,
      });

      drawResultCard({
        page,

        x: 205,
        y: 255,

        width: 145,
        height: 105,

        title:
          "ACTUAR / OBSERVAR",

        value:
          animodo
            ?.axes
            ?.actuarObservar,

        subtitle:
          "Eje",

        regularFont,
        boldFont,
      });

      drawResultCard({
        page,

        x: 365,
        y: 255,

        width: 145,
        height: 105,

        title:
          "RESULTADO",

        value:
          animodoResult,

        subtitle:
          "Perfil conductual",

        regularFont,
        boldFont,

        active:
          true,
      });

      drawWrappedText({
        page,

        text:
          personality
            ?.descripcion ||
          resultPersonality
            ?.descripcion ||
          "Resultado integral del perfil de personalidad.",

        x: 55,
        y: 215,

        maxWidth: 475,

        font:
          regularFont,

        size: 8.7,

        lineHeight: 12.5,

        color:
          COLORS.textSoft,

        maxLines: 10,
      });

      drawFooter({
        page,
        number: 5,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 6
       PERFIL INTEGRAL + RECOMENDACIONES
    ===================================================== */

    {
      const page =
        pdfDoc.addPage([
          PAGE_WIDTH,
          PAGE_HEIGHT,
        ]);

      drawCorporateHeader({
        page,
        fullName,
        logoImage,
        boldFont,
        regularFont,
      });

      /* =================================================
         PERFIL
      ================================================= */

      drawBlockTitle({
        page,

        title:
          "PERFIL INTEGRAL",

        x: 60,
        y: 665,

        boldFont,
      });

      /*
       * Imagen siempre sobre blanco.
       */
      page.drawRectangle({
        x: 58,
        y: 425,

        width: 185,
        height: 215,

        color:
          COLORS.white,

        borderColor:
          COLORS.border,

        borderWidth: 1,
      });

      drawContainedImage({
        page,

        image:
          personalityImage,

        x: 66,
        y: 455,

        width: 169,
        height: 170,

        padding: 3,
      });

      drawCenteredWrappedText({
        page,

        text:
          animal,

        centerX:
          150,

        y: 438,

        maxWidth: 165,

        font:
          boldFont,

        size: 11,

        lineHeight: 12,

        color:
          COLORS.blue,

        maxLines: 2,
      });

      const personalityName =
        personality
          ?.nombre ||
        resultPersonality
          ?.nombre ||
        animal;

      drawWrappedText({
        page,

        text:
          personalityName,

        x: 275,
        y: 630,

        maxWidth: 260,

        font:
          boldFont,

        size: 13,

        lineHeight: 16,

        color:
          COLORS.blue,

        maxLines: 3,
      });

      drawWrappedText({
        page,

        text:
          personality
            ?.descripcion ||
          resultPersonality
            ?.descripcion ||
          "Perfil integral de personalidad.",

        x: 275,
        y: 575,

        maxWidth: 260,

        font:
          regularFont,

        size: 8.5,

        lineHeight: 12,

        color:
          COLORS.textSoft,

        maxLines: 12,
      });

      /* =================================================
         RECOMENDACIONES
      ================================================= */

      page.drawLine({
        start: {
          x: MARGIN,
          y: 385,
        },

        end: {
          x:
            PAGE_WIDTH -
            MARGIN,

          y: 385,
        },

        thickness: 1,

        color:
          COLORS.border,
      });

      drawCenteredText({
        page,

        text:
          "RECOMENDACIONES",

        y: 345,

        font:
          boldFont,

        size: 17,

        color:
          COLORS.text,
      });

      const recommendations =
        [];

      if (
        persistence
          ?.level ===
          "NO" ||
        persistence
          ?.level ===
          "ALERTA"
      ) {
        recommendations.push(
          "Fortalecer la constancia en objetivos de mediano y largo plazo mediante seguimiento periódico y definición clara de metas."
        );
      } else {
        recommendations.push(
          "Mantener los hábitos que favorecen la constancia y el seguimiento de objetivos, incorporando metas progresivas de mayor complejidad."
        );
      }

      if (
        negotiation
          ?.classification ===
        "BAJO"
      ) {
        recommendations.push(
          "Desarrollar habilidades de negociación mediante preparación previa, escucha activa, claridad de objetivos y búsqueda de acuerdos equilibrados."
        );
      } else {
        recommendations.push(
          "Continuar fortaleciendo la negociación, procurando equilibrar objetivos, relación interpersonal y flexibilidad."
        );
      }

      recommendations.push(
        `Aprovechar el canal ${prettyText(
          vak
            ?.dominantStyle
        )} como apoyo principal para aprender, organizar y recuperar información.`
      );

      recommendations.push(
        `Reconocer la preferencia cerebral ${brainType} al planificar tareas, tomar decisiones y resolver problemas.`
      );

      recommendations.push(
        `Adaptar la comunicación considerando el estilo ${communicationType}, manteniendo apertura frente a personas con estilos diferentes.`
      );

      recommendations.push(
        `Utilizar el resultado Animodo ${animodoResult} como referencia para reconocer fortalezas conductuales y oportunidades de mayor flexibilidad.`
      );

      let y =
        302;

      recommendations
        .slice(
          0,
          6
        )
        .forEach(
          (
            recommendation,
            index
          ) => {
            page.drawCircle({
              x: 68,

              y:
                y + 4,

              size: 9,

              color:
                COLORS.blue,
            });

            page.drawText(
              String(
                index + 1
              ),
              {
                x:
                  65,

                y,

                font:
                  boldFont,

                size: 7,

                color:
                  COLORS.white,
              }
            );

            y =
              drawWrappedText({
                page,

                text:
                  recommendation,

                x: 90,

                y:
                  y + 4,

                maxWidth: 440,

                font:
                  regularFont,

                size: 8.5,

                lineHeight: 12,

                color:
                  COLORS.textSoft,

                maxLines: 3,
              }) - 13;
          }
        );

      drawFooter({
        page,
        number: 6,
        regularFont,
      });
    }

    /* =====================================================
       METADATA
    ===================================================== */

    pdfDoc.setTitle(
      `Informe Proyecto Pensar - ${normalizeText(
        fullName
      )}`
    );

    pdfDoc.setAuthor(
      "iDr.Mind"
    );

    pdfDoc.setSubject(
      "Informe de resultados Proyecto Pensar"
    );

    pdfDoc.setCreator(
      "iDr.Mind"
    );

    pdfDoc.setProducer(
      "iDr.Mind"
    );

    /* =====================================================
       SAVE
    ===================================================== */

    const bytes =
      await pdfDoc.save();

    console.log(
      "======================================"
    );

    console.log(
      "✅ PDF GENERADO CORRECTAMENTE"
    );

    console.log(
      "🏢 Logo institucional:",
      Boolean(
        logoImage
      )
    );

    console.log(
      "🧠 Imagen personalidad:",
      Boolean(
        personalityImage
      )
    );

    console.log(
      "📦 Tamaño:",
      bytes.length,
      "bytes"
    );

    console.log(
      "======================================"
    );

    return Buffer.from(
      bytes
    );
  };

module.exports =
  generarInformePsicometrico;