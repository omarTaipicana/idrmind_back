const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Course = require("../models/Course");
const Inscripcion = require("../models/Inscripcion");
const catchError = require("../utils/catchError");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://idrmind.com";

const createFromMoodle = catchError(async (req, res) => {
  const { email, sigla } = req.query;

  if (!email || !sigla) {
    return res.status(400).send("Faltan datos de acceso.");
  }

  const user = await User.findOne({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    return res.status(404).send("Usuario no encontrado.");
  }

  const course = await Course.findOne({
    where: { sigla: sigla.toLowerCase().trim() },
  });

  if (!course) {
    return res.status(404).send("Curso no encontrado.");
  }

  const inscripcion = await Inscripcion.findOne({
    where: {
      userId: user.id,
      courseId: course.id,
    },
  });

  if (!inscripcion) {
    return res.status(404).send("No existe inscripción para este curso.");
  }

  const token = jwt.sign(
    {
      type: "evaluation",
      userId: user.id,
      courseId: course.id,
      inscripcionId: inscripcion.id,
      email: user.email,
    },
    process.env.TOKEN_SECRET,
    {
      expiresIn: "24h",
    }
  );

  return res.redirect(`${FRONTEND_URL}/#/evaluar-curso/${token}`);
});

const verifyToken = catchError(async (req, res) => {
  const { token } = req.params;

  try {
    const payload = jwt.verify(token, process.env.TOKEN_SECRET);

    if (payload.type !== "evaluation") {
      return res.status(401).json({
        valid: false,
        message: "Token no autorizado para evaluación.",
      });
    }

    const user = await User.findByPk(payload.userId);
    const course = await Course.findByPk(payload.courseId);
    const inscripcion = await Inscripcion.findByPk(payload.inscripcionId);

    if (!user || !course || !inscripcion) {
      return res.status(404).json({
        valid: false,
        message: "Datos de evaluación no encontrados.",
      });
    }

    return res.json({
      valid: true,
      userId: payload.userId,
      courseId: payload.courseId,
      inscripcionId: payload.inscripcionId,
      user,
      course,
      inscripcion,
    });
  } catch (error) {
    return res.status(401).json({
      valid: false,
      message: "Token inválido o expirado.",
    });
  }
});

module.exports = {
  createFromMoodle,
  verifyToken,
};