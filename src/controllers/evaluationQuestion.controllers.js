const EvaluationQuestion = require("../models/EvaluationQuestion");
const Course = require("../models/Course");
const catchError = require("../utils/catchError");
const XLSX = require("xlsx");
const { Op } = require("sequelize");

const importExcel = catchError(async (req, res) => {
  const { courseId } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "No se subió archivo." });
  }

  const workbook = XLSX.read(req.file.buffer, {
    type: "buffer",
  });
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const preguntas = rows.map((row, index) => ({
    courseId: courseId || null,
    question: row.question,
    category: row.category || "General",
    target: row.target || "course",
    type: row.type || "scale",
    weight: row.weight || 1,
    order: row.order || index + 1,
    isRequired:
      row.isRequired === true ||
      row.isRequired === "true" ||
      row.isRequired === "SI" ||
      row.isRequired === "sí",
    isActive:
      row.isActive === undefined ||
      row.isActive === true ||
      row.isActive === "true" ||
      row.isActive === "SI" ||
      row.isActive === "sí",
  }));

  const preguntasValidas = preguntas.filter((p) => p.question);

  const created = await EvaluationQuestion.bulkCreate(preguntasValidas);

  return res.status(201).json({
    message: "Preguntas importadas correctamente.",
    total: created.length,
    data: created,
  });
});

const exportExcel = catchError(async (req, res) => {
  const { courseId, includeGlobal = "true" } = req.query;

  const where = {};

  if (courseId) {
    if (includeGlobal === "true") {
      where[Op.or] = [{ courseId: null }, { courseId }];
    } else {
      where.courseId = courseId;
    }
  } else {
    where.courseId = null;
  }

  const questions = await EvaluationQuestion.findAll({
    where,
    order: [["order", "ASC"]],
    raw: true,
  });

  const data = questions.map((q) => ({
    question: q.question,
    category: q.category,
    target: q.target,
    type: q.type,
    weight: q.weight,
    order: q.order,
    isRequired: q.isRequired,
    isActive: q.isActive,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Preguntas");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=preguntas-evaluacion.xlsx"
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  return res.send(buffer);
});

const downloadTemplate = catchError(async (req, res) => {
  const data = [
    {
      question: "¿Cómo califica el contenido del curso?",
      category: "Contenido",
      target: "course",
      type: "scale",
      weight: 1,
      order: 1,
      isRequired: true,
      isActive: true,
    },
    {
      question: "Escriba una recomendación o comentario adicional.",
      category: "Comentarios",
      target: "course",
      type: "text",
      weight: 1,
      order: 2,
      isRequired: false,
      isActive: true,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Preguntas");

  const instrucciones = [
    { campo: "question", descripcion: "Texto de la pregunta. Obligatorio." },
    { campo: "category", descripcion: "Categoría. Ejemplo: General, Docente, Plataforma." },
    { campo: "target", descripcion: "Valores permitidos: course, teacher, platform." },
    { campo: "type", descripcion: "Valores permitidos: scale, text." },
    { campo: "weight", descripcion: "Peso numérico. Ejemplo: 1." },
    { campo: "order", descripcion: "Orden de aparición. Ejemplo: 1, 2, 3." },
    { campo: "isRequired", descripcion: "TRUE o FALSE." },
    { campo: "isActive", descripcion: "TRUE o FALSE." },
  ];

  const worksheetInfo = XLSX.utils.json_to_sheet(instrucciones);
  XLSX.utils.book_append_sheet(workbook, worksheetInfo, "Instrucciones");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=plantilla-preguntas-evaluacion.xlsx"
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  return res.send(buffer);
});



const create = catchError(async (req, res) => {
  const question = await EvaluationQuestion.create(req.body);
  return res.status(201).json(question);
});

const getAll = catchError(async (req, res) => {
  const { courseId, includeInactive } = req.query;

  const where = {};

  if (includeInactive !== "true") {
    where.isActive = true;
  }

  if (courseId) {
    where[Op.or] = [{ courseId: null }, { courseId }];
  }

  const questions = await EvaluationQuestion.findAll({
    where,
    include: [Course],
    order: [["order", "ASC"]],
  });

  return res.json(questions);
});




const getOne = catchError(async (req, res) => {
  const { id } = req.params;

  const question = await EvaluationQuestion.findByPk(id, {
    include: [Course],
  });

  if (!question) {
    return res.status(404).json({ message: "Pregunta no encontrada" });
  }

  return res.json(question);
});

const update = catchError(async (req, res) => {
  const { id } = req.params;

  const question = await EvaluationQuestion.findByPk(id);

  if (!question) {
    return res.status(404).json({ message: "Pregunta no encontrada" });
  }

  await question.update(req.body);

  return res.json(question);
});

const remove = catchError(async (req, res) => {
  const { id } = req.params;

  const question = await EvaluationQuestion.findByPk(id);

  if (!question) {
    return res.status(404).json({ message: "Pregunta no encontrada" });
  }

  await question.update({ isActive: false });

  return res.sendStatus(204);
});

module.exports = {
  create,
  getAll,
  getOne,
  update,
  remove,
  importExcel,
  exportExcel,
  downloadTemplate,
};