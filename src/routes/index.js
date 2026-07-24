const express = require("express");
const userRouter = require("./user.router");
const senpladesRouter = require("./senplades.router");
const variablesRouter = require("./variables.router");
const inscripcionRouter = require("./inscripcion.router");
const courseRouter = require("./course.router");
const contactanosRouter = require("./contactanos.router");
const pagosRouter = require("./pagos.router");
const certificadoRouter = require("./certificado.router");
const userMRouter = require('./userm.router');
const institutoRouter = require("./instituto.routes");
const reporteRouter = require("./reporteCertificados.router");
const contificoRouter = require("./contifico.router");
const evaluationQuestionRouter = require("./evaluationQuestion.router");
const evaluationResponseRouter = require("./evaluationResponse.router");
const evaluationAnswerRouter = require("./evaluationAnswer.router");
const courseInstructorRouter = require("./courseInstructor.router");
const evaluationAccessRouter = require("./evaluationAccess.router");
const empresaRouter = require("./empresa.router");
const sectorRouter = require("./sector.router");
const empresaSeccionRouter = require("./empresaSeccion.router");


const router = express.Router();

// colocar las rutas aquí
router.use(userRouter);
router.use(senpladesRouter);
router.use(variablesRouter);
router.use(inscripcionRouter);
router.use(courseRouter);
router.use(contactanosRouter);
router.use(pagosRouter);
router.use(certificadoRouter);
router.use(userMRouter);
router.use(institutoRouter);
router.use(reporteRouter);
router.use(contificoRouter);
router.use(evaluationQuestionRouter);
router.use(evaluationResponseRouter);
router.use(evaluationAnswerRouter);
router.use(courseInstructorRouter);
router.use(evaluationAccessRouter);
router.use(empresaRouter);
router.use(sectorRouter);
router.use(empresaSeccionRouter);





module.exports = router;
