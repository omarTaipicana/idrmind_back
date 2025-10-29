require("dotenv").config();
const { getMoodleCourseId } = require("./utils/moodle");

async function test() {
  const shortname = "cbpea"; // tu shortname exacto
  const courseId = await getMoodleCourseId(shortname);
  if (courseId) {
    console.log(`✅ Curso encontrado. ID Moodle: ${courseId}`);
  } else {
    console.log("❌ Curso NO encontrado en Moodle");
  }
}

test();
