const express = require("express");

const {
  getAll,
  getPublicActiveEmpresas,
  create,
  getOne,
  remove,
  update,
} = require(
  "../controllers/empresa.controllers"
);

const verifyJWT = require(
  "../utils/verifyJWT"
);

const empresaRouter =
  express.Router();

/* =========================================
   RUTA PÚBLICA
   SIN LOGIN / SIN TOKEN
========================================= */

empresaRouter
  .route("/empresas/public")
  .get(
    getPublicActiveEmpresas
  );

/* =========================================
   RUTAS ADMINISTRATIVAS PROTEGIDAS
========================================= */

empresaRouter
  .route("/empresas")
  .get(
    verifyJWT,
    getAll
  )
  .post(
    verifyJWT,
    create
  );

empresaRouter
  .route("/empresas/:id")
  .get(
    verifyJWT,
    getOne
  )
  .put(
    verifyJWT,
    update
  )
  .delete(
    verifyJWT,
    remove
  );

module.exports =
  empresaRouter;