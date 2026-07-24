const { Op } = require("sequelize");

const Empresa = require("../models/Empresa");
const EmpresaSeccion = require("../models/EmpresaSeccion");
const catchError = require("../utils/catchError");

/**
 * Obtener todas las secciones.
 *
 * Permite filtros:
 * GET /empresa-secciones
 * GET /empresa-secciones?empresaId=uuid
 * GET /empresa-secciones?empresaId=uuid&activo=true
 */
const getAll = catchError(async (req, res) => {
  const {
    empresaId,
    activo,
    search,
  } = req.query;

  const where = {};

  if (empresaId) {
    where.empresaId = empresaId;
  }

  if (activo !== undefined) {
    where.activo = activo === "true";
  }

  if (search?.trim()) {
    where[Op.or] = [
      {
        nombre: {
          [Op.iLike]: `%${search.trim()}%`,
        },
      },
      {
        descripcion: {
          [Op.iLike]: `%${search.trim()}%`,
        },
      },
      {
        responsable: {
          [Op.iLike]: `%${search.trim()}%`,
        },
      },
    ];
  }

  const secciones = await EmpresaSeccion.findAll({
    where,
    include: [
      {
        model: Empresa,
        as: "empresa",
        attributes: [
          "id",
          "razonSocial",
          "nombreComercial",
        ],
      },
    ],
    order: [
      ["nombre", "ASC"],
    ],
  });

  return res.json(secciones);
});

/**
 * Obtener una sección por ID.
 */
const getOne = catchError(async (req, res) => {
  const { id } = req.params;

  const seccion = await EmpresaSeccion.findByPk(id, {
    include: [
      {
        model: Empresa,
        as: "empresa",
        attributes: [
          "id",
          "razonSocial",
          "nombreComercial",
        ],
      },
    ],
  });

  if (!seccion) {
    return res.status(404).json({
      message: "Sección no encontrada.",
    });
  }

  return res.json(seccion);
});

/**
 * Crear una sección.
 */
const create = catchError(async (req, res) => {
  const {
    empresaId,
    nombre,
    descripcion,
    responsable,
    correo,
    telefono,
    activo,
  } = req.body;

  if (!empresaId) {
    return res.status(400).json({
      message: "Debe seleccionar una empresa.",
    });
  }

  if (!nombre?.trim()) {
    return res.status(400).json({
      message: "El nombre de la sección es obligatorio.",
    });
  }

  const empresa = await Empresa.findByPk(empresaId);

  if (!empresa) {
    return res.status(404).json({
      message: "La empresa seleccionada no existe.",
    });
  }

  const nombreNormalizado = nombre.trim();

  const existente = await EmpresaSeccion.findOne({
    where: {
      empresaId,
      nombre: {
        [Op.iLike]: nombreNormalizado,
      },
    },
  });

  if (existente) {
    return res.status(400).json({
      message:
        "Ya existe una sección con ese nombre en la empresa.",
    });
  }

  const nuevaSeccion = await EmpresaSeccion.create({
    empresaId,
    nombre: nombreNormalizado,
    descripcion: descripcion?.trim() || null,
    responsable: responsable?.trim() || null,
    correo: correo?.trim().toLowerCase() || null,
    telefono:
      telefono?.replace(/[^\d+]/g, "").trim() ||
      null,
    activo:
      activo === undefined
        ? true
        : Boolean(activo),
  });

  return res.status(201).json({
    message: "Sección creada correctamente.",
    seccion: nuevaSeccion,
  });
});

/**
 * Actualizar una sección.
 */
const update = catchError(async (req, res) => {
  const { id } = req.params;

  const {
    empresaId,
    nombre,
    descripcion,
    responsable,
    correo,
    telefono,
    activo,
  } = req.body;

  const seccion = await EmpresaSeccion.findByPk(id);

  if (!seccion) {
    return res.status(404).json({
      message: "Sección no encontrada.",
    });
  }

  const empresaIdFinal =
    empresaId || seccion.empresaId;

  if (empresaId) {
    const empresa = await Empresa.findByPk(empresaId);

    if (!empresa) {
      return res.status(404).json({
        message: "La empresa seleccionada no existe.",
      });
    }
  }

  const nombreFinal =
    nombre !== undefined
      ? nombre.trim()
      : seccion.nombre;

  if (!nombreFinal) {
    return res.status(400).json({
      message: "El nombre de la sección es obligatorio.",
    });
  }

  const existente = await EmpresaSeccion.findOne({
    where: {
      empresaId: empresaIdFinal,

      nombre: {
        [Op.iLike]: nombreFinal,
      },

      id: {
        [Op.ne]: id,
      },
    },
  });

  if (existente) {
    return res.status(400).json({
      message:
        "Ya existe otra sección con ese nombre en la empresa.",
    });
  }

  await seccion.update({
    empresaId: empresaIdFinal,
    nombre: nombreFinal,

    descripcion:
      descripcion !== undefined
        ? descripcion?.trim() || null
        : seccion.descripcion,

    responsable:
      responsable !== undefined
        ? responsable?.trim() || null
        : seccion.responsable,

    correo:
      correo !== undefined
        ? correo?.trim().toLowerCase() || null
        : seccion.correo,

    telefono:
      telefono !== undefined
        ? telefono
            ?.replace(/[^\d+]/g, "")
            .trim() || null
        : seccion.telefono,

    activo:
      activo !== undefined
        ? Boolean(activo)
        : seccion.activo,
  });

  return res.json({
    message: "Sección actualizada correctamente.",
    seccion,
  });
});

/**
 * Eliminar una sección.
 */
const remove = catchError(async (req, res) => {
  const { id } = req.params;

  const seccion = await EmpresaSeccion.findByPk(id);

  if (!seccion) {
    return res.status(404).json({
      message: "Sección no encontrada.",
    });
  }

  await seccion.destroy();

  return res.json({
    message: "Sección eliminada correctamente.",
  });
});

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
};