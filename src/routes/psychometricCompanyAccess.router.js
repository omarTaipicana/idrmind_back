const express = require("express");

const router =
  express.Router();

const verifyJWT =
  require("../utils/verifyJWT");

const {
  getCompanyAccessStatus,
  sendCompanyAccessEmail,
  setCompanyAccessActive,
  getCompanyResultsPdfAdmin,
} = require(
  "../controllers/psychometricCompanyAccess.controllers"
);

/* =========================================================
   ADMIN
========================================================= */

router.get(
  "/organizations/:empresaId/pdf",
  verifyJWT,
  getCompanyResultsPdfAdmin,
);

router.get(
  "/organizations/:empresaId/access",
  verifyJWT,
  getCompanyAccessStatus,
);

router.post(
  "/organizations/:empresaId/access/send",
  verifyJWT,
  sendCompanyAccessEmail,
);

router.patch(
  "/organizations/:empresaId/access",
  verifyJWT,
  setCompanyAccessActive,
);

module.exports =
  router;
