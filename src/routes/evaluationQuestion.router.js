const {
  getAll,
  create,
  getOne,
  remove,
  update,
  importExcel,
  exportExcel,
  downloadTemplate,
} = require("../controllers/evaluationQuestion.controllers");

const express = require("express");
const multer = require("multer");

const evaluationQuestionRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

evaluationQuestionRouter
  .route("/evaluation-questions")
  .get(getAll)
  .post(create);

// Importar preguntas
evaluationQuestionRouter.post(
  "/evaluation-questions/import",
  upload.single("file"),
  importExcel
);

// Exportar preguntas
evaluationQuestionRouter.get(
  "/evaluation-questions/export",
  exportExcel
);

evaluationQuestionRouter.get(
  "/evaluation-questions/template",
  downloadTemplate
);

// Esta ruta siempre al final
evaluationQuestionRouter
  .route("/evaluation-questions/:id")
  .get(getOne)
  .delete(remove)
  .put(update);

module.exports = evaluationQuestionRouter;