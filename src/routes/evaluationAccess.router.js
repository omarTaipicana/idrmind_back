const {
  createFromMoodle,
  verifyToken,
} = require("../controllers/evaluationAccess.controllers");

const express = require("express");

const evaluationAccessRouter = express.Router();

evaluationAccessRouter
  .route("/evaluation-access/moodle")
  .get(createFromMoodle);

evaluationAccessRouter
  .route("/evaluation-access/verify/:token")
  .get(verifyToken);

module.exports = evaluationAccessRouter;