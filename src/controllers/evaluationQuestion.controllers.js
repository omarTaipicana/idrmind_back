const EvaluationQuestion = require("../models/EvaluationQuestion");
const Course = require("../models/Course");
const catchError = require("../utils/catchError");
const { Op } = require("sequelize");

const create = catchError(async (req, res) => {
  const question = await EvaluationQuestion.create(req.body);
  return res.status(201).json(question);
});

const getAll = catchError(async (req, res) => {
  const { courseId } = req.query;

  const where = {
    isActive: true,
  };

  if (courseId) {
    where[Op.or] = [{ courseId: null }, { courseId }];
  }

  const questions = await EvaluationQuestion.findAll({
    where,
    include: [Course],
    order: [["order", "ASC"]],
  });

  return res.json(questions);
});




const getOne = catchError(async (req, res) => {
  const { id } = req.params;

  const question = await EvaluationQuestion.findByPk(id, {
    include: [Course],
  });

  if (!question) {
    return res.status(404).json({ message: "Pregunta no encontrada" });
  }

  return res.json(question);
});

const update = catchError(async (req, res) => {
  const { id } = req.params;

  const question = await EvaluationQuestion.findByPk(id);

  if (!question) {
    return res.status(404).json({ message: "Pregunta no encontrada" });
  }

  await question.update(req.body);

  return res.json(question);
});

const remove = catchError(async (req, res) => {
  const { id } = req.params;

  const question = await EvaluationQuestion.findByPk(id);

  if (!question) {
    return res.status(404).json({ message: "Pregunta no encontrada" });
  }

  await question.update({ isActive: false });

  return res.sendStatus(204);
});

module.exports = {
  create,
  getAll,
  getOne,
  update,
  remove,
};