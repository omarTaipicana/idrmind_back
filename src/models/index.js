const User = require("./User");
const EmailCode = require("./EmailCode");
const Inscripcion = require("./Inscripcion");
const Course = require("./Course");
const Pagos = require("./Pagos");
const Certificado = require('../models/Certificado');

const EvaluationQuestion = require("./EvaluationQuestion");
const EvaluationResponse = require("./EvaluationResponse");
const EvaluationAnswer = require("./EvaluationAnswer");
const CourseInstructor = require("./CourseInstructor");
const EvaluationAccessToken = require("./EvaluationAccessToken");


EmailCode.belongsTo(User);
User.hasOne(EmailCode);

Inscripcion.belongsTo(Course);
Course.hasOne(Inscripcion);

Pagos.belongsTo(Inscripcion);
Inscripcion.hasOne(Pagos);

Inscripcion.belongsTo(User);
User.hasOne(Inscripcion);

// user.model.js
// Certificado.belongsTo(User, { foreignKey: "cedula", targetKey: "cI" });
// User.hasMany(Certificado, { foreignKey: "cedula", sourceKey: "cI" });

Certificado.belongsTo(Inscripcion);
Inscripcion.hasOne(Certificado);

// ===============================
// Evaluaciones de cursos
// ===============================

// Preguntas por curso
EvaluationQuestion.belongsTo(Course, { foreignKey: "courseId" });
Course.hasMany(EvaluationQuestion, { foreignKey: "courseId" });

// Evaluación realizada por usuario
EvaluationResponse.belongsTo(User, { foreignKey: "userId" });
User.hasMany(EvaluationResponse, { foreignKey: "userId" });

EvaluationResponse.belongsTo(Course, { foreignKey: "courseId" });
Course.hasMany(EvaluationResponse, { foreignKey: "courseId" });

// Respuestas individuales
EvaluationAnswer.belongsTo(EvaluationResponse, { foreignKey: "responseId" });
EvaluationResponse.hasMany(EvaluationAnswer, { foreignKey: "responseId" });

EvaluationAnswer.belongsTo(EvaluationQuestion, { foreignKey: "questionId" });
EvaluationQuestion.hasMany(EvaluationAnswer, { foreignKey: "questionId" });

EvaluationResponse.belongsTo(Inscripcion, { foreignKey: "inscripcionId" });
Inscripcion.hasOne(EvaluationResponse, { foreignKey: "inscripcionId" });

CourseInstructor.belongsTo(Course, { foreignKey: "courseId" });
Course.hasMany(CourseInstructor, { foreignKey: "courseId" });

EvaluationResponse.belongsTo(CourseInstructor, {
    foreignKey: "courseInstructorId",
});

CourseInstructor.hasMany(EvaluationResponse, {
    foreignKey: "courseInstructorId",
});

EvaluationAccessToken.belongsTo(User, { foreignKey: "userId" });
User.hasMany(EvaluationAccessToken, { foreignKey: "userId" });

EvaluationAccessToken.belongsTo(Course, { foreignKey: "courseId" });
Course.hasMany(EvaluationAccessToken, { foreignKey: "courseId" });

EvaluationAccessToken.belongsTo(Inscripcion, { foreignKey: "inscripcionId" });
Inscripcion.hasMany(EvaluationAccessToken, { foreignKey: "inscripcionId" });