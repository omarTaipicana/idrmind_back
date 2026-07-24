const express = require("express");
const {
  getAll,
  create,
  getOne,
  remove,
  update,
} = require("../controllers/empresa.controllers");

const verifyJWT = require("../utils/verifyJWT");

const empresaRouter = express.Router();

empresaRouter.use(verifyJWT);

empresaRouter
  .route("/empresas")
  .get(getAll)
  .post(create);

empresaRouter
  .route("/empresas/:id")
  .get(getOne)
  .put(update)
  .delete(remove);

module.exports = empresaRouter;