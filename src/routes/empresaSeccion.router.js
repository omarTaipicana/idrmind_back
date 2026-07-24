const {
  getAll,
  create,
  getOne,
  remove,
  update,
} = require("../controllers/empresaSeccion.controller");

const express = require("express");
const verifyJWT = require("../utils/verifyJWT");

const empresaSeccionRouter = express.Router();

empresaSeccionRouter
  .route("/empresa-secciones")
  .get(verifyJWT, getAll)
  .post(verifyJWT, create);

empresaSeccionRouter
  .route("/empresa-secciones/:id")
  .get(verifyJWT, getOne)
  .delete(verifyJWT, remove)
  .put(verifyJWT, update);

module.exports = empresaSeccionRouter;