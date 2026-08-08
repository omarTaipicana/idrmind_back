const sequelize = require("../utils/connection");

require("../models/index");

const seedPsychometricTest = require(
  "../seeders/seedPsychometricTest"
);

const run = async () => {
  try {
    await sequelize.authenticate();

    console.log(
      "✅ Conexión con la base de datos establecida."
    );

    await seedPsychometricTest();

    console.log(
      "✅ Proceso de carga finalizado."
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "❌ No se pudo ejecutar la carga:",
      error
    );

    process.exit(1);
  }
};

run();