const EvaluationResponse = require("../models/EvaluationResponse");
const EvaluationAnswer = require("../models/EvaluationAnswer");
const EvaluationQuestion = require("../models/EvaluationQuestion");
const Inscripcion = require("../models/Inscripcion");
const Course = require("../models/Course");
const User = require("../models/User");
const CourseInstructor = require("../models/CourseInstructor");
const catchError = require("../utils/catchError");
const { Op } = require("sequelize");



const create = catchError(async (req, res) => {
    const {
        userId,
        courseId,
        inscripcionId,
        courseInstructorId = null,
        target = "course",
        answers = [],
        comment,
    } = req.body;

    if (!["course", "teacher", "platform"].includes(target)) {
        return res.status(400).json({
            message: "El target debe ser course, teacher o platform.",
        });
    }

    if (target === "teacher" && !courseInstructorId) {
        return res.status(400).json({
            message: "Para evaluar docente debe enviar courseInstructorId.",
        });
    }

    if (target !== "teacher" && courseInstructorId) {
        return res.status(400).json({
            message: "courseInstructorId solo se usa para evaluación de docente.",
        });
    }

    const exists = await EvaluationResponse.findOne({
        where: {
            inscripcionId,
            target,
            courseInstructorId,
        },
    });

    if (exists) {
        return res.status(400).json({
            message: "Esta inscripción ya tiene una evaluación registrada.",
        });
    }

    const questions = await EvaluationQuestion.findAll({
        where: {
            isActive: true,
            target,
            [Op.or]: [{ courseId: null }, { courseId }],
        },
    });

    const validQuestionIds = questions.map((q) => q.id);

    const invalidAnswers = answers.filter(
        (answer) => !validQuestionIds.includes(answer.questionId)
    );

    if (invalidAnswers.length > 0) {
        return res.status(400).json({
            message: `La evaluación ${target} contiene preguntas que no corresponden.`,
        });
    }

    let totalWeight = 0;
    let weightedSum = 0;

    answers.forEach((answer) => {
        const question = questions.find((q) => q.id === answer.questionId);

        if (question && question.type === "scale") {
            const value = Number(answer.value);
            const weight = Number(question.weight);

            if (!Number.isNaN(value)) {
                weightedSum += value * weight;
                totalWeight += weight;
            }
        }
    });

    const totalScore =
        totalWeight > 0 ? Number((weightedSum / totalWeight).toFixed(2)) : null;

    const response = await EvaluationResponse.create({
        userId,
        courseId,
        inscripcionId,
        courseInstructorId,
        target,
        totalScore,
        comment,
        completed: true,
    });

    const answersToCreate = answers.map((answer) => ({
        responseId: response.id,
        questionId: answer.questionId,
        value: String(answer.value),
    }));

    await EvaluationAnswer.bulkCreate(answersToCreate);

    const result = await EvaluationResponse.findByPk(response.id, {
        include: [
            User,
            Course,
            Inscripcion,
            CourseInstructor,
            {
                model: EvaluationAnswer,
                include: [EvaluationQuestion],
            },
        ],
    });

    return res.status(201).json(result);
});

const getAll = catchError(async (req, res) => {
    const { courseId, userId, inscripcionId } = req.query;

    const where = {};

    if (courseId) where.courseId = courseId;
    if (userId) where.userId = userId;
    if (inscripcionId) where.inscripcionId = inscripcionId;

    const responses = await EvaluationResponse.findAll({
        where,
        include: [
            User,
            Course,
            Inscripcion,
            CourseInstructor,

            {
                model: EvaluationAnswer,
                include: [EvaluationQuestion],
            },
        ],
        order: [["createdAt", "DESC"]],
    });

    return res.json(responses);
});

const getOne = catchError(async (req, res) => {
    const { id } = req.params;

    const response = await EvaluationResponse.findByPk(id, {
        include: [
            User,
            Course,
            Inscripcion,
            CourseInstructor,
            {
                model: EvaluationAnswer,
                include: [EvaluationQuestion],
            },
        ],
    });

    if (!response) {
        return res.status(404).json({ message: "Evaluación no encontrada" });
    }

    return res.json(response);
});

const remove = catchError(async (req, res) => {
    const { id } = req.params;

    const response = await EvaluationResponse.findByPk(id);

    if (!response) {
        return res.status(404).json({ message: "Evaluación no encontrada" });
    }

    await EvaluationAnswer.destroy({
        where: { responseId: id },
    });

    await response.destroy();

    return res.sendStatus(204);
});


const check = catchError(async (req, res) => {
    const { inscripcionId, target = "course", courseInstructorId = null } = req.query;

    if (!inscripcionId) {
        return res.status(400).json({
            message: "El inscripcionId es obligatorio.",
        });
    }

    if (!["course", "teacher", "platform"].includes(target)) {
        return res.status(400).json({
            message: "El target debe ser course, teacher o platform.",
        });
    }

    const response = await EvaluationResponse.findOne({
        where: {
            inscripcionId,
            target,
            courseInstructorId,
        },
    });

    return res.json({
        evaluated: !!response,
        responseId: response?.id || null,
        totalScore: response?.totalScore || null,
        target,
    });
});

module.exports = {
    create,
    getAll,
    getOne,
    remove,
    check,
};