const {
  getAll,
  create,
  getOne,
  remove,
  update,
} = require("../controllers/courseInstructor.controllers");

const express = require("express");

const courseInstructorRouter = express.Router();

courseInstructorRouter
  .route("/course-instructors")
  .get(getAll)
  .post(create);

courseInstructorRouter
  .route("/course-instructors/:id")
  .get(getOne)
  .delete(remove)
  .put(update);

module.exports = courseInstructorRouter;