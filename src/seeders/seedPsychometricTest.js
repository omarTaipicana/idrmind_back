const sequelize = require("../utils/connection");

const Course = require("../models/Course");

const PsychometricTest = require(
  "../models/PsychometricTest"
);

const PsychometricSection = require(
  "../models/PsychometricSection"
);

const PsychometricQuestion = require(
  "../models/PsychometricQuestion"
);

const PsychometricOption = require(
  "../models/PsychometricOption"
);

/*
 * Coloca aquí la sigla exacta del curso
 * que creaste como test_psicotecnico.
 */
const COURSE_SIGLA = "tpp";

const seedPsychometricTest = async () => {
  const transaction = await sequelize.transaction();

  try {
    /* ========================================
       1. BUSCAR CURSO
    ======================================== */

    const course = await Course.findOne({
      where: {
        sigla: COURSE_SIGLA,
        tipo: "test_psicotecnico",
      },
      transaction,
    });

    if (!course) {
      throw new Error(
        `No se encontró el curso psicotécnico con sigla ${COURSE_SIGLA}`
      );
    }

    /* ========================================
       2. CREAR O ACTUALIZAR TEST
    ======================================== */

    const [test] = await PsychometricTest.findOrCreate({
      where: {
        courseId: course.id,
      },

      defaults: {
        courseId: course.id,
        nombre: course.nombre,
        descripcion: course.objetivo,
        instrucciones:
          "Lea cuidadosamente cada indicación y responda todas las preguntas con sinceridad.",
        duracionMinutos: null,
        permiteContinuar: true,
        preguntasAleatorias: false,
        version: 1,
        activo: true,
      },

      transaction,
    });

    /* ========================================
       3. DEFINICIÓN DE SECCIONES
    ======================================== */

    const sectionsData = [
      {
        codigo: "animodo",
        nombre: "Animodo",
        descripcion:
          "Identifica la forma predominante de percibir y actuar.",
        instrucciones:
          "Seleccione el valor que mejor represente su comportamiento.",
        orden: 1,
        tipoCalculo: "animodo_ejes",
        configuracion: null,
        obligatoria: true,
        activo: true,
      },

      {
        codigo: "colores_comunicacion",
        nombre: "Colores de comunicación",
        descripcion:
          "Identifica el estilo predominante de comunicación.",
        instrucciones:
          "En cada grupo seleccione las opciones según el orden indicado.",
        orden: 2,
        tipoCalculo: "comunicacion_colores",
        configuracion: {
          puntajePrimeraSeleccion: 3,
          puntajeSegundaSeleccion: 1,
        },
        obligatoria: true,
        activo: true,
      },

      {
        codigo: "tipos_cerebro",
        nombre: "Tipos de cerebro",
        descripcion:
          "Identifica la forma predominante de procesar información.",
        instrucciones:
          "Califique cada afirmación del 1 al 5.",
        orden: 3,
        tipoCalculo: "cerebro_tres_dimensiones",
        configuracion: {
          valorMinimo: 1,
          valorMaximo: 5,
        },
        obligatoria: true,
        activo: true,
      },

      {
        codigo: "forma_negociadora",
        nombre: "Forma negociadora",
        descripcion:
          "Identifica el estilo utilizado al negociar y tomar decisiones.",
        instrucciones:
          "Seleccione una sola respuesta en cada pregunta.",
        orden: 4,
        tipoCalculo: "negociacion_puntaje",
        configuracion: null,
        obligatoria: true,
        activo: true,
      },

      {
        codigo: "vak",
        nombre: "Test VAK",
        descripcion:
          "Identifica el canal predominante de aprendizaje.",
        instrucciones:
          "Seleccione una sola respuesta en cada pregunta.",
        orden: 5,
        tipoCalculo: "vak_predominante",
        configuracion: null,
        obligatoria: true,
        activo: true,
      },
    ];

    /* ========================================
       4. CREAR O ACTUALIZAR SECCIONES
    ======================================== */

    const sectionsMap = {};

    for (const sectionData of sectionsData) {
      const [section] =
        await PsychometricSection.findOrCreate({
          where: {
            testId: test.id,
            codigo: sectionData.codigo,
          },

          defaults: {
            testId: test.id,
            ...sectionData,
          },

          transaction,
        });

      await section.update(
        {
          nombre: sectionData.nombre,
          descripcion: sectionData.descripcion,
          instrucciones: sectionData.instrucciones,
          orden: sectionData.orden,
          tipoCalculo: sectionData.tipoCalculo,
          configuracion: sectionData.configuracion,
          obligatoria: sectionData.obligatoria,
          activo: sectionData.activo,
        },
        {
          transaction,
        }
      );

      sectionsMap[sectionData.codigo] = section;
    }

    /*
     * En el siguiente paso colocaremos aquí
     * todas las preguntas y opciones del Excel.
     */

    await transaction.commit();

    console.log(
      "✅ Test psicotécnico y secciones creados correctamente."
    );

    console.log({
      courseId: course.id,
      testId: test.id,
      secciones: Object.keys(sectionsMap),
    });
  } catch (error) {
    await transaction.rollback();

    console.error(
      "❌ Error cargando el test psicotécnico:",
      error
    );

    throw error;
  }
};

module.exports = seedPsychometricTest;