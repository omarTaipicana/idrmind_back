const { DataTypes } = require("sequelize");
const sequelize = require("../utils/connection");

const EvaluationQuestion = sequelize.define("evaluationQuestion", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },

    courseId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment:
            "ID del curso de Moodle. Si es null, la pregunta es general para todos los cursos.",
    },

    question: {
        type: DataTypes.TEXT,
        allowNull: false,
    },

    category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "General",
    },

    target: {
        type: DataTypes.ENUM("course", "teacher", "platform"),
        allowNull: false,
        defaultValue: "course",
    },

    type: {
        type: DataTypes.ENUM("scale", "text"),
        allowNull: false,
        defaultValue: "scale",
        comment: "scale = calificación 1-5, text = respuesta abierta",
    },

    scaleLabels: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
            1: "Muy malo",
            2: "Malo",
            3: "Regular",
            4: "Bueno",
            5: "Excelente",
        },
        comment: "Etiquetas personalizadas para preguntas tipo escala.",
    },

    weight: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 1,
        comment: "Peso de la pregunta para el cálculo de la evaluación.",
    },

    order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },

    isRequired: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },

    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
});

module.exports = EvaluationQuestion;