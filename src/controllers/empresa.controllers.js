const catchError = require("../utils/catchError");
const Empresa = require("../models/Empresa");

const getAll = catchError(async (req, res) => {
  const results = await Empresa.findAll({
    order: [["createdAt", "DESC"]],
  });

  return res.json(results);
});

const create = catchError(async (req, res) => {
  const result = await Empresa.create(req.body);

  return res.status(201).json(result);
});

const getOne = catchError(async (req, res) => {
  const { id } = req.params;

  const result = await Empresa.findByPk(id);

  if (!result) {
    return res.status(404).json({
      message: "Empresa no encontrada.",
    });
  }

  return res.json(result);
});

const remove = catchError(async (req, res) => {
  const { id } = req.params;

  const deleted = await Empresa.destroy({
    where: { id },
  });

  if (deleted === 0) {
    return res.status(404).json({
      message: "Empresa no encontrada.",
    });
  }

  return res.sendStatus(204);
});

const update = catchError(async (req, res) => {
  const { id } = req.params;

  const [updatedRows, updatedCompanies] = await Empresa.update(req.body, {
    where: { id },
    returning: true,
  });

  if (updatedRows === 0) {
    return res.status(404).json({
      message: "Empresa no encontrada.",
    });
  }

  return res.json(updatedCompanies[0]);
});

module.exports = {
  getAll,
  create,
  getOne,
  remove,
  update,
};