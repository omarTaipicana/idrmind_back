const sequelize = require("../utils/connection");

// Cambia esta ruta por tu archivo real de relaciones si es diferente.
require("../models");

const seedPsychometricQuestions = require("../seeders/seedPsychometricQuestions");
const seedPsychometricPersonalities = require("../seeders/seedPsychometricPersonalities");

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexión establecida.");

    await seedPsychometricQuestions();
    await seedPsychometricPersonalities();

    console.log("✅ Preguntas, opciones y personalidades cargadas.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error ejecutando seeds:", error);
    process.exit(1);
  }
};

run();
