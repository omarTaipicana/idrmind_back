const express = require("express");

/* =========================================================
   CONTROLLERS
========================================================= */

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
  captureInitialIdentity,
  captureFinalIdentity,
} = require(
  "../controllers/psychometricIdentity.controllers"
);

const {
  getIndividualResult,
  getUserHistory,
  getAllResults,
  getPublicResultByToken,
  getPsychometricResultPdf,
  getPsychometricResultPdfAdmin,
  previewPsychometricResultPdf,
} = require(
  "../controllers/psychometricResult.controllers"
);

/* =========================================================
   MIDDLEWARE
========================================================= */

const verifyJWT = require(
  "../utils/verifyJWT"
);

const {
  handleIdentityUpload,
} = require(
  "../middlewares/psychometricIdentityUpload"
);

/* =========================================================
   ROUTER
========================================================= */

const psychometricRouter =
  express.Router();

/* =========================================================
   REGISTRO AL TEST
========================================================= */

psychometricRouter
  .route(
    "/psychometric/register"
  )
  .post(
    registerPsychometric
  );

/* =========================================================
   ACCESO AL TEST POR TOKEN
========================================================= */

psychometricRouter
  .route(
    "/psychometric/access/:token"
  )
  .get(
    validatePsychometricAccess
  );

/* =========================================================
   VERIFICACIÓN INICIAL DE IDENTIDAD

   multipart/form-data

   Campos:
   photo
   consentAccepted
========================================================= */

psychometricRouter
  .route(
    "/psychometric/access/:token/identity"
  )
  .post(
    handleIdentityUpload,
    captureInitialIdentity
  );

/* =========================================================
   VERIFICACIÓN FINAL DE IDENTIDAD

   multipart/form-data

   Campos:
   photo
   consentAccepted
========================================================= */

psychometricRouter
  .route(
    "/psychometric/access/:token/identity/final"
  )
  .post(
    handleIdentityUpload,
    captureFinalIdentity
  );

/* =========================================================
   GUARDAR RESPUESTAS POR TOKEN
========================================================= */

psychometricRouter
  .route(
    "/psychometric/access/:token/answers"
  )
  .put(
    saveAnswers
  );

/* =========================================================
   FINALIZAR EVALUACIÓN POR TOKEN
========================================================= */

psychometricRouter
  .route(
    "/psychometric/access/:token/finish"
  )
  .post(
    finishEvaluation
  );

/* =========================================================
   RESULTADO PÚBLICO MEDIANTE TOKEN
========================================================= */

psychometricRouter
  .route(
    "/psychometric/result/:token"
  )
  .get(
    getPublicResultByToken
  );

/* =========================================================
   PDF PÚBLICO DEL RESULTADO POR TOKEN
========================================================= */

psychometricRouter
  .route(
    "/psychometric/result/:token/pdf"
  )
  .get(
    getPsychometricResultPdf
  );

/* =========================================================
   RESULTADOS ADMINISTRATIVOS
========================================================= */

psychometricRouter
  .route(
    "/psychometric/results"
  )
  .get(
    verifyJWT,
    getAllResults
  );

psychometricRouter
  .route(
    "/psychometric/results/user/:userId"
  )
  .get(
    verifyJWT,
    getUserHistory
  );

/* =========================================================
   PREVIEW PDF ADMINISTRATIVO
========================================================= */

psychometricRouter
  .route(
    "/psychometric/results/:evaluationId/pdf-preview"
  )
  .get(
    verifyJWT,
    previewPsychometricResultPdf
  );

/* =========================================================
   PDF ADMINISTRATIVO
========================================================= */

psychometricRouter
  .route(
    "/psychometric/results/:evaluationId/pdf"
  )
  .get(
    verifyJWT,
    getPsychometricResultPdfAdmin
  );

/* =========================================================
   RESULTADO INDIVIDUAL ADMINISTRATIVO
========================================================= */

psychometricRouter
  .route(
    "/psychometric/results/:evaluationId"
  )
  .get(
    verifyJWT,
    getIndividualResult
  );

/* =========================================================
   EXPORTAR ROUTER
========================================================= */

module.exports =
  psychometricRouter;