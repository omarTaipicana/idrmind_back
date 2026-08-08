const express = require("express");

const {
  registerPsychometric,
} = require(
  "../controllers/psychometricRegistration.controllers"
);

const {
  validatePsychometricAccess,
} = require(
  "../controllers/psychometricAccess.controllers"
);

const {
  saveAnswers,
  finishEvaluation,
} = require(
  "../controllers/psychometricEvaluation.controllers"
);

const {
  getIndividualResult,
  getUserHistory,
  getAllResults,
  getPublicResultByToken,
} = require(
  "../controllers/psychometricResult.controllers"
);

const verifyJWT = require(
  "../utils/verifyJWT"
);

const psychometricRouter = express.Router();

/* =========================================
   REGISTRO AL TEST
========================================= */

psychometricRouter
  .route("/psychometric/register")
  .post(registerPsychometric);

/* =========================================
   ACCESO AL TEST POR TOKEN
========================================= */

psychometricRouter
  .route("/psychometric/access/:token")
  .get(validatePsychometricAccess);

/* =========================================
   GUARDAR RESPUESTAS POR TOKEN
========================================= */

psychometricRouter
  .route("/psychometric/access/:token/answers")
  .put(saveAnswers);

/* =========================================
   FINALIZAR EVALUACIÓN POR TOKEN
========================================= */

psychometricRouter
  .route("/psychometric/access/:token/finish")
  .post(finishEvaluation);

/* =========================================
   RESULTADO PÚBLICO MEDIANTE TOKEN
========================================= */

psychometricRouter
  .route("/psychometric/result/:token")
  .get(getPublicResultByToken);

/* =========================================
   RESULTADOS ADMINISTRATIVOS
========================================= */

psychometricRouter
  .route("/psychometric/results")
  .get(verifyJWT, getAllResults);

psychometricRouter
  .route("/psychometric/results/user/:userId")
  .get(verifyJWT, getUserHistory);

psychometricRouter
  .route("/psychometric/results/:evaluationId")
  .get(verifyJWT, getIndividualResult);

module.exports = psychometricRouter;