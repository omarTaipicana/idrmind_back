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








const results = catchError(async (req, res) => {
    const { courseId, startDate, endDate } = req.query;

    if (!courseId) {
        return res.status(400).json({
            message: "courseId es obligatorio.",
        });
    }

    const where = { courseId };

    if (startDate || endDate) {
        where.createdAt = {};

        if (startDate) {
            where.createdAt[Op.gte] = new Date(`${startDate}T00:00:00.000-05:00`);
        }

        if (endDate) {
            where.createdAt[Op.lte] = new Date(`${endDate}T23:59:59.999-05:00`);
        }
    }

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

    const scaleAnswers = [];
    const textAnswers = [];

    responses.forEach((response) => {
        response.evaluationAnswers?.forEach((answer) => {
            const question = answer.evaluationQuestion;
            if (!question) return;

            if (question.type === "scale") {
                const value = Number(answer.value);
                if (!Number.isNaN(value)) {
                    scaleAnswers.push({
                        target: question.target,
                        questionId: question.id,
                        question: question.question,
                        category: question.category,
                        value,
                        weight: Number(question.weight || 1),
                    });
                }
            }

            if (question.type === "text" && answer.value) {
                textAnswers.push({
                    target: question.target,
                    questionId: question.id,
                    question: question.question,
                    category: question.category,
                    value: answer.value,
                    createdAt: response.createdAt,
                });
            }
        });
    });

    const calcularPromedio = (items) => {
        if (items.length === 0) return null;

        const total = items.reduce((acc, item) => acc + item.value * item.weight, 0);
        const peso = items.reduce((acc, item) => acc + item.weight, 0);

        return peso > 0 ? Number((total / peso).toFixed(2)) : null;
    };

    const byTarget = {
        course: calcularPromedio(scaleAnswers.filter((a) => a.target === "course")),
        teacher: calcularPromedio(scaleAnswers.filter((a) => a.target === "teacher")),
        platform: calcularPromedio(scaleAnswers.filter((a) => a.target === "platform")),
    };

    const questionsMap = {};

    scaleAnswers.forEach((answer) => {
        if (!questionsMap[answer.questionId]) {
            questionsMap[answer.questionId] = {
                questionId: answer.questionId,
                question: answer.question,
                category: answer.category,
                target: answer.target,
                totalAnswers: 0,
                average: 0,
                values: [],
            };
        }

        questionsMap[answer.questionId].totalAnswers += 1;
        questionsMap[answer.questionId].values.push(answer.value);
    });

    const questions = Object.values(questionsMap).map((q) => {
        const average =
            q.values.length > 0
                ? Number(
                    (q.values.reduce((acc, value) => acc + value, 0) / q.values.length).toFixed(2)
                )
                : null;

        return {
            questionId: q.questionId,
            question: q.question,
            category: q.category,
            target: q.target,
            totalAnswers: q.totalAnswers,
            average,
        };
    });

    const averageScore =
        responses.length > 0
            ? Number(
                (
                    responses.reduce((acc, r) => acc + Number(r.totalScore || 0), 0) /
                    responses.length
                ).toFixed(2)
            )
            : null;

    return res.json({
        courseId,
        totalResponses: responses.length,
        averageScore,
        byTarget,
        questions,
        textAnswers,
    });
});

module.exports = {
    create,
    getAll,
    getOne,
    remove,
    check,
    results,
};