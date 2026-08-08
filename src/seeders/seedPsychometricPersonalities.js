const sequelize = require("../utils/connection");
const PsychometricPersonality = require("../models/PsychometricPersonality");
const personalities = require("./psychometricPersonalities.data");

const seedPsychometricPersonalities = async () => {
  const transaction = await sequelize.transaction();

  try {
    for (const personalityData of personalities) {
      const [personality] = await PsychometricPersonality.findOrCreate({
        where: { codigo: personalityData.codigo },
        defaults: personalityData,
        transaction,
      });

      await personality.update(personalityData, { transaction });
    }

    await transaction.commit();

    console.log("✅ 60 personalidades cargadas correctamente.");
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error cargando personalidades:", error);
    throw error;
  }
};

module.exports = seedPsychometricPersonalities;
