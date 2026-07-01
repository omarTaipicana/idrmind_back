const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const EvaluationResponse = sequelize.define("evaluationResponse", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },

    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "Usuario que respondió la evaluación.",
    },

    inscripcionId: {
        type: DataTypes.UUID,
        allowNull: false,
    },

    courseId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "ID del curso de Moodle evaluado.",
    },

    courseInstructorId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment:
            "Docente evaluado. Null cuando la evaluación es del curso o plataforma.",
    },

    totalScore: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: "Calificación final ponderada de la evaluación.",
    },
    
    target: {
        type: DataTypes.ENUM("course", "teacher", "platform"),
        allowNull: false,
        defaultValue: "course",
    },

    comment: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Comentario general del estudiante.",
    },

    completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
});

module.exports = EvaluationResponse;