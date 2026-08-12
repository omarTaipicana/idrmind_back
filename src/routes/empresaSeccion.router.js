const {
  getAll,
  getPublicByEmpresa,
  create,
  getOne,
  remove,
  update,
} = require(
  "../controllers/empresaSeccion.controller"
);

const express = require("express");

const verifyJWT = require(
  "../utils/verifyJWT"
);

const empresaSeccionRouter =
  express.Router();

/* =========================================
   RUTA PÚBLICA
   SOLO SECCIONES ACTIVAS DE UNA EMPRESA
========================================= */

empresaSeccionRouter
  .route(
    "/empresa-secciones/public"
  )
  .get(getPublicByEmpresa);

/* =========================================
   RUTAS ADMINISTRATIVAS
========================================= */

empresaSeccionRouter
  .route("/empresa-secciones")
  .get(
    verifyJWT,
    getAll
  )
  .post(
    verifyJWT,
    create
  );

empresaSeccionRouter
  .route(
    "/empresa-secciones/:id"
  )
  .get(
    verifyJWT,
    getOne
  )
  .delete(
    verifyJWT,
    remove
  )
  .put(
    verifyJWT,
    update
  );

module.exports =
  empresaSeccionRouter;