const {
  getAll,
  getOne,
  remove,
} = require("../controllers/evaluationAnswer.controllers");

const express = require("express");

const evaluationAnswerRouter = express.Router();

evaluationAnswerRouter.route("/evaluation-answers").get(getAll);

evaluationAnswerRouter
  .route("/evaluation-answers/:id")
  .get(getOne)
  .delete(remove);

module.exports = evaluationAnswerRouter;