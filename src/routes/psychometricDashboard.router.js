const express = require(
  "express"
);

const router =
  express.Router();

/* =========================================================
   CONTROLADORES
========================================================= */

const {
  getPsychometricDashboardSummary,

  getPsychometricDashboardAnalytics,

  getPsychometricDashboardFilters,

  getPsychometricDashboardOrganizations,

  getPsychometricDashboardParticipants,

  getPsychometricDashboardParticipantDetail,
} = require(
  "../controllers/psychometricDashboard.controllers"
);

/* =========================================================
   MIDDLEWARES
========================================================= */

const verifyJWT = require(
  "../utils/verifyJWT"
);

/* =========================================================
   RESUMEN GENERAL

   GET /psychometric/dashboard/summary
========================================================= */

router.get(
  "/summary",
  verifyJWT,
  getPsychometricDashboardSummary
);

/* =========================================================
   ANALÍTICA PSICOMÉTRICA

   GET /psychometric/dashboard/analytics
========================================================= */

router.get(
  "/analytics",
  verifyJWT,
  getPsychometricDashboardAnalytics
);

/* =========================================================
   OPCIONES PARA FILTROS

   GET /psychometric/dashboard/filters
========================================================= */

router.get(
  "/filters",
  verifyJWT,
  getPsychometricDashboardFilters
);

/* =========================================================
   EMPRESAS Y SECCIONES

   GET /psychometric/dashboard/organizations
========================================================= */

router.get(
  "/organizations",
  verifyJWT,
  getPsychometricDashboardOrganizations
);

/* =========================================================
   LISTADO DE PARTICIPANTES

   GET /psychometric/dashboard/participants
========================================================= */

router.get(
  "/participants",
  verifyJWT,
  getPsychometricDashboardParticipants
);

/* =========================================================
   DETALLE DE PARTICIPANTE / EVALUACIÓN

   IMPORTANTE:
   Debe ir después de "/participants".
========================================================= */

router.get(
  "/participants/:evaluationId",
  verifyJWT,
  getPsychometricDashboardParticipantDetail
);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;