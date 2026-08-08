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
const Empresa = require("./Empresa");
const EmpresaSeccion = require("./EmpresaSeccion");
const PsychometricEvaluation = require("./PsychometricEvaluation");
const PsychometricTest = require("./PsychometricTest");
const PsychometricPersonality = require("./PsychometricPersonality");
const PsychometricOption = require("./PsychometricOption");
const PsychometricQuestion = require("./PsychometricQuestion");
const PsychometricSection = require("./PsychometricSection");
const PsychometricAnswerOption = require("./PsychometricAnswerOption");
const PsychometricAnswer = require("./PsychometricAnswer");
const PsychometricAccessToken = require("./PsychometricAccessToken");


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








Empresa.hasMany(EmpresaSeccion, {
  foreignKey: "empresaId",
  as: "secciones",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

EmpresaSeccion.belongsTo(Empresa, {
  foreignKey: "empresaId",
  as: "empresa",
});


Empresa.hasMany(User, {
  foreignKey: "empresaId",
  as: "usuarios",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

User.belongsTo(Empresa, {
  foreignKey: "empresaId",
  as: "empresa",
});


EmpresaSeccion.hasMany(User, {
  foreignKey: "seccionId",
  as: "usuarios",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

User.belongsTo(EmpresaSeccion, {
  foreignKey: "seccionId",
  as: "empresaSeccion",
});



/* =========================================
   COURSE ↔ PSYCHOMETRIC TEST
========================================= */

Course.hasOne(PsychometricTest, {
  foreignKey: "courseId",
  as: "psychometricTest",
  onUpdate: "CASCADE",
  onDelete: "CASCADE",
});

PsychometricTest.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});


/* =========================================
   PSYCHOMETRIC TEST ↔ SECTIONS
========================================= */

PsychometricTest.hasMany(
  PsychometricSection,
  {
    foreignKey: "testId",
    as: "sections",
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  }
);

PsychometricSection.belongsTo(
  PsychometricTest,
  {
    foreignKey: "testId",
    as: "test",
  }
);


/* =========================================
   PSYCHOMETRIC SECTION ↔ QUESTIONS
========================================= */

PsychometricSection.hasMany(
  PsychometricQuestion,
  {
    foreignKey: "sectionId",
    as: "questions",
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  }
);

PsychometricQuestion.belongsTo(
  PsychometricSection,
  {
    foreignKey: "sectionId",
    as: "section",
  }
);


/* =========================================
   PSYCHOMETRIC QUESTION ↔ OPTIONS
========================================= */

PsychometricQuestion.hasMany(
  PsychometricOption,
  {
    foreignKey: "questionId",
    as: "options",
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  }
);

PsychometricOption.belongsTo(
  PsychometricQuestion,
  {
    foreignKey: "questionId",
    as: "question",
  }
);


/* =========================================
   INSCRIPCION ↔ PSYCHOMETRIC EVALUATIONS
========================================= */

Inscripcion.hasMany(
  PsychometricEvaluation,
  {
    foreignKey: "inscripcionId",
    as: "psychometricEvaluations",
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  }
);

PsychometricEvaluation.belongsTo(
  Inscripcion,
  {
    foreignKey: "inscripcionId",
    as: "inscripcion",
  }
);


/* =========================================
   PSYCHOMETRIC TEST ↔ EVALUATIONS
========================================= */

PsychometricTest.hasMany(
  PsychometricEvaluation,
  {
    foreignKey: "testId",
    as: "evaluations",
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  }
);

PsychometricEvaluation.belongsTo(
  PsychometricTest,
  {
    foreignKey: "testId",
    as: "test",
  }
);


/* =========================================
   PERSONALITY ↔ EVALUATIONS
========================================= */

PsychometricPersonality.hasMany(
  PsychometricEvaluation,
  {
    foreignKey: "personalityId",
    as: "evaluations",
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  }
);

PsychometricEvaluation.belongsTo(
  PsychometricPersonality,
  {
    foreignKey: "personalityId",
    as: "personality",
  }
);



/* =========================================
   EVALUATION ↔ ANSWERS
========================================= */

PsychometricEvaluation.hasMany(
  PsychometricAnswer,
  {
    foreignKey: "evaluationId",
    as: "answers",
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  }
);

PsychometricAnswer.belongsTo(
  PsychometricEvaluation,
  {
    foreignKey: "evaluationId",
    as: "evaluation",
  }
);


/* =========================================
   QUESTION ↔ ANSWERS
========================================= */

PsychometricQuestion.hasMany(
  PsychometricAnswer,
  {
    foreignKey: "questionId",
    as: "answers",
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  }
);

PsychometricAnswer.belongsTo(
  PsychometricQuestion,
  {
    foreignKey: "questionId",
    as: "question",
  }
);


/* =========================================
   ANSWER ↔ SELECTED OPTIONS
========================================= */

PsychometricAnswer.hasMany(
  PsychometricAnswerOption,
  {
    foreignKey: "answerId",
    as: "selectedOptions",
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  }
);

PsychometricAnswerOption.belongsTo(
  PsychometricAnswer,
  {
    foreignKey: "answerId",
    as: "answer",
  }
);


/* =========================================
   OPTION ↔ ANSWER OPTIONS
========================================= */

PsychometricOption.hasMany(
  PsychometricAnswerOption,
  {
    foreignKey: "optionId",
    as: "answerSelections",
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  }
);

PsychometricAnswerOption.belongsTo(
  PsychometricOption,
  {
    foreignKey: "optionId",
    as: "option",
  }
);


PsychometricEvaluation.hasMany(
  PsychometricAccessToken,
  {
    foreignKey: "evaluationId",
    as: "accessTokens",
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  }
);

PsychometricAccessToken.belongsTo(
  PsychometricEvaluation,
  {
    foreignKey: "evaluationId",
    as: "evaluation",
  }
);



PsychometricEvaluation.hasMany(
  Pagos,
  {
    foreignKey:
      "psychometricEvaluationId",

    as: "pagos",

    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  }
);

Pagos.belongsTo(
  PsychometricEvaluation,
  {
    foreignKey:
      "psychometricEvaluationId",

    as: "psychometricEvaluation",
  }
);

