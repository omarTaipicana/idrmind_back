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
  getPsychometricResultPdf,
  getPsychometricResultPdfAdmin,
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
 PDF PÚBLICO DEL RESULTADO POR TOKEN
========================================= */

psychometricRouter
  .route(
    "/psychometric/result/:token/pdf"
  )
  .get(
    getPsychometricResultPdf
  );

/* =========================================
   RESULTADOS ADMINISTRATIVOS
========================================= */

psychometricRouter
  .route("/psychometric/results")
  .get(verifyJWT, getAllResults);

psychometricRouter
  .route("/psychometric/results/user/:userId")
  .get(verifyJWT, getUserHistory);

/* =========================================
 PDF ADMINISTRATIVO
========================================= */

psychometricRouter
  .route(
    "/psychometric/results/:evaluationId/pdf"
  )
  .get(
    verifyJWT,
    getPsychometricResultPdfAdmin
  );

psychometricRouter
  .route("/psychometric/results/:evaluationId")
  .get(verifyJWT, getIndividualResult);

module.exports = psychometricRouter;