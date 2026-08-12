const catchError = require(
  "../utils/catchError"
);

const Empresa = require(
  "../models/Empresa"
);

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

    return res.json(results);
  }
);

/* =========================================================
   LISTADO PÚBLICO DE EMPRESAS ACTIVAS
   SOLO DATOS NECESARIOS PARA EL REGISTRO
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

    return res.json(results);
  });

/* =========================================================
   CREAR
========================================================= */

const create = catchError(
  async (req, res) => {
    const result =
      await Empresa.create(
        req.body
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
    const { id } = req.params;

    const result =
      await Empresa.findByPk(id);

    if (!result) {
      return res
        .status(404)
        .json({
          message:
            "Empresa no encontrada.",
        });
    }

    return res.json(result);
  }
);

/* =========================================================
   ELIMINAR
========================================================= */

const remove = catchError(
  async (req, res) => {
    const { id } = req.params;

    const deleted =
      await Empresa.destroy({
        where: {
          id,
        },
      });

    if (deleted === 0) {
      return res
        .status(404)
        .json({
          message:
            "Empresa no encontrada.",
        });
    }

    return res.sendStatus(204);
  }
);

/* =========================================================
   ACTUALIZAR
========================================================= */

const update = catchError(
  async (req, res) => {
    const { id } = req.params;

    const [
      updatedRows,
      updatedCompanies,
    ] = await Empresa.update(
      req.body,
      {
        where: {
          id,
        },

        returning: true,
      }
    );

    if (updatedRows === 0) {
      return res
        .status(404)
        .json({
          message:
            "Empresa no encontrada.",
        });
    }

    return res.json(
      updatedCompanies[0]
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