const EvaluationAnswer = require("../models/EvaluationAnswer");
const EvaluationResponse = require("../models/EvaluationResponse");
const EvaluationQuestion = require("../models/EvaluationQuestion");
const catchError = require("../utils/catchError");

const getAll = catchError(async (req, res) => {
  const { responseId, questionId } = req.query;

  const where = {};

  if (responseId) where.responseId = responseId;
  if (questionId) where.questionId = questionId;

  const answers = await EvaluationAnswer.findAll({
    where,
    include: [EvaluationResponse, EvaluationQuestion],
    order: [["createdAt", "DESC"]],
  });

  return res.json(answers);
});

const getOne = catchError(async (req, res) => {
  const { id } = req.params;

  const answer = await EvaluationAnswer.findByPk(id, {
    include: [EvaluationResponse, EvaluationQuestion],
  });

  if (!answer) {
    return res.status(404).json({ message: "Respuesta no encontrada" });
  }

  return res.json(answer);
});

const remove = catchError(async (req, res) => {
  const { id } = req.params;

  const answer = await EvaluationAnswer.findByPk(id);

  if (!answer) {
    return res.status(404).json({ message: "Respuesta no encontrada" });
  }

  await answer.destroy();

  return res.sendStatus(204);
});

module.exports = {
  getAll,
  getOne,
  remove,
};