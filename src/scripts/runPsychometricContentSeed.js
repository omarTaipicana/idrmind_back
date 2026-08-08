const sequelize = require("../utils/connection");

// Carga todos los modelos y relaciones
require("../models/index");

const seedPsychometricQuestions = require(
  "../seeders/seedPsychometricQuestions"
);

const seedPsychometricPersonalities = require(
  "../seeders/seedPsychometricPersonalities"
);

const run = async () => {
  try {
    await sequelize.authenticate();

    console.log("✅ Base de datos conectada");

    console.log("\n==============================");
    console.log(" CARGANDO PREGUNTAS");
    console.log("==============================\n");

    await seedPsychometricQuestions();

    console.log("\n==============================");
    console.log(" CARGANDO PERSONALIDADES");
    console.log("==============================\n");

    await seedPsychometricPersonalities();

    console.log("\n==============================");
    console.log(" PROCESO FINALIZADO");
    console.log("==============================\n");

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();