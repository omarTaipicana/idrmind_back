const CourseInstructor = require("../models/CourseInstructor");
const Course = require("../models/Course");
const catchError = require("../utils/catchError");

const create = catchError(async (req, res) => {
  const instructor = await CourseInstructor.create(req.body);
  return res.status(201).json(instructor);
});

const getAll = catchError(async (req, res) => {
  const { courseId } = req.query;

  const where = { isActive: true };

  if (courseId) where.courseId = courseId;

  const instructors = await CourseInstructor.findAll({
    where,
    include: [Course],
    order: [["createdAt", "DESC"]],
  });

  return res.json(instructors);
});

const getOne = catchError(async (req, res) => {
  const { id } = req.params;

  const instructor = await CourseInstructor.findByPk(id, {
    include: [Course],
  });

  if (!instructor) {
    return res.status(404).json({ message: "Docente no encontrado" });
  }

  return res.json(instructor);
});

const update = catchError(async (req, res) => {
  const { id } = req.params;

  const instructor = await CourseInstructor.findByPk(id);

  if (!instructor) {
    return res.status(404).json({ message: "Docente no encontrado" });
  }

  await instructor.update(req.body);

  return res.json(instructor);
});

const remove = catchError(async (req, res) => {
  const { id } = req.params;

  const instructor = await CourseInstructor.findByPk(id);

  if (!instructor) {
    return res.status(404).json({ message: "Docente no encontrado" });
  }

  await instructor.update({ isActive: false });

  return res.sendStatus(204);
});

module.exports = {
  create,
  getAll,
  getOne,
  update,
  remove,
};