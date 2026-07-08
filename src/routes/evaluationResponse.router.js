const {
    getAll,
    create,
    getOne,
    remove,
    check,
    results,
} = require("../controllers/evaluationResponse.controllers");

const express = require("express");

const evaluationResponseRouter = express.Router();

evaluationResponseRouter
    .route("/evaluation-responses")
    .get(getAll)
    .post(create);

evaluationResponseRouter.route("/evaluation-responses/check").get(check);

evaluationResponseRouter
  .route("/evaluation-responses/results")
  .get(results);

evaluationResponseRouter
    .route("/evaluation-responses/:id")
    .get(getOne)
    .delete(remove);

module.exports = evaluationResponseRouter;