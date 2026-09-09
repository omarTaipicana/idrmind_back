const catchError = require(
  "../utils/catchError"
);

const Empresa = require(
  "../models/Empresa"
);

/* =========================================================
   HELPERS
========================================================= */

const normalizeBoolean = (
  value,
  defaultValue = true
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  if (
    value === true ||
    value === 1 ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === false ||
    value === 0 ||
    value === "0"
  ) {
    return false;
  }

  const normalized =
    String(value)
      .trim()
      .toLowerCase();

  if (
    ["true", "si", "sí"].includes(
      normalized
    )
  ) {
    return true;
  }

  if (
    ["false", "no"].includes(
      normalized
    )
  ) {
    return false;
  }

  return defaultValue;
};

const normalizeInteger = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return value;
  }

  const number =
    Number(value);

  return Number.isInteger(number)
    ? number
    : value;
};

const normalizeNullableText = (
  value
) => {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized === ""
    ? null
    : normalized;
};

const buildEmpresaPayload = (
  body = {},
  fileUrl = null
) => {
  const payload = {
    ...body,
  };

  /*
   * IMPORTANTE:
   * multipart/form-data convierte los campos vacíos en "".
   * Los campos opcionales del modelo deben convertirse
   * nuevamente a null para no disparar validaciones
   * como len del RUC o isEmail de correoGerente.
   */
  const nullableFields = [
    "nombreComercial",
    "ruc",
    "direccion",
    "ciudad",
    "provincia",
    "gerente",
    "contactoGerente",
    "correoGerente",
    "especialidad",
    "sitioWeb",
  ];

  nullableFields.forEach(
    (field) => {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field
        )
      ) {
        payload[field] =
          normalizeNullableText(
            body[field]
          );
      }
    }
  );

  /*
   * Campos obligatorios de texto:
   * se normalizan sin convertirlos a null.
   */
  const requiredTextFields = [
    "razonSocial",
    "correo",
    "telefono",
    "sector",
    "subSector",
  ];

  requiredTextFields.forEach(
    (field) => {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field
        )
      ) {
        payload[field] =
          String(
            body[field] ?? ""
          ).trim();
      }
    }
  );

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "numeroEmpleados"
    )
  ) {
    payload.numeroEmpleados =
      normalizeInteger(
        body.numeroEmpleados
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "activo"
    )
  ) {
    payload.activo =
      normalizeBoolean(
        body.activo,
        true
      );
  }

  /*
   * Solo reemplaza el logo cuando realmente
   * se subió un archivo nuevo.
   *
   * Si no llega archivo, conserva logoUrl actual
   * durante la edición.
   */
  if (fileUrl) {
    payload.logoUrl =
      fileUrl;
  } else {
    /*
     * No permitimos que un logoUrl vacío enviado
     * desde multipart borre accidentalmente
     * el logo existente.
     */
    delete payload.logoUrl;
  }

  return payload;
};

/* =========================================================
   LISTADO ADMINISTRATIVO
========================================================= */

const getAll = catchError(
  async (req, res) => {
    const results =
      await Empresa.findAll({
        order: [
          ["createdAt", "DESC"],
        ],
      });

    return res.json(
      results
    );
  }
);

/* =========================================================
   LISTADO PÚBLICO DE EMPRESAS ACTIVAS
========================================================= */

const getPublicActiveEmpresas =
  catchError(async (req, res) => {
    const results =
      await Empresa.findAll({
        where: {
          activo: true,
        },

        attributes: [
          "id",
          "razonSocial",
          "nombreComercial",
          "logoUrl",
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

    return res.json(
      results
    );
  });

/* =========================================================
   CREAR
========================================================= */

const create = catchError(
  async (req, res) => {
    const payload =
      buildEmpresaPayload(
        req.body,
        req.fileUrl || null
      );

    const result =
      await Empresa.create(
        payload
      );

    return res
      .status(201)
      .json(result);
  }
);

/* =========================================================
   OBTENER UNA
========================================================= */

const getOne = catchError(
  async (req, res) => {
    const { id } =
      req.params;

    const result =
      await Empresa.findByPk(
        id
      );

    if (!result) {
      return res
        .status(404)
        .json({
          message:
            "Empresa no encontrada.",
        });
    }

    return res.json(
      result
    );
  }
);

/* =========================================================
   ELIMINAR
========================================================= */

const remove = catchError(
  async (req, res) => {
    const { id } =
      req.params;

    const deleted =
      await Empresa.destroy({
        where: {
          id,
        },
      });

    if (
      deleted === 0
    ) {
      return res
        .status(404)
        .json({
          message:
            "Empresa no encontrada.",
        });
    }

    return res.sendStatus(
      204
    );
  }
);

/* =========================================================
   ACTUALIZAR
========================================================= */

const update = catchError(
  async (req, res) => {
    const { id } =
      req.params;

    const empresa =
      await Empresa.findByPk(
        id
      );

    if (!empresa) {
      return res
        .status(404)
        .json({
          message:
            "Empresa no encontrada.",
        });
    }

    const payload =
      buildEmpresaPayload(
        req.body,
        req.fileUrl || null
      );

    await empresa.update(
      payload
    );

    return res.json(
      empresa
    );
  }
);

/* =========================================================
   EXPORTACIONES
========================================================= */

module.exports = {
  getAll,
  getPublicActiveEmpresas,
  create,
  getOne,
  remove,
  update,
};
