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
   MARCA / ASSETS
========================================================= */

const BRAND = {
  logoPath: path.resolve(
    __dirname,
    "../assets/test_logo.png"
  ),

  logoUrl:
    "https://idrmind.com/images/test_logo.png",

  personalitiesPath: path.resolve(
    __dirname,
    "../assets/personalidades"
  ),

  website: "www.idrmind.com",
  city: "Quito, Ecuador",
  email: "info@idrmind.com / idrmind@gmail.com",

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

  blue2: rgb(
    36 / 255,
    87 / 255,
    180 / 255
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

  white: rgb(1, 1, 1),

  success: rgb(
    8 / 255,
    116 / 255,
    67 / 255
  ),

  successSoft: rgb(
    236 / 255,
    253 / 255,
    243 / 255
  ),

  warning: rgb(
    181 / 255,
    71 / 255,
    8 / 255
  ),

  warningSoft: rgb(
    255 / 255,
    244 / 255,
    229 / 255
  ),

  red: rgb(
    217 / 255,
    45 / 255,
    32 / 255
  ),

  redDark: rgb(
    180 / 255,
    35 / 255,
    24 / 255
  ),

  redSoft: rgb(
    255 / 255,
    240 / 255,
    238 / 255
  ),

  yellow: rgb(
    228 / 255,
    169 / 255,
    0 / 255
  ),

  yellowSoft: rgb(
    255 / 255,
    249 / 255,
    218 / 255
  ),

  green: rgb(
    7 / 255,
    148 / 255,
    85 / 255
  ),

  greenSoft: rgb(
    236 / 255,
    253 / 255,
    243 / 255
  ),
};

/* =========================================================
   REPARAR TEXTO
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

  let text = String(value);

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
        ).toString("utf8");

      if (
        repaired &&
        !repaired.includes(
          "\uFFFD"
        )
      ) {
        text = repaired;
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
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return repairMojibake(
    value
  )
    .normalize("NFC")
    .replace(/\uFFFD/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[•●▪]/g, "-")
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      ""
    )
    .trim();
};

const prettyText = (
  value,
  fallback = "-"
) =>
  normalizeText(
    value,
    fallback
  )
    .replace(/_/g, " ")
    .trim();

/* =========================================================
   NORMALIZAR NOMBRE PARA BUSCAR ARCHIVOS
========================================================= */

const normalizeFileKey = (
  value
) =>
  normalizeText(value, "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /\.(png|jpg|jpeg)$/i,
      ""
    )
    .replace(
      /[^a-z0-9]/g,
      ""
    );

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

        year: "numeric",
        month: "long",
        day: "2-digit",

        hour: "2-digit",
        minute: "2-digit",

        hour12: false,
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
   WRAP
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
    safe.split(/\s+/);

  const lines = [];

  let current = "";

  for (
    const word of words
  ) {
    const candidate =
      current
        ? `${current} ${word}`
        : word;

    let width = 0;

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
      width <= maxWidth
    ) {
      current =
        candidate;
    } else {
      if (current) {
        lines.push(
          current
        );
      }

      current = word;
    }
  }

  if (current) {
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
  size = 10,
  lineHeight = 14,
  color = COLORS.text,
  maxLines = null,
}) => {
  let lines =
    wrapText({
      text,
      font,
      fontSize: size,
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

  let currentY = y;

  for (
    const line of lines
  ) {
    page.drawText(
      normalizeText(
        line,
        ""
      ),
      {
        x,
        y: currentY,
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
        ) / 2,

      y,

      font,
      size,
      color,
    }
  );
};

const drawCenteredWrappedText =
  ({
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

    let currentY = y;

    for (
      const line of lines
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

          y: currentY,
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
   IMÁGENES
========================================================= */

const embedImage = async ({
  pdfDoc,
  bytes,
  source,
  contentType = "",
}) => {
  const lower =
    String(source)
      .toLowerCase();

  const type =
    String(
      contentType
    ).toLowerCase();

  if (
    lower.endsWith(
      ".png"
    ) ||
    type.includes(
      "png"
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

  if (
    lower.endsWith(
      ".jpg"
    ) ||
    lower.endsWith(
      ".jpeg"
    ) ||
    type.includes(
      "jpeg"
    ) ||
    type.includes(
      "jpg"
    )
  ) {
    try {
      return await pdfDoc.embedJpg(
        bytes
      );
    } catch {
      //
    }
  }

  try {
    return await pdfDoc.embedPng(
      bytes
    );
  } catch {
    //
  }

  try {
    return await pdfDoc.embedJpg(
      bytes
    );
  } catch {
    return null;
  }
};

const loadLocalImage =
  async ({
    pdfDoc,
    filePath,
    label,
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

      const image =
        await embedImage({
          pdfDoc,
          bytes,
          source:
            filePath,
        });

      if (image) {
        console.log(
          `✅ ${label}:`,
          filePath
        );
      }

      return image;
    } catch (error) {
      console.log(
        `⚠️ ${label}:`,
        error.message
      );

      return null;
    }
  };

const loadRemoteImage =
  async ({
    pdfDoc,
    url,
    label,
  }) => {
    if (!url) {
      return null;
    }

    try {
      const response =
        await fetch(
          url,
          {
            redirect:
              "follow",

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

      const type =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        type.includes(
          "text/html"
        )
      ) {
        return null;
      }

      const bytes =
        await response.arrayBuffer();

      const image =
        await embedImage({
          pdfDoc,
          bytes,
          source: url,
          contentType:
            type,
        });

      if (image) {
        console.log(
          `✅ ${label} remota:`,
          url
        );
      }

      return image;
    } catch (
    error
    ) {
      console.log(
        `⚠️ ${label}:`,
        error.message
      );

      return null;
    }
  };

/* =========================================================
   BUSCAR PERSONALIDAD EN
   src/assets/personalidades
========================================================= */

const findPersonalityAsset = ({
  imageUrl,
  animal,
  name,
  codigo,
}) => {
  const folder =
    BRAND.personalitiesPath;

  if (
    !fs.existsSync(folder)
  ) {
    console.log(
      "⚠️ No existe carpeta de personalidades:",
      folder
    );

    return null;
  }

  const files =
    fs.readdirSync(
      folder
    ).filter(
      (file) =>
        /\.(png|jpg|jpeg)$/i.test(
          file
        )
    );

  if (!files.length) {
    return null;
  }

  const keys = new Set();

  const addKey = (
    value
  ) => {
    const key =
      normalizeFileKey(
        value
      );

    if (key) {
      keys.add(key);
    }
  };

  addKey(animal);
  addKey(name);
  addKey(codigo);

  /*
   * Si imagenUrl es:
   * /images/personalidades/camaleon.png
   * obtenemos camaleon.png.
   */
  if (imageUrl) {
    try {
      const clean =
        String(imageUrl)
          .split("?")[0]
          .replace(
            /\\/g,
            "/"
          );

      addKey(
        path.basename(clean)
      );
    } catch {
      //
    }
  }

  /*
   * 1. Coincidencia exacta
   */
  for (
    const file of files
  ) {
    const fileKey =
      normalizeFileKey(
        file
      );

    if (
      keys.has(fileKey)
    ) {
      return path.join(
        folder,
        file
      );
    }
  }

  /*
   * 2. Coincidencia parcial.
   * Sirve si el front usa:
   * camaleon_rojo_azul.png
   */
  for (
    const file of files
  ) {
    const fileKey =
      normalizeFileKey(
        file
      );

    for (
      const key of keys
    ) {
      if (
        key.length >= 4 &&
        (
          fileKey.includes(
            key
          ) ||
          key.includes(
            fileKey
          )
        )
      ) {
        return path.join(
          folder,
          file
        );
      }
    }
  }

  return null;
};

const loadPersonalityImage =
  async ({
    pdfDoc,
    personality,
    resultPersonality,
    animal,
  }) => {
    const imageUrl =
      personality?.imagenUrl ||
      resultPersonality
        ?.imagenUrl ||
      null;

    const localPath =
      findPersonalityAsset({
        imageUrl,

        animal,

        name:
          personality?.nombre ||
          resultPersonality
            ?.nombre,

        codigo:
          personality?.codigo ||
          resultPersonality
            ?.codigo,
      });

    /*
     * PRIMERO LOCAL.
     */
    if (localPath) {
      const local =
        await loadLocalImage({
          pdfDoc,

          filePath:
            localPath,

          label:
            "Personalidad local",
        });

      if (local) {
        return local;
      }
    }

    /*
     * RESPALDO URL.
     */
    if (
      imageUrl &&
      /^https?:\/\//i.test(
        String(imageUrl)
      )
    ) {
      return await loadRemoteImage({
        pdfDoc,

        url:
          imageUrl,

        label:
          "Personalidad",
      });
    }

    return null;
  };

/* =========================================================
   DIBUJAR IMAGEN CONTENIDA
========================================================= */

const drawContainedImage = ({
  page,
  image,
  x,
  y,
  width,
  height,
  padding = 0,
  background =
  COLORS.white,
}) => {
  if (background) {
    page.drawRectangle({
      x,
      y,
      width,
      height,

      color:
        background,
    });
  }

  if (!image) {
    return;
  }

  const maxWidth =
    width -
    padding * 2;

  const maxHeight =
    height -
    padding * 2;

  const scale =
    Math.min(
      maxWidth /
      image.width,

      maxHeight /
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
        ) / 2,

      y:
        y +
        (
          height -
          finalHeight
        ) / 2,

      width:
        finalWidth,

      height:
        finalHeight,
    }
  );
};

/* =========================================================
   LOGO
========================================================= */

const drawLogo = ({
  page,
  image,
  centerX,
  y,
  maxWidth,
  maxHeight,
}) => {
  if (!image) {
    return;
  }

  const scale =
    Math.min(
      maxWidth /
      image.width,

      maxHeight /
      image.height
    );

  const width =
    image.width *
    scale;

  const height =
    image.height *
    scale;

  page.drawImage(
    image,
    {
      x:
        centerX -
        width / 2,

      y,

      width,
      height,
    }
  );
};

/* =========================================================
   HEADER
========================================================= */

const drawCorporateHeader = ({
  page,
  fullName,
  logoImage,
  boldFont,
  regularFont,
}) => {
  if (logoImage) {
    drawLogo({
      page,
      image:
        logoImage,

      centerX: 135,
      y: 755,

      maxWidth: 200,
      maxHeight: 65,
    });
  } else {
    page.drawText(
      "iDr.Mind.",
      {
        x: 42,
        y: 793,

        font:
          boldFont,

        size: 18,

        color:
          COLORS.blue,
      }
    );
  }

  const contactX = 350;

  page.drawText(
    BRAND.city,
    {
      x: contactX,
      y: 808,

      font:
        regularFont,

      size: 6.8,

      color:
        COLORS.textSoft,
    }
  );

  page.drawText(
    BRAND.phone,
    {
      x: contactX,
      y: 794,

      font:
        regularFont,

      size: 6.8,

      color:
        COLORS.textSoft,
    }
  );

  page.drawText(
    BRAND.email,
    {
      x: contactX,
      y: 780,

      font:
        regularFont,

      size: 6.8,

      color:
        COLORS.textSoft,
    }
  );

  page.drawText(
    BRAND.website,
    {
      x: contactX,
      y: 766,

      font:
        regularFont,

      size: 6.8,

      color:
        COLORS.textSoft,
    }
  );

  /*
   * Línea institucional.
   */
  const lineY = 747;

  page.drawRectangle({
    x: 42,
    y: lineY,
    width: 128,
    height: 2,
    color:
      COLORS.blue,
  });

  page.drawRectangle({
    x: 170,
    y: lineY,
    width: 128,
    height: 2,
    color:
      COLORS.yellow,
  });

  page.drawRectangle({
    x: 298,
    y: lineY,
    width: 128,
    height: 2,
    color:
      COLORS.green,
  });

  page.drawRectangle({
    x: 426,
    y: lineY,
    width: 127,
    height: 2,
    color:
      COLORS.red,
  });

  if (fullName) {
    drawCenteredWrappedText({
      page,

      text:
        normalizeText(
          fullName
        ).toUpperCase(),

      centerX:
        PAGE_WIDTH / 2,

      y: 715,

      maxWidth: 500,

      font:
        boldFont,

      size:
        fullName.length >
          42
          ? 10.5
          : 12,

      lineHeight: 14,

      color:
        COLORS.blue,

      maxLines: 2,
    });
  }
};

/* =========================================================
   FOOTER
========================================================= */

const drawFooter = ({
  page,
  number,
  regularFont,
}) => {
  page.drawLine({
    start: {
      x: MARGIN,
      y: 32,
    },

    end: {
      x:
        PAGE_WIDTH -
        MARGIN,

      y: 32,
    },

    thickness: 0.5,

    color:
      COLORS.border,
  });

  page.drawText(
    "iDr.Mind. - Informe confidencial de resultados",
    {
      x: MARGIN,
      y: 18,

      font:
        regularFont,

      size: 6.3,

      color:
        COLORS.muted,
    }
  );

  page.drawText(
    `Página ${number}`,
    {
      x: 510,
      y: 18,

      font:
        regularFont,

      size: 6.3,

      color:
        COLORS.muted,
    }
  );
};

/* =========================================================
   TÍTULO DE SECCIÓN
========================================================= */

const drawSectionTitle = ({
  page,
  kicker,
  title,
  y = 660,
  boldFont,
}) => {
  page.drawText(
    normalizeText(
      kicker,
      ""
    ),
    {
      x: 52,
      y,

      font:
        boldFont,

      size: 7.5,

      color:
        COLORS.blue,
    }
  );

  page.drawText(
    normalizeText(
      title,
      ""
    ),
    {
      x: 52,
      y:
        y - 30,

      font:
        boldFont,

      size: 20,

      color:
        COLORS.navy,
    }
  );

  page.drawRectangle({
    x: 52,
    y:
      y - 48,

    width: 64,
    height: 3,

    color:
      COLORS.blue,
  });

  page.drawRectangle({
    x: 116,
    y:
      y - 48,

    width: 22,
    height: 3,

    color:
      COLORS.cyan,
  });
};

/* =========================================================
   CHIP
========================================================= */

const drawChip = ({
  page,
  text,
  x,
  y,
  width,
  boldFont,
  color =
  COLORS.blue,
  background =
  COLORS.blueSoft,
}) => {
  page.drawRectangle({
    x,
    y,
    width,
    height: 30,

    color:
      background,

    borderColor:
      color,

    borderWidth:
      0.6,
  });

  const safe =
    normalizeText(
      text
    );

  const size =
    safe.length > 18
      ? 7
      : 8.5;

  const textWidth =
    boldFont.widthOfTextAtSize(
      safe,
      size
    );

  page.drawText(
    safe,
    {
      x:
        x +
        Math.max(
          8,
          (
            width -
            textWidth
          ) / 2
        ),

      y:
        y + 10,

      font:
        boldFont,

      size,

      color,
    }
  );
};

/* =========================================================
   DIAGNÓSTICO
========================================================= */

const drawDiagnosticItem = ({
  page,
  x,
  y,
  width,
  title,
  value,
  detail,
  accent,
  regularFont,
  boldFont,
}) => {
  page.drawRectangle({
    x,
    y,
    width,
    height: 98,

    color:
      COLORS.soft,

    borderColor:
      COLORS.border,

    borderWidth: 0.8,
  });

  page.drawRectangle({
    x,
    y,
    width: 4,
    height: 98,

    color:
      accent,
  });

  page.drawText(
    normalizeText(
      title,
      ""
    ),
    {
      x:
        x + 15,

      y:
        y + 73,

      font:
        boldFont,

      size: 6.8,

      color:
        COLORS.muted,
    }
  );

  drawWrappedText({
    page,

    text: value,

    x:
      x + 15,

    y:
      y + 49,

    maxWidth:
      width - 28,

    font:
      boldFont,

    size:
      String(
        value || ""
      ).length > 20
        ? 9
        : 12,

    lineHeight: 12,

    color:
      COLORS.navy,

    maxLines: 2,
  });

  if (detail) {
    drawWrappedText({
      page,

      text: detail,

      x:
        x + 15,

      y:
        y + 17,

      maxWidth:
        width - 28,

      font:
        regularFont,

      size: 6.7,

      lineHeight: 8,

      color:
        COLORS.muted,

      maxLines: 2,
    });
  }
};

/* =========================================================
   BARRA DE COMUNICACIÓN
========================================================= */

const drawPercentageBar = ({
  page,
  label,
  value,
  x,
  y,
  width,
  accent,
  regularFont,
  boldFont,
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

  /*
   * contenedor visual
   */
  page.drawRectangle({
    x,
    y: y - 10,

    width,
    height: 54,

    color:
      COLORS.white,

    borderColor:
      COLORS.border,

    borderWidth: 0.7,
  });

  page.drawCircle({
    x:
      x + 15,

    y:
      y + 22,

    size: 4,

    color:
      accent,
  });

  page.drawText(
    label,
    {
      x:
        x + 27,

      y:
        y + 18,

      font:
        boldFont,

      size: 8,

      color:
        COLORS.textSoft,
    }
  );

  const percentText =
    `${percentage.toFixed(
      2
    )}%`;

  const percentWidth =
    boldFont.widthOfTextAtSize(
      percentText,
      7.5
    );

  page.drawText(
    percentText,
    {
      x:
        x +
        width -
        12 -
        percentWidth,

      y:
        y + 18,

      font:
        boldFont,

      size: 7.5,

      color:
        accent,
    }
  );

  const trackX =
    x + 14;

  const trackY =
    y;

  const trackWidth =
    width - 28;

  page.drawRectangle({
    x: trackX,
    y: trackY,

    width:
      trackWidth,

    height: 7,

    color:
      COLORS.border,
  });

  page.drawRectangle({
    x: trackX,
    y: trackY,

    width:
      trackWidth *
      percentage /
      100,

    height: 7,

    color:
      accent,
  });
};

/* =========================================================
   CEREBRO
========================================================= */

const drawBrainCard = ({
  page,
  x,
  y,
  width,
  label,
  score,
  subtitle,
  active,
  accent,
  background,
  regularFont,
  boldFont,
}) => {
  page.drawRectangle({
    x,
    y,
    width,
    height: 145,

    color:
      background,

    borderColor:
      active
        ? accent
        : COLORS.border,

    borderWidth:
      active
        ? 1.8
        : 0.8,
  });

  page.drawRectangle({
    x,
    y:
      y + 140,

    width,
    height: 5,

    color:
      accent,
  });

  if (active) {
    page.drawRectangle({
      x:
        x +
        width -
        70,

      y:
        y + 112,

      width: 58,
      height: 20,

      color:
        COLORS.white,

      borderColor:
        accent,

      borderWidth:
        0.7,
    });

    page.drawText(
      "DOMINANTE",
      {
        x:
          x +
          width -
          63,

        y:
          y + 119,

        font:
          boldFont,

        size: 5.5,

        color:
          accent,
      }
    );
  }

  drawCenteredWrappedText({
    page,

    text: label,

    centerX:
      x +
      width / 2,

    y:
      y + 99,

    maxWidth:
      width - 20,

    font:
      boldFont,

    size: 8,

    lineHeight: 10,

    color:
      accent,

    maxLines: 1,
  });

  drawCenteredTextInBox({
    page,

    text:
      String(score ?? 0),

    x,
    y:
      y + 55,

    width,

    font:
      boldFont,

    size: 27,

    color:
      accent,
  });

  drawCenteredWrappedText({
    page,

    text:
      subtitle,

    centerX:
      x +
      width / 2,

    y:
      y + 25,

    maxWidth:
      width - 20,

    font:
      regularFont,

    size: 7,

    lineHeight: 9,

    color:
      COLORS.muted,

    maxLines: 2,
  });
};

const drawCenteredTextInBox = ({
  page,
  text,
  x,
  y,
  width,
  font,
  size,
  color,
}) => {
  const safe =
    normalizeText(
      text
    );

  const textWidth =
    font.widthOfTextAtSize(
      safe,
      size
    );

  page.drawText(
    safe,
    {
      x:
        x +
        (
          width -
          textWidth
        ) / 2,

      y,
      font,
      size,
      color,
    }
  );
};

/* =========================================================
   VAK CARD
========================================================= */

const drawVakCard = ({
  page,
  x,
  y,
  width,
  label,
  score,
  active,
  regularFont,
  boldFont,
}) => {
  page.drawRectangle({
    x,
    y,

    width,
    height: 125,

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
        ? 1.6
        : 0.8,
  });

  if (active) {
    page.drawRectangle({
      x,
      y:
        y + 120,

      width,
      height: 5,

      color:
        COLORS.cyan,
    });
  }

  drawCenteredWrappedText({
    page,

    text: label,

    centerX:
      x +
      width / 2,

    y:
      y + 88,

    maxWidth:
      width - 16,

    font:
      boldFont,

    size: 8,

    lineHeight: 10,

    color:
      active
        ? COLORS.blue
        : COLORS.muted,

    maxLines: 1,
  });

  drawCenteredTextInBox({
    page,

    text:
      String(score ?? 0),

    x,
    y:
      y + 40,

    width,

    font:
      boldFont,

    size: 28,

    color:
      COLORS.navy,
  });
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

    return {
      evaluation,

      user:
        evaluation
          .inscripcion
          ?.user || {},

      course:
        evaluation
          .inscripcion
          ?.course || {},

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
   GENERADOR
========================================================= */

const generarInformePsicometrico =
  async ({
    evaluationId,
  }) => {
    const {
      evaluation,
      user,
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
        StandardFonts
          .Helvetica
      );

    const boldFont =
      await pdfDoc.embedFont(
        StandardFonts
          .HelveticaBold
      );

    /* =====================================================
       RESULTADOS
    ===================================================== */

    const resultPersonality =
      result?.personality ||
      {};

    const animodo =
      result?.animodo || {};

    const communication =
      result?.communication ||
      {};

    const brain =
      result?.brain || {};

    const negotiation =
      result?.negotiation ||
      {};

    const vak =
      result?.vak || {};

    const persistence =
      result?.persistence ||
      {};

    const productivityIndex =
      result?.productivityIndex ||
      {};

    const fullName =
      [
        user?.grado,
        user?.firstName,
        user?.lastName,
      ]
        .filter(Boolean)
        .map(repairMojibake)
        .join(" ");

    const animal =
      resultPersonality
        ?.animal ||
      personality?.animal ||
      animodo?.animal ||
      "-";

    const animodoResult =
      animodo?.animal ||
      resultPersonality
        ?.resultadoAnimodo ||
      personality?.animal ||
      "-";

    const personalityName =
      personality?.nombre ||
      resultPersonality
        ?.nombre ||
      animal;

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
      brain?.brainCategory ||
      resultPersonality
        ?.categoriaCerebro ||
      "-";

    const brainType =
      brain?.brainType ||
      resultPersonality
        ?.tipoCerebro ||
      personality
        ?.tipoCerebro ||
      "-";

    const headColor =
      brain?.headColor ||
      resultPersonality
        ?.colorCabeza ||
      personality
        ?.colorCabeza ||
      "-";

    /* =====================================================
       LOGO
    ===================================================== */

    let logoImage = null;

    logoImage =
      await loadLocalImage({
        pdfDoc,

        filePath:
          BRAND.logoPath,

        label:
          "Logo institucional",
      });

    if (!logoImage) {
      logoImage =
        await loadRemoteImage({
          pdfDoc,

          url:
            BRAND.logoUrl,

          label:
            "Logo institucional",
        });
    }

    /* =====================================================
       PERSONALIDAD LOCAL
    ===================================================== */

    const personalityImage =
      await loadPersonalityImage({
        pdfDoc,
        personality,
        resultPersonality,
        animal,
      });

    console.log(
      "======================================"
    );

    console.log(
      "PDF PROYECTO PENSAR"
    );

    console.log(
      "Evaluación:",
      evaluationId
    );

    console.log(
      "Animal:",
      animal
    );

    console.log(
      "Logo:",
      Boolean(
        logoImage
      )
    );

    console.log(
      "Personalidad:",
      Boolean(
        personalityImage
      )
    );

    console.log(
      "Carpeta:",
      BRAND.personalitiesPath
    );

    console.log(
      "======================================"
    );

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

      /*
       * Geometría superior derecha.
       */
      page.drawRectangle({
        x: 470,
        y: 708,

        width: 125,
        height: 134,

        color:
          COLORS.blue,
      });

      page.drawRectangle({
        x: 412,
        y: 655,

        width: 110,
        height: 110,

        color:
          COLORS.cyan,
      });

      /*
       * Geometría inferior.
       */
      page.drawRectangle({
        x: 0,
        y: 0,

        width: 105,
        height: 120,

        color:
          COLORS.blue,
      });

      page.drawRectangle({
        x: 76,
        y: 42,

        width: 110,
        height: 110,

        color:
          COLORS.cyan,
      });

      /*
       * Puntos decorativos.
       */
      for (
        let row = 0;
        row < 5;
        row++
      ) {
        for (
          let col = 0;
          col < 7;
          col++
        ) {
          page.drawCircle({
            x:
              20 +
              col * 17,

            y:
              817 -
              row * 17,

            size: 1.8,

            color:
              COLORS.blue,
          });
        }
      }

      /* ===============================================
         LOGO GRANDE
      =============================================== */

      if (logoImage) {
        drawLogo({
          page,

          image:
            logoImage,

          centerX:
            PAGE_WIDTH /
            2,

          y: 570,

          maxWidth: 450,
          maxHeight: 200,
        });
      }

      /*
       * iDr.Mind debajo del logo.
       */
      drawCenteredText({
        page,

        text:
          "iDr.Mind.",

        y: 550,

        font:
          boldFont,

        size: 21,

        color:
          COLORS.blue,
      });

      /* ===============================================
         TÍTULO
      =============================================== */

      drawCenteredText({
        page,

        text:
          "INFORME DE",

        y: 490,

        font:
          boldFont,

        size: 25,

        color:
          COLORS.blue,
      });

      drawCenteredText({
        page,

        text:
          "RESULTADOS",

        y: 455,

        font:
          boldFont,

        size: 30,

        color:
          COLORS.blue,
      });

      drawCenteredText({
        page,

        text:
          "OBTENIDOS DEL TEST",

        y: 405,

        font:
          boldFont,

        size: 11,

        color:
          COLORS.text,
      });



      /*
       * ELIMINADO:
       * course.nombre.
       */

      /* ===============================================
         PARTICIPANTE
      =============================================== */

      page.drawText(
        "PARTICIPANTE",
        {
          x: 68,
          y: 307,

          font:
            boldFont,

          size: 8,

          color:
            COLORS.muted,
        }
      );

      drawWrappedText({
        page,

        text:
          fullName,

        x: 68,
        y: 280,

        maxWidth: 460,

        font:
          boldFont,

        size:
          fullName.length >
            45
            ? 13
            : 16,

        lineHeight: 19,

        color:
          COLORS.navy,

        maxLines: 2,
      });

      /* ===============================================
         DATOS
      =============================================== */

      page.drawRectangle({
        x: 68,
        y: 170,

        width: 460,
        height: 67,

        color:
          COLORS.soft,

        borderColor:
          COLORS.border,

        borderWidth: 0.8,
      });

      page.drawText(
        "EVALUACIÓN",
        {
          x: 90,
          y: 210,

          font:
            boldFont,

          size: 6.5,

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
          x: 90,
          y: 188,

          font:
            boldFont,

          size: 9,

          color:
            COLORS.navy,
        }
      );

      page.drawText(
        "FECHA",
        {
          x: 235,
          y: 210,

          font:
            boldFont,

          size: 6.5,

          color:
            COLORS.muted,
        }
      );

      drawWrappedText({
        page,

        text:
          formatDate(
            evaluation
              ?.fechaFinalizacion
          ),

        x: 235,
        y: 188,

        maxWidth: 170,

        font:
          boldFont,

        size: 7.5,

        lineHeight: 9,

        color:
          COLORS.navy,

        maxLines: 2,
      });

      page.drawText(
        "ESTADO",
        {
          x: 438,
          y: 210,

          font:
            boldFont,

          size: 6.5,

          color:
            COLORS.muted,
        }
      );

      page.drawText(
        "FINALIZADO",
        {
          x: 438,
          y: 188,

          font:
            boldFont,

          size: 8,

          color:
            COLORS.success,
        }
      );

      drawCenteredText({
        page,

        text:
          "Documento personal y confidencial",

        y: 50,

        font:
          regularFont,

        size: 7,

        color:
          COLORS.muted,
      });
    }

    /* =====================================================
       PÁGINA 2
       DIAGNÓSTICO FINAL
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

      drawSectionTitle({
        page,

        kicker:
          "DIAGNÓSTICO FINAL",

        title:
          "Síntesis del perfil",

        y: 665,

        boldFont,
      });

      drawChip({
        page,

        text:
          "VISTA GENERAL",

        x: 420,
        y: 618,

        width: 120,

        boldFont,

        color:
          COLORS.success,

        background:
          COLORS.successSoft,
      });

      /* ===============================================
         PERSONALIDAD CENTRAL
      =============================================== */

      page.drawCircle({
        x: 297,
        y: 405,

        size: 112,

        color:
          COLORS.soft,
      });

      page.drawCircle({
        x: 297,
        y: 405,

        size: 98,

        color:
          COLORS.white,
      });

      /*
       * La imagen ahora viene preferentemente de
       * src/assets/personalidades.
       */
      if (
        personalityImage
      ) {
        drawContainedImage({
          page,

          image:
            personalityImage,

          x: 196,
          y: 312,

          width: 202,
          height: 210,

          padding: 0,

          background:
            COLORS.white,
        });
      } else {
        drawCenteredText({
          page,

          text:
            animal,

          y: 405,

          font:
            boldFont,

          size: 18,

          color:
            COLORS.blue,
        });
      }

      drawCenteredWrappedText({
        page,

        text:
          personalityName,

        centerX: 297,

        y: 292,

        maxWidth: 220,

        font:
          boldFont,

        size: 11,

        lineHeight: 13,

        color:
          COLORS.navy,

        maxLines: 2,
      });

      /* ===============================================
         IZQUIERDA
      =============================================== */

      drawDiagnosticItem({
        page,

        x: 43,
        y: 462,

        width: 145,

        title:
          "ANIMODO",

        value:
          animodoResult,

        detail: "",

        accent:
          COLORS.green,

        regularFont,
        boldFont,
      });

      drawDiagnosticItem({
        page,

        x: 43,
        y: 330,

        width: 145,

        title:
          "COMUNICACIÓN",

        value:
          communicationType,

        detail:
          `Color dominante: ${chestColor}`,

        accent:
          chestColor ===
            "ROJO"
            ? COLORS.red
            : chestColor ===
              "AMARILLO"
              ? COLORS.yellow
              : chestColor ===
                "VERDE"
                ? COLORS.green
                : COLORS.blue,

        regularFont,
        boldFont,
      });

      drawDiagnosticItem({
        page,

        x: 43,
        y: 198,

        width: 145,

        title:
          "NEGOCIACIÓN",

        value:
          negotiation
            ?.classification,

        detail:
          `Puntaje: ${normalizeText(
            negotiation
              ?.totalScore
          )}`,

        accent:
          negotiation
            ?.classification ===
            "BAJO"
            ? COLORS.red
            : COLORS.blue,

        regularFont,
        boldFont,
      });

      /* ===============================================
         DERECHA
      =============================================== */

      drawDiagnosticItem({
        page,

        x: 407,
        y: 462,

        width: 145,

        title:
          "TIPO DE CEREBRO",

        value:
          brainType,

        detail:
          `Color de cabeza: ${headColor}`,

        accent:
          COLORS.blue,

        regularFont,
        boldFont,
      });

      drawDiagnosticItem({
        page,

        x: 407,
        y: 330,

        width: 145,

        title:
          "SISTEMA VAK",

        value:
          prettyText(
            vak
              ?.dominantStyle
          ),

        detail:
          "Canal de aprendizaje",

        accent:
          COLORS.cyan,

        regularFont,
        boldFont,
      });

      drawDiagnosticItem({
        page,

        x: 407,
        y: 198,

        width: 145,

        title:
          "PERSISTENCIA",

        value:
          persistence
            ?.level,

        detail:
          `Índice: ${normalizeText(
            persistence
              ?.score
          )}/4`,

        accent:
          persistence
            ?.level ===
            "SI"
            ? COLORS.success
            : COLORS.red,

        regularFont,
        boldFont,
      });

      drawFooter({
        page,
        number: 2,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 3
       PERFIL INTEGRAL
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

      drawSectionTitle({
        page,

        kicker:
          "PERFIL INTEGRAL",

        title:
          personalityName,

        y: 665,

        boldFont,
      });

      if (
        personality?.codigo ||
        resultPersonality
          ?.codigo
      ) {
        drawChip({
          page,

          text:
            personality
              ?.codigo ||
            resultPersonality
              ?.codigo,

          x: 430,
          y: 618,

          width: 110,

          boldFont,
        });
      }

      /* ===============================================
         IMAGEN
      =============================================== */

      page.drawRectangle({
        x: 52,
        y: 395,

        width: 195,
        height: 210,

        color:
          COLORS.white,

        borderColor:
          COLORS.border,

        borderWidth: 0.8,
      });

      if (
        personalityImage
      ) {
        drawContainedImage({
          page,

          image:
            personalityImage,

          x: 63,
          y: 425,

          width: 173,
          height: 165,

          padding: 0,

          background:
            COLORS.white,
        });
      }

      drawCenteredWrappedText({
        page,

        text: animal,

        centerX: 149,

        y: 411,

        maxWidth: 170,

        font:
          boldFont,

        size: 10,

        lineHeight: 12,

        color:
          COLORS.blue,

        maxLines: 2,
      });

      /* ===============================================
         DESCRIPCIÓN
      =============================================== */

      page.drawText(
        "DESCRIPCIÓN",
        {
          x: 275,
          y: 590,

          font:
            boldFont,

          size: 7.2,

          color:
            COLORS.blue,
        }
      );

      drawWrappedText({
        page,

        text:
          personality
            ?.descripcion ||
          resultPersonality
            ?.descripcion ||
          "Sin información disponible.",

        x: 275,
        y: 565,

        maxWidth: 270,

        font:
          regularFont,

        size: 8.6,

        lineHeight: 13,

        color:
          COLORS.textSoft,

        maxLines: 14,
      });

      /* ===============================================
         FORMA DE PENSAR
      =============================================== */

      page.drawRectangle({
        x: 52,
        y: 180,

        width: 491,
        height: 165,

        color:
          COLORS.soft,

        borderColor:
          COLORS.border,

        borderWidth: 0.8,
      });

      page.drawText(
        "FORMA DE PENSAR",
        {
          x: 72,
          y: 315,

          font:
            boldFont,

          size: 7.5,

          color:
            COLORS.blue,
        }
      );

      drawWrappedText({
        page,

        text:
          personality
            ?.formaPensar ||
          resultPersonality
            ?.formaPensar ||
          "Sin información disponible.",

        x: 72,
        y: 285,

        maxWidth: 450,

        font:
          regularFont,

        size: 9,

        lineHeight: 14,

        color:
          COLORS.textSoft,

        maxLines: 10,
      });

      drawFooter({
        page,
        number: 3,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 4
       COMUNICACIÓN
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

      drawSectionTitle({
        page,

        kicker:
          "COLORES DE COMUNICACIÓN",

        title:
          "Estilo de comunicación",

        y: 665,

        boldFont,
      });

      drawChip({
        page,

        text:
          communicationType,

        x: 405,
        y: 618,

        width: 138,

        boldFont,
      });

      const percentages =
        communication
          ?.percentages ||
        {};

      drawPercentageBar({
        page,

        label:
          "Amarillo",

        value:
          percentages
            ?.AMARILLO,

        x: 52,
        y: 542,

        width: 240,

        accent:
          COLORS.yellow,

        regularFont,
        boldFont,
      });

      drawPercentageBar({
        page,

        label:
          "Rojo",

        value:
          percentages
            ?.ROJO,

        x: 52,
        y: 470,

        width: 240,

        accent:
          COLORS.red,

        regularFont,
        boldFont,
      });

      drawPercentageBar({
        page,

        label:
          "Azul",

        value:
          percentages
            ?.AZUL,

        x: 52,
        y: 398,

        width: 240,

        accent:
          COLORS.blue,

        regularFont,
        boldFont,
      });

      drawPercentageBar({
        page,

        label:
          "Verde",

        value:
          percentages
            ?.VERDE,

        x: 52,
        y: 326,

        width: 240,

        accent:
          COLORS.green,

        regularFont,
        boldFont,
      });

      /* ===============================================
         PANEL RESULTADO
      =============================================== */

      page.drawRectangle({
        x: 322,
        y: 325,

        width: 221,
        height: 270,

        color:
          COLORS.soft,

        borderColor:
          COLORS.border,

        borderWidth:
          0.8,
      });

      page.drawText(
        "COLOR DOMINANTE",
        {
          x: 344,
          y: 555,

          font:
            boldFont,

          size: 7,

          color:
            COLORS.muted,
        }
      );

      drawWrappedText({
        page,

        text:
          chestColor,

        x: 344,
        y: 525,

        maxWidth: 175,

        font:
          boldFont,

        size: 21,

        lineHeight: 23,

        color:
          chestColor ===
            "ROJO"
            ? COLORS.red
            : chestColor ===
              "AMARILLO"
              ? COLORS.yellow
              : chestColor ===
                "VERDE"
                ? COLORS.green
                : COLORS.blue,

        maxLines: 2,
      });

      page.drawLine({
        start: {
          x: 344,
          y: 480,
        },

        end: {
          x: 520,
          y: 480,
        },

        thickness: 0.7,

        color:
          COLORS.border,
      });

      page.drawText(
        "TIPO DE COMUNICACIÓN",
        {
          x: 344,
          y: 447,

          font:
            boldFont,

          size: 7,

          color:
            COLORS.muted,
        }
      );

      drawWrappedText({
        page,

        text:
          communicationType,

        x: 344,
        y: 416,

        maxWidth: 175,

        font:
          boldFont,

        size: 15,

        lineHeight: 18,

        color:
          COLORS.navy,

        maxLines: 3,
      });

      /* ===============================================
         INTERPRETACIÓN
      =============================================== */

      page.drawText(
        "INTERPRETACIÓN",
        {
          x: 52,
          y: 260,

          font:
            boldFont,

          size: 8,

          color:
            COLORS.blue,
        }
      );

      drawWrappedText({
        page,

        text:
          personality
            ?.descripcionComunicacion ||
          resultPersonality
            ?.descripcionComunicacion ||
          "Sin interpretación adicional disponible.",

        x: 52,
        y: 232,

        maxWidth: 490,

        font:
          regularFont,

        size: 9,

        lineHeight: 14,

        color:
          COLORS.textSoft,

        maxLines: 11,
      });

      drawFooter({
        page,
        number: 4,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 5
       CEREBRO
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

      drawSectionTitle({
        page,

        kicker:
          "TIPO DE CEREBRO",

        title:
          "Dominancia cerebral",

        y: 665,

        boldFont,
      });

      drawChip({
        page,

        text:
          brainCategory,

        x: 430,
        y: 618,

        width: 110,

        boldFont,
      });

      const brainScores =
        brain?.scores || {};

      /* IZQUIERDO */

      drawBrainCard({
        page,

        x: 48,
        y: 420,

        width: 155,

        label:
          "IZQUIERDO",

        score:
          brainScores
            ?.IZQUIERDO ??
          0,

        subtitle:
          "Pensar / Visual",

        active:
          brainCategory ===
          "IZQUIERDO",

        accent:
          COLORS.yellow,

        background:
          COLORS.yellowSoft,

        regularFont,
        boldFont,
      });

      /* CENTRAL */

      drawBrainCard({
        page,

        x: 220,
        y: 420,

        width: 155,

        label:
          "CENTRAL",

        score:
          brainScores
            ?.CENTRAL ??
          0,

        subtitle:
          "Hacer / Auditivo",

        active:
          brainCategory ===
          "CENTRAL",

        accent:
          COLORS.red,

        background:
          COLORS.redSoft,

        regularFont,
        boldFont,
      });

      /* DERECHO */

      drawBrainCard({
        page,

        x: 392,
        y: 420,

        width: 155,

        label:
          "DERECHO",

        score:
          brainScores
            ?.DERECHO ??
          0,

        subtitle:
          "Sentir / Kinestésico",

        active:
          brainCategory ===
          "DERECHO",

        accent:
          COLORS.blue,

        background:
          COLORS.blueSoft,

        regularFont,
        boldFont,
      });

      /* ===============================================
         RESULTADO
      =============================================== */

      page.drawRectangle({
        x: 52,
        y: 286,

        width: 491,
        height: 95,

        color:
          COLORS.blueSoft,

        borderColor:
          COLORS.border,

        borderWidth: 0.8,
      });

      page.drawText(
        "RESULTADO",
        {
          x: 72,
          y: 354,

          font:
            boldFont,

          size: 6.8,

          color:
            COLORS.muted,
        }
      );

      drawWrappedText({
        page,

        text:
          brainType,

        x: 72,
        y: 328,

        maxWidth: 360,

        font:
          boldFont,

        size: 13,

        lineHeight: 16,

        color:
          COLORS.navy,

        maxLines: 2,
      });

      page.drawText(
        `Color asociado: ${normalizeText(
          headColor
        )}`,
        {
          x: 72,
          y: 301,

          font:
            regularFont,

          size: 7.5,

          color:
            COLORS.muted,
        }
      );

      /* ===============================================
         DESCRIPCIÓN
      =============================================== */

      page.drawText(
        "INTERPRETACIÓN",
        {
          x: 52,
          y: 245,

          font:
            boldFont,

          size: 8,

          color:
            COLORS.blue,
        }
      );

      drawWrappedText({
        page,

        text:
          personality
            ?.formaPensar ||
          resultPersonality
            ?.formaPensar ||
          "Sin información adicional disponible.",

        x: 52,
        y: 218,

        maxWidth: 490,

        font:
          regularFont,

        size: 8.7,

        lineHeight: 13,

        color:
          COLORS.textSoft,

        maxLines: 11,
      });

      drawFooter({
        page,
        number: 5,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 6
       NEGOCIACIÓN
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

      drawSectionTitle({
        page,

        kicker:
          "FORMA NEGOCIADORA",

        title:
          "Perfil de negociación",

        y: 665,

        boldFont,
      });

      drawChip({
        page,

        text:
          negotiation
            ?.classification ||
          "-",

        x: 430,
        y: 618,

        width: 110,

        boldFont,

        color:
          negotiation
            ?.classification ===
            "BAJO"
            ? COLORS.red
            : COLORS.blue,

        background:
          negotiation
            ?.classification ===
            "BAJO"
            ? COLORS.redSoft
            : COLORS.blueSoft,
      });

      /* ===============================================
         PUNTAJE
      =============================================== */

      page.drawRectangle({
        x: 58,
        y: 390,

        width: 180,
        height: 200,

        color:
          COLORS.navy,
      });

      drawCenteredTextInBox({
        page,

        text:
          "PUNTAJE",

        x: 58,
        y: 550,

        width: 180,

        font:
          boldFont,

        size: 7,

        color:
          COLORS.cyan,
      });

      drawCenteredTextInBox({
        page,

        text:
          String(
            negotiation
              ?.totalScore ??
            "-"
          ),

        x: 58,
        y: 465,

        width: 180,

        font:
          boldFont,

        size: 48,

        color:
          COLORS.white,
      });

      drawCenteredTextInBox({
        page,

        text:
          "de 90",

        x: 58,
        y: 435,

        width: 180,

        font:
          regularFont,

        size: 9,

        color:
          COLORS.white,
      });

      /* ===============================================
         CLASIFICACIÓN
      =============================================== */

      page.drawRectangle({
        x: 266,
        y: 390,

        width: 275,
        height: 200,

        color:
          COLORS.soft,

        borderColor:
          COLORS.border,

        borderWidth:
          0.8,
      });

      page.drawText(
        "CLASIFICACIÓN",
        {
          x: 290,
          y: 550,

          font:
            boldFont,

          size: 7,

          color:
            COLORS.muted,
        }
      );

      drawWrappedText({
        page,

        text:
          negotiation
            ?.classification ||
          "-",

        x: 290,
        y: 515,

        maxWidth: 220,

        font:
          boldFont,

        size: 21,

        lineHeight: 24,

        color:
          negotiation
            ?.classification ===
            "BAJO"
            ? COLORS.red
            : COLORS.blue,

        maxLines: 2,
      });

      drawWrappedText({
        page,

        text:
          negotiation
            ?.quality ||
          "Sin descripción adicional.",

        x: 290,
        y: 465,

        maxWidth: 220,

        font:
          regularFont,

        size: 9.5,

        lineHeight: 15,

        color:
          COLORS.textSoft,

        maxLines: 7,
      });

      /* ===============================================
         NOTA
      =============================================== */

      page.drawRectangle({
        x: 58,
        y: 215,

        width: 483,
        height: 115,

        color:
          COLORS.blueSoft,

        borderColor:
          COLORS.border,

        borderWidth:
          0.8,
      });

      page.drawText(
        "LECTURA DEL RESULTADO",
        {
          x: 80,
          y: 298,

          font:
            boldFont,

          size: 7.5,

          color:
            COLORS.blue,
        }
      );

      drawWrappedText({
        page,

        text:
          `La evaluación registra un puntaje de ${normalizeText(
            negotiation
              ?.totalScore
          )} sobre 90, con clasificación ${normalizeText(
            negotiation
              ?.classification
          )}. Este indicador refleja la forma en que la persona aborda acuerdos, intereses y situaciones de negociación.`,

        x: 80,
        y: 272,

        maxWidth: 440,

        font:
          regularFont,

        size: 8.7,

        lineHeight: 13,

        color:
          COLORS.textSoft,

        maxLines: 7,
      });

      drawFooter({
        page,
        number: 6,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 7
       VAK
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

      drawSectionTitle({
        page,

        kicker:
          "SISTEMA REPRESENTACIONAL VAK",

        title:
          "Preferencia de aprendizaje",

        y: 665,

        boldFont,
      });

      drawChip({
        page,

        text:
          prettyText(
            vak
              ?.dominantStyle
          ),

        x: 405,
        y: 618,

        width: 138,

        boldFont,
      });

      const vakScores =
        vak?.scores || {};

      drawVakCard({
        page,

        x: 48,
        y: 420,

        width: 155,

        label:
          "VISUAL",

        score:
          vakScores
            ?.VISUAL ??
          0,

        active:
          vak
            ?.dominantStyle ===
          "VISUAL",

        regularFont,
        boldFont,
      });

      drawVakCard({
        page,

        x: 220,
        y: 420,

        width: 155,

        label:
          "AUDITIVO",

        score:
          vakScores
            ?.AUDITIVO ??
          0,

        active:
          vak
            ?.dominantStyle ===
          "AUDITIVO",

        regularFont,
        boldFont,
      });

      drawVakCard({
        page,

        x: 392,
        y: 420,

        width: 155,

        label:
          "KINESTÉSICO",

        score:
          vakScores
            ?.KINESTESICO ??
          0,

        active:
          vak
            ?.dominantStyle ===
          "KINESTESICO",

        regularFont,
        boldFont,
      });

      page.drawRectangle({
        x: 52,
        y: 300,

        width: 491,
        height: 85,

        color:
          COLORS.blueSoft,

        borderColor:
          COLORS.border,

        borderWidth:
          0.8,
      });

      page.drawText(
        "CANAL PREDOMINANTE",
        {
          x: 72,
          y: 358,

          font:
            boldFont,

          size: 6.8,

          color:
            COLORS.muted,
        }
      );

      drawWrappedText({
        page,

        text:
          prettyText(
            vak
              ?.dominantStyle
          ),

        x: 72,
        y: 330,

        maxWidth: 420,

        font:
          boldFont,

        size: 16,

        lineHeight: 18,

        color:
          COLORS.navy,

        maxLines: 2,
      });

      /* ===============================================
         FORMA DE APRENDER
         Solo si existe
      =============================================== */

      const learningText =
        personality
          ?.formaAprender ||
        resultPersonality
          ?.formaAprender;

      if (learningText) {
        page.drawText(
          "INTERPRETACIÓN",
          {
            x: 52,
            y: 255,

            font:
              boldFont,

            size: 8,

            color:
              COLORS.blue,
          }
        );

        drawWrappedText({
          page,

          text:
            learningText,

          x: 52,
          y: 225,

          maxWidth: 490,

          font:
            regularFont,

          size: 9,

          lineHeight: 14,

          color:
            COLORS.textSoft,

          maxLines: 10,
        });
      }

      drawFooter({
        page,
        number: 7,
        regularFont,
      });
    }

    /* =====================================================
       PÁGINA 8
       PERSISTENCIA
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

      drawSectionTitle({
        page,

        kicker:
          "PERSISTENCIA",

        title:
          "Indicador integrado",

        y: 665,

        boldFont,
      });

      const persistenceColor =
        persistence?.level ===
          "SI"
          ? COLORS.success
          : persistence?.level ===
            "ALERTA"
            ? COLORS.warning
            : COLORS.red;

      drawChip({
        page,

        text:
          persistence
            ?.level ||
          "-",

        x: 450,
        y: 618,

        width: 90,

        boldFont,

        color:
          persistenceColor,

        background:
          persistence?.level ===
            "SI"
            ? COLORS.successSoft
            : persistence
              ?.level ===
              "ALERTA"
              ? COLORS.warningSoft
              : COLORS.redSoft,
      });

      /* ===============================================
         INDICADORES
      =============================================== */

      const indicators =
        persistence
          ?.indicators ||
        {};

      const indicatorList = [
        {
          label:
            "Animodo",

          value:
            indicators
              ?.animodo,
        },
        {
          label:
            "Comunicación",

          value:
            indicators
              ?.communication,
        },
        {
          label:
            "Cerebro",

          value:
            indicators
              ?.brain,
        },
        {
          label:
            "Negociación",

          value:
            indicators
              ?.negotiation,
        },
      ];

      indicatorList.forEach(
        (
          item,
          index
        ) => {
          const x =
            52 +
            index * 123;

          page.drawRectangle({
            x,
            y: 430,

            width: 110,
            height: 120,

            color:
              COLORS.soft,

            borderColor:
              COLORS.border,

            borderWidth:
              0.8,
          });

          drawCenteredWrappedText({
            page,

            text:
              item.label,

            centerX:
              x + 55,

            y: 515,

            maxWidth: 95,

            font:
              boldFont,

            size: 7,

            lineHeight: 9,

            color:
              COLORS.muted,

            maxLines: 2,
          });

          drawCenteredTextInBox({
            page,

            text:
              normalizeText(
                item.value
              ),

            x,
            y: 465,

            width: 110,

            font:
              boldFont,

            size: 24,

            color:
              COLORS.navy,
          });
        }
      );

      /* ===============================================
         ÍNDICE FINAL
      =============================================== */

      page.drawRectangle({
        x: 52,
        y: 260,

        width: 491,
        height: 125,

        color:
          persistence?.level ===
            "SI"
            ? COLORS.successSoft
            : persistence
              ?.level ===
              "ALERTA"
              ? COLORS.warningSoft
              : COLORS.redSoft,

        borderColor:
          persistenceColor,

        borderWidth:
          1,
      });

      page.drawText(
        "ÍNDICE",
        {
          x: 78,
          y: 347,

          font:
            boldFont,

          size: 7,

          color:
            COLORS.muted,
        }
      );

      page.drawText(
        `${normalizeText(
          persistence
            ?.score
        )}/4`,
        {
          x: 78,
          y: 300,

          font:
            boldFont,

          size: 32,

          color:
            persistenceColor,
        }
      );

      page.drawText(
        "RESULTADO FINAL",
        {
          x: 300,
          y: 347,

          font:
            boldFont,

          size: 7,

          color:
            COLORS.muted,
        }
      );

      drawWrappedText({
        page,

        text:
          persistence
            ?.level ||
          "-",

        x: 300,
        y: 305,

        maxWidth: 180,

        font:
          boldFont,

        size: 27,

        lineHeight: 30,

        color:
          persistenceColor,

        maxLines: 1,
      });

      /* ===============================================
         EXPLICACIÓN
      =============================================== */

      page.drawText(
        "LECTURA DEL INDICADOR",
        {
          x: 52,
          y: 215,

          font:
            boldFont,

          size: 8,

          color:
            COLORS.blue,
        }
      );

      drawWrappedText({
        page,

        text:
          "El indicador de persistencia integra los resultados obtenidos en Animodo, comunicación, tipo de cerebro y forma negociadora. Debe analizarse junto con el resto del perfil y no como un resultado aislado.",

        x: 52,
        y: 185,

        maxWidth: 490,

        font:
          regularFont,

        size: 9,

        lineHeight: 14,

        color:
          COLORS.textSoft,

        maxLines: 8,
      });

      drawFooter({
        page,
        number: 8,
        regularFont,
      });
    }

/* =====================================================
   PÁGINA 9
   ÍNDICE DE PRODUCTIVIDAD PERSONAL
===================================================== */

/* =====================================================
   PÁGINA 9
   ÍNDICE DE PRODUCTIVIDAD PERSONAL
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

  /* =====================================================
     TÍTULO
  ===================================================== */

  drawSectionTitle({
    page,

    kicker:
      "ÍNDICE DE PRODUCTIVIDAD PERSONAL",

    title:
      "Resultado integral de productividad",

    y: 665,

    boldFont,
  });

  /* =====================================================
     DATOS PRINCIPALES
  ===================================================== */

  const ippPercentage =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          Number(
            productivityIndex
              ?.percentage || 0
          )
        )
      )
    );

  const ippClassification =
    normalizeText(
      productivityIndex
        ?.classification,
      "-"
    );

  /* =====================================================
     COLOR SEGÚN CLASIFICACIÓN
  ===================================================== */

  let ippColor =
    COLORS.red;

  let ippBackground =
    COLORS.redSoft;

  if (
    ippClassification ===
    "A"
  ) {
    ippColor =
      COLORS.success;

    ippBackground =
      COLORS.successSoft;
  } else if (
    ippClassification ===
    "B"
  ) {
    ippColor =
      COLORS.green;

    ippBackground =
      COLORS.greenSoft;
  } else if (
    ippClassification ===
    "C"
  ) {
    ippColor =
      COLORS.blue;

    ippBackground =
      COLORS.blueSoft;
  } else if (
    ippClassification ===
    "D"
  ) {
    ippColor =
      COLORS.warning;

    ippBackground =
      COLORS.warningSoft;
  } else if (
    ippClassification ===
    "E"
  ) {
    ippColor =
      COLORS.redDark;

    ippBackground =
      COLORS.redSoft;
  }

  /* =====================================================
     LETRA DE CLASIFICACIÓN
  ===================================================== */

  page.drawRectangle({
    x: 450,
    y: 600,

    width: 90,
    height: 90,

    color:
      ippBackground,

    borderColor:
      ippColor,

    borderWidth: 1.2,
  });

  drawCenteredTextInBox({
    page,

    text:
      ippClassification,

    x: 450,
    y: 624,

    width: 90,

    font:
      boldFont,

    size: 38,

    color:
      ippColor,
  });

  /* =====================================================
     ÍNDICE FINAL
     CUADRO AZUL MÁS ANGOSTO Y CENTRADO
  ===================================================== */

  const ippBoxWidth = 340;
  const ippBoxHeight = 165;

  const ippBoxX =
    (
      PAGE_WIDTH -
      ippBoxWidth
    ) / 2;

  const ippBoxY = 395;

  page.drawRectangle({
    x:
      ippBoxX,

    y:
      ippBoxY,

    width:
      ippBoxWidth,

    height:
      ippBoxHeight,

    color:
      COLORS.navy,
  });

  /* =====================================================
     TEXTO ÍNDICE FINAL CENTRADO
  ===================================================== */

  drawCenteredTextInBox({
    page,

    text:
      "ÍNDICE FINAL",

    x:
      ippBoxX,

    y:
      ippBoxY + 125,

    width:
      ippBoxWidth,

    font:
      boldFont,

    size: 10,

    color:
      COLORS.cyan,
  });

  /* =====================================================
     PORCENTAJE CENTRADO
  ===================================================== */

  drawCenteredTextInBox({
    page,

    text:
      `${ippPercentage}%`,

    x:
      ippBoxX,

    y:
      ippBoxY + 52,

    width:
      ippBoxWidth,

    font:
      boldFont,

    size: 58,

    color:
      COLORS.white,
  });

  /* =====================================================
     NIVEL DE PRODUCTIVIDAD
  ===================================================== */

  page.drawText(
    "NIVEL DE PRODUCTIVIDAD PERSONAL",
    {
      x: 52,
      y: 340,

      font:
        boldFont,

      size: 8.5,

      color:
        COLORS.blue,
    }
  );

  /* =====================================================
     PORCENTAJE DE LA BARRA
  ===================================================== */

  page.drawText(
    `${ippPercentage}%`,
    {
      x: 505,
      y: 340,

      font:
        boldFont,

      size: 9.5,

      color:
        ippColor,
    }
  );

  /* =====================================================
     FONDO DE LA BARRA
  ===================================================== */

  page.drawRectangle({
    x: 52,
    y: 300,

    width: 491,
    height: 18,

    color:
      COLORS.border,
  });

  /* =====================================================
     BARRA DE PROGRESO
  ===================================================== */

  page.drawRectangle({
    x: 52,
    y: 300,

    width:
      491 *
      ippPercentage /
      100,

    height: 18,

    color:
      ippColor,
  });

  /* =====================================================
     EXPLICACIÓN DEL IPP
  ===================================================== */

  page.drawRectangle({
    x: 52,
    y: 115,

    width: 491,
    height: 140,

    color:
      COLORS.blueSoft,

    borderColor:
      COLORS.border,

    borderWidth: 0.8,
  });

  /* =====================================================
     TÍTULO IPP MÁS GRANDE
  ===================================================== */

  page.drawText(
    "IPP",
    {
      x: 74,
      y: 220,

      font:
        boldFont,

      size: 14,

      color:
        COLORS.blue,
    }
  );

  /* =====================================================
     EXPLICACIÓN MÁS GRANDE
  ===================================================== */

  drawWrappedText({
    page,

    text:
      "El Índice de Productividad Personal integra los principales resultados de la evaluación y permite observar de forma global cómo interactúan la persistencia, comunicación, preferencia conductual, dominancia cerebral, negociación y sistema representacional.",

    x: 74,
    y: 190,

    maxWidth: 445,

    font:
      regularFont,

    size: 10.5,

    lineHeight: 16,

    color:
      COLORS.textSoft,

    maxLines: 7,
  });

  /* =====================================================
     PIE DE PÁGINA
  ===================================================== */

  drawFooter({
    page,
    number: 9,
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
      "iDr.Mind."
    );

    pdfDoc.setSubject(
      "Informe de resultados Proyecto Pensar"
    );

    pdfDoc.setCreator(
      "iDr.Mind."
    );

    pdfDoc.setProducer(
      "iDr.Mind."
    );

    /* =====================================================
       GUARDAR
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