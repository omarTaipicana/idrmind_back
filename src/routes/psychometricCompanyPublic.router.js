const express = require("express");

const {
  getPublicCompanyResults,
  getPublicCompanyParticipantResult,
  getPublicCompanyResultsPdf,
} = require(
  "../controllers/psychometricCompanyAccess.controllers"
);

const router =
  express.Router();

/* =========================================================
   PDF EMPRESARIAL PÚBLICO
========================================================= */

router.get(
  "/psychometric/company-results/:token/pdf",
  getPublicCompanyResultsPdf
);

/* =========================================================
   RESULTADOS GENERALES DE EMPRESA
========================================================= */

router.get(
  "/psychometric/company-results/:token",
  getPublicCompanyResults
);

/* =========================================================
   RESULTADO INDIVIDUAL DE UN PARTICIPANTE DE LA EMPRESA

   El controller valida:
   token -> empresaId -> evaluationId pertenece a empresa.
========================================================= */

router.get(
  "/psychometric/company-results/:token/participants/:evaluationId",
  getPublicCompanyParticipantResult
);

module.exports =
  router;
