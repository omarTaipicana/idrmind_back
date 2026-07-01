const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const CourseInstructor = sequelize.define("courseInstructor", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  courseId: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },

  email: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },

  role: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: "Docente",
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
});

module.exports = CourseInstructor;