const {
  getAll,
  create,
  getOne,
  remove,
  update,
} = require("../controllers/evaluationQuestion.controllers");

const express = require("express");

const evaluationQuestionRouter = express.Router();

evaluationQuestionRouter
  .route("/evaluation-questions")
  .get(getAll)
  .post(create);

evaluationQuestionRouter
  .route("/evaluation-questions/:id")
  .get(getOne)
  .delete(remove)
  .put(update);

module.exports = evaluationQuestionRouter;