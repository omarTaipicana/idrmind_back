const sequelize = require("../utils/connection");
const Course = require("../models/Course");
const PsychometricTest = require("../models/PsychometricTest");
const PsychometricSection = require("../models/PsychometricSection");
const PsychometricQuestion = require("../models/PsychometricQuestion");
const PsychometricOption = require("../models/PsychometricOption");
const questionsBySection = require("./psychometricQuestions.data");

const COURSE_SIGLA = "tpp";

const seedPsychometricQuestions = async () => {
  const transaction = await sequelize.transaction();

  try {
    const course = await Course.findOne({
      where: { sigla: COURSE_SIGLA, tipo: "test_psicotecnico" },
      transaction,
    });

    if (!course) {
      throw new Error(`No existe el curso psicotécnico con sigla ${COURSE_SIGLA}`);
    }

    const test = await PsychometricTest.findOne({
      where: { courseId: course.id },
      transaction,
    });

    if (!test) {
      throw new Error("Primero ejecuta el seed principal del test y sus secciones.");
    }

    let totalQuestions = 0;
    let totalOptions = 0;

    for (const [sectionCode, questions] of Object.entries(questionsBySection)) {
      const section = await PsychometricSection.findOne({
        where: { testId: test.id, codigo: sectionCode },
        transaction,
      });

      if (!section) {
        throw new Error(`No existe la sección ${sectionCode}`);
      }

      for (const questionData of questions) {
        const { opciones = [], ...questionFields } = questionData;

        const [question] = await PsychometricQuestion.findOrCreate({
          where: {
            sectionId: section.id,
            orden: questionFields.orden,
          },
          defaults: {
            sectionId: section.id,
            ...questionFields,
            obligatoria: true,
            activo: true,
          },
          transaction,
        });

        await question.update(
          {
            pregunta: questionFields.pregunta,
            tipoRespuesta: questionFields.tipoRespuesta,
            valorMinimo: questionFields.valorMinimo,
            valorMaximo: questionFields.valorMaximo,
            seleccionesMinimas: questionFields.seleccionesMinimas,
            seleccionesMaximas: questionFields.seleccionesMaximas,
            instrucciones: questionFields.instrucciones,
            configuracion: questionFields.configuracion,
            obligatoria: true,
            activo: true,
          },
          { transaction }
        );

        totalQuestions += 1;

        for (const optionData of opciones) {
          const [option] = await PsychometricOption.findOrCreate({
            where: {
              questionId: question.id,
              orden: optionData.orden,
            },
            defaults: {
              questionId: question.id,
              ...optionData,
              activo: true,
            },
            transaction,
          });

          await option.update(
            {
              texto: optionData.texto,
              codigo: optionData.codigo,
              categoriaResultado: optionData.categoriaResultado,
              puntaje: optionData.puntaje,
              metadata: optionData.metadata,
              activo: true,
            },
            { transaction }
          );

          totalOptions += 1;
        }
      }
    }

    await transaction.commit();

    console.log("✅ Preguntas y opciones cargadas correctamente.");
    console.log({ totalQuestions, totalOptions });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error cargando preguntas:", error);
    throw error;
  }
};

module.exports = seedPsychometricQuestions;
