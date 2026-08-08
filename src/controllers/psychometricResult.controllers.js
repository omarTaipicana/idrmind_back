const { Op } = require("sequelize");
const crypto = require("crypto");

const catchError = require("../utils/catchError");

const PsychometricAccessToken = require(
  "../models/PsychometricAccessToken"
);

const PsychometricEvaluation = require(
  "../models/PsychometricEvaluation"
);

const PsychometricPersonality = require(
  "../models/PsychometricPersonality"
);

const PsychometricTest = require(
  "../models/PsychometricTest"
);

const Inscripcion = require(
  "../models/Inscripcion"
);

const User = require("../models/User");
const Course = require("../models/Course");
const Empresa = require("../models/Empresa");

const EmpresaSeccion = require(
  "../models/EmpresaSeccion"
);

const Pagos = require("../models/Pagos");

/* =========================================================
   RESULTADO INDIVIDUAL ADMINISTRATIVO
   GET /psychometric/results/:evaluationId
========================================================= */

const getIndividualResult = catchError(
  async (req, res) => {
    const { evaluationId } = req.params;

    const evaluation =
      await PsychometricEvaluation.findByPk(
        evaluationId,
        {
          include: [
            {
              model: PsychometricPersonality,
              as: "personality",
              required: false,
            },
            {
              model: PsychometricTest,
              as: "test",
              required: false,

              include: [
                {
                  model: Course,
                  as: "course",
                  required: false,
                },
              ],
            },
            {
              model: Inscripcion,
              as: "inscripcion",
              required: false,

              include: [
                {
                  model: User,
                  as: "user",
                  required: false,

                  include: [
                    {
                      model: Empresa,
                      as: "empresa",
                      required: false,
                    },
                    {
                      model: EmpresaSeccion,
                      as: "empresaSeccion",
                      required: false,
                    },
                  ],
                },
              ],
            },
            {
              model: Pagos,
              as: "pagos",
              required: false,
            },
          ],
        }
      );

    if (!evaluation) {
      return res.status(404).json({
        message: "La evaluación no existe.",
      });
    }

    /*
     * Este endpoint está protegido con verifyJWT,
     * pero conservamos la validación de finalización.
     */
    if (evaluation.estado !== "completada") {
      return res.status(409).json({
        message:
          "La evaluación todavía no ha sido completada.",
        estado: evaluation.estado,
      });
    }

    const user =
      evaluation.inscripcion?.user || null;

    const verifiedPayment =
      (evaluation.pagos || []).find(
        (payment) =>
          payment.verificado === true
      ) || null;

    return res.json({
      evaluation: {
        id: evaluation.id,

        numeroEvaluacion:
          evaluation.numeroEvaluacion,

        estado: evaluation.estado,

        fechaHabilitacion:
          evaluation.fechaHabilitacion,

        fechaInicio:
          evaluation.fechaInicio,

        fechaFinalizacion:
          evaluation.fechaFinalizacion,

        testVersion:
          evaluation.testVersion,

        puntajeTotal:
          evaluation.puntajeTotal,

        resultadoLiberado:
          evaluation.resultadoLiberado,

        observacion:
          evaluation.observacion,

        createdAt:
          evaluation.createdAt,

        updatedAt:
          evaluation.updatedAt,
      },

      user: user
        ? {
            id: user.id,
            cI: user.cI,
            email: user.email,

            firstName:
              user.firstName,

            lastName:
              user.lastName,

            cellular:
              user.cellular,

            grado:
              user.grado,

            subsistema:
              user.subsistema,

            empresa: user.empresa
              ? {
                  id:
                    user.empresa.id,

                  nombre:
                    user.empresa
                      .nombreComercial ||
                    user.empresa
                      .razonSocial,
                }
              : null,

            seccion:
              user.empresaSeccion
                ? {
                    id:
                      user.empresaSeccion.id,

                    nombre:
                      user.empresaSeccion
                        .nombre,
                  }
                : null,
          }
        : null,

      course: evaluation.test?.course
        ? {
            id:
              evaluation.test.course.id,

            nombre:
              evaluation.test.course
                .nombre,

            sigla:
              evaluation.test.course
                .sigla,

            objetivo:
              evaluation.test.course
                .objetivo,

            tipo:
              evaluation.test.course
                .tipo,
          }
        : null,

      personality:
        evaluation.personality
          ? {
              id:
                evaluation.personality.id,

              numero:
                evaluation.personality
                  .numero,

              codigo:
                evaluation.personality
                  .codigo,

              nombre:
                evaluation.personality
                  .nombre,

              animal:
                evaluation.personality
                  .animal,

              colorCabeza:
                evaluation.personality
                  .colorCabeza,

              tipoCerebro:
                evaluation.personality
                  .tipoCerebro,

              colorPecho:
                evaluation.personality
                  .colorPecho,

              tipoComunicacion:
                evaluation.personality
                  .tipoComunicacion,

              imagenUrl:
                evaluation.personality
                  .imagenUrl,

              descripcion:
                evaluation.personality
                  .descripcion,

              formaPensar:
                evaluation.personality
                  .formaPensar,

              formaAprender:
                evaluation.personality
                  .formaAprender,

              descripcionComunicacion:
                evaluation.personality
                  .descripcionComunicacion,
            }
          : null,

      /*
       * El administrador autenticado puede revisar
       * el resultado completo aunque aún no haya sido
       * liberado al participante.
       */
      result: evaluation.resultado,

      payment: verifiedPayment
        ? {
            id:
              verifiedPayment.id,

            tipoPago:
              verifiedPayment.tipoPago,

            valorDepositado:
              verifiedPayment
                .valorDepositado,

            pagoUrl:
              verifiedPayment.pagoUrl,

            verificado:
              verifiedPayment.verificado,

            confirmacion:
              verifiedPayment.confirmacion,

            entidad:
              verifiedPayment.entidad,

            idDeposito:
              verifiedPayment.idDeposito,

            contificoDocumentoId:
              verifiedPayment
                .contificoDocumentoId,

            contificoDocumentoNumero:
              verifiedPayment
                .contificoDocumentoNumero,

            contificoEstado:
              verifiedPayment
                .contificoEstado,

            contificoAutorizacion:
              verifiedPayment
                .contificoAutorizacion,

            contificoUrlRide:
              verifiedPayment
                .contificoUrlRide,

            contificoUrlXml:
              verifiedPayment
                .contificoUrlXml,
          }
        : null,
    });
  }
);

/* =========================================================
   HISTORIAL DE EVALUACIONES POR USUARIO
   GET /psychometric/results/user/:userId
========================================================= */

const getUserHistory = catchError(
  async (req, res) => {
    const { userId } = req.params;

    const user = await User.findByPk(
      userId,
      {
        attributes: [
          "id",
          "cI",
          "email",
          "firstName",
          "lastName",
          "empresaId",
          "seccionId",
        ],

        include: [
          {
            model: Empresa,
            as: "empresa",
            required: false,
          },
          {
            model: EmpresaSeccion,
            as: "empresaSeccion",
            required: false,
          },
        ],
      }
    );

    if (!user) {
      return res.status(404).json({
        message: "El usuario no existe.",
      });
    }

    const evaluations =
      await PsychometricEvaluation.findAll({
        include: [
          {
            model: Inscripcion,
            as: "inscripcion",
            required: true,

            where: {
              userId,
            },

            attributes: [
              "id",
              "userId",
              "courseId",
              "curso",
            ],
          },
          {
            model: PsychometricPersonality,
            as: "personality",
            required: false,
          },
          {
            model: PsychometricTest,
            as: "test",
            required: false,

            include: [
              {
                model: Course,
                as: "course",
                required: false,
              },
            ],
          },
          {
            model: Pagos,
            as: "pagos",
            required: false,
          },
        ],

        order: [
          ["createdAt", "ASC"],
          ["numeroEvaluacion", "ASC"],
        ],
      });

    return res.json({
      user: {
        id: user.id,
        cI: user.cI,
        email: user.email,

        nombre: [
          user.firstName,
          user.lastName,
        ]
          .filter(Boolean)
          .join(" "),

        empresa: user.empresa
          ? {
              id: user.empresa.id,

              nombre:
                user.empresa
                  .nombreComercial ||
                user.empresa
                  .razonSocial,
            }
          : null,

        seccion:
          user.empresaSeccion
            ? {
                id:
                  user.empresaSeccion.id,

                nombre:
                  user.empresaSeccion
                    .nombre,
              }
            : null,
      },

      total: evaluations.length,

      data: evaluations.map(
        (evaluation) => {
          const verifiedPayment =
            (evaluation.pagos || []).find(
              (payment) =>
                payment.verificado === true
            ) || null;

          return {
            id: evaluation.id,

            numeroEvaluacion:
              evaluation.numeroEvaluacion,

            estado:
              evaluation.estado,

            fechaHabilitacion:
              evaluation.fechaHabilitacion,

            fechaInicio:
              evaluation.fechaInicio,

            fechaFinalizacion:
              evaluation.fechaFinalizacion,

            puntajeTotal:
              evaluation.puntajeTotal,

            resultadoLiberado:
              evaluation.resultadoLiberado,

            createdAt:
              evaluation.createdAt,

            course:
              evaluation.test?.course
                ? {
                    id:
                      evaluation.test.course
                        .id,

                    nombre:
                      evaluation.test.course
                        .nombre,

                    sigla:
                      evaluation.test.course
                        .sigla,
                  }
                : null,

            personality:
              evaluation.personality
                ? {
                    id:
                      evaluation.personality
                        .id,

                    numero:
                      evaluation.personality
                        .numero,

                    codigo:
                      evaluation.personality
                        .codigo,

                    nombre:
                      evaluation.personality
                        .nombre,

                    animal:
                      evaluation.personality
                        .animal,

                    colorCabeza:
                      evaluation.personality
                        .colorCabeza,

                    tipoCerebro:
                      evaluation.personality
                        .tipoCerebro,

                    colorPecho:
                      evaluation.personality
                        .colorPecho,

                    tipoComunicacion:
                      evaluation.personality
                        .tipoComunicacion,

                    imagenUrl:
                      evaluation.personality
                        .imagenUrl,
                  }
                : null,

            payment: verifiedPayment
              ? {
                  id:
                    verifiedPayment.id,

                  tipoPago:
                    verifiedPayment.tipoPago,

                  valorDepositado:
                    verifiedPayment
                      .valorDepositado,

                  verificado:
                    verifiedPayment
                      .verificado,

                  createdAt:
                    verifiedPayment
                      .createdAt,
                }
              : null,
          };
        }
      ),
    });
  }
);

/* =========================================================
   LISTADO ADMINISTRATIVO PAGINADO
   GET /psychometric/results
========================================================= */

const getAllResults = catchError(
  async (req, res) => {
    const {
      empresaId,
      seccionId,
      userId,
      courseId,
      testId,
      estado,
      resultadoLiberado,
      animal,
      tipoCerebro,
      tipoComunicacion,
      fechaDesde,
      fechaHasta,
      busqueda,
      pagoVerificado,
      page = 1,
      limit = 20,
    } = req.query;

    const evaluationWhere = {};
    const userWhere = {};
    const personalityWhere = {};
    const testWhere = {};
    const courseWhere = {};
    const paymentWhere = {};

    if (estado) {
      evaluationWhere.estado = estado;
    }

    if (
      resultadoLiberado !== undefined &&
      resultadoLiberado !== ""
    ) {
      evaluationWhere.resultadoLiberado =
        resultadoLiberado === "true";
    }

    if (testId) {
      testWhere.id = testId;
    }

    if (courseId) {
      courseWhere.id = courseId;
    }

    if (fechaDesde || fechaHasta) {
      evaluationWhere.createdAt = {};

      if (fechaDesde) {
        evaluationWhere.createdAt[
          Op.gte
        ] = new Date(
          `${fechaDesde}T00:00:00-05:00`
        );
      }

      if (fechaHasta) {
        evaluationWhere.createdAt[
          Op.lte
        ] = new Date(
          `${fechaHasta}T23:59:59.999-05:00`
        );
      }
    }

    if (userId) {
      userWhere.id = userId;
    }

    if (empresaId) {
      userWhere.empresaId = empresaId;
    }

    if (seccionId) {
      userWhere.seccionId = seccionId;
    }

    if (busqueda) {
      userWhere[Op.or] = [
        {
          firstName: {
            [Op.iLike]:
              `%${busqueda.trim()}%`,
          },
        },
        {
          lastName: {
            [Op.iLike]:
              `%${busqueda.trim()}%`,
          },
        },
        {
          email: {
            [Op.iLike]:
              `%${busqueda.trim()}%`,
          },
        },
        {
          cI: {
            [Op.iLike]:
              `%${busqueda.trim()}%`,
          },
        },
      ];
    }

    if (animal) {
      personalityWhere.animal = animal;
    }

    if (tipoCerebro) {
      personalityWhere.tipoCerebro =
        tipoCerebro;
    }

    if (tipoComunicacion) {
      personalityWhere.tipoComunicacion =
        tipoComunicacion;
    }

    if (
      pagoVerificado !== undefined &&
      pagoVerificado !== ""
    ) {
      paymentWhere.verificado =
        pagoVerificado === "true";
    }

    const currentPage = Math.max(
      Number.parseInt(page, 10) || 1,
      1
    );

    const pageSize = Math.min(
      Math.max(
        Number.parseInt(limit, 10) || 20,
        1
      ),
      100
    );

    const offset =
      (currentPage - 1) * pageSize;

    const hasUserFilter =
      Object.keys(userWhere).length > 0;

    const hasPersonalityFilter =
      Object.keys(
        personalityWhere
      ).length > 0;

    const hasTestFilter =
      Object.keys(testWhere).length > 0;

    const hasCourseFilter =
      Object.keys(courseWhere).length > 0;

    const hasPaymentFilter =
      Object.keys(paymentWhere).length >
      0;

    const result =
      await PsychometricEvaluation
        .findAndCountAll({
          where: evaluationWhere,

          distinct: true,

          limit: pageSize,
          offset,

          include: [
            {
              model: Inscripcion,
              as: "inscripcion",
              required: true,

              include: [
                {
                  model: User,
                  as: "user",

                  where: hasUserFilter
                    ? userWhere
                    : undefined,

                  required: true,

                  include: [
                    {
                      model: Empresa,
                      as: "empresa",
                      required: false,
                    },
                    {
                      model: EmpresaSeccion,
                      as: "empresaSeccion",
                      required: false,
                    },
                  ],
                },
              ],
            },
            {
              model:
                PsychometricPersonality,

              as: "personality",

              where:
                hasPersonalityFilter
                  ? personalityWhere
                  : undefined,

              required:
                hasPersonalityFilter,
            },
            {
              model: PsychometricTest,
              as: "test",

              where: hasTestFilter
                ? testWhere
                : undefined,

              required:
                hasTestFilter ||
                hasCourseFilter,

              include: [
                {
                  model: Course,
                  as: "course",

                  where:
                    hasCourseFilter
                      ? courseWhere
                      : undefined,

                  required:
                    hasCourseFilter,
                },
              ],
            },
            {
              model: Pagos,
              as: "pagos",

              where: hasPaymentFilter
                ? paymentWhere
                : undefined,

              required:
                hasPaymentFilter,
            },
          ],

          order: [
            ["createdAt", "DESC"],
          ],
        });

    const totalPages = Math.ceil(
      result.count / pageSize
    );

    return res.json({
      total: result.count,
      page: currentPage,
      limit: pageSize,
      totalPages,

      data: result.rows.map(
        (evaluation) => {
          const user =
            evaluation.inscripcion?.user;

          const verifiedPayment =
            (evaluation.pagos || []).find(
              (payment) =>
                payment.verificado === true
            ) || null;

          const pendingPayment =
            (evaluation.pagos || []).find(
              (payment) =>
                payment.verificado === false
            ) || null;

          return {
            id: evaluation.id,

            numeroEvaluacion:
              evaluation.numeroEvaluacion,

            estado:
              evaluation.estado,

            fechaHabilitacion:
              evaluation.fechaHabilitacion,

            fechaInicio:
              evaluation.fechaInicio,

            fechaFinalizacion:
              evaluation.fechaFinalizacion,

            puntajeTotal:
              evaluation.puntajeTotal,

            resultadoLiberado:
              evaluation.resultadoLiberado,

            createdAt:
              evaluation.createdAt,

            user: user
              ? {
                  id: user.id,
                  cI: user.cI,
                  email: user.email,

                  nombre: [
                    user.firstName,
                    user.lastName,
                  ]
                    .filter(Boolean)
                    .join(" "),

                  cellular:
                    user.cellular,

                  empresa:
                    user.empresa
                      ? {
                          id:
                            user.empresa.id,

                          nombre:
                            user.empresa
                              .nombreComercial ||
                            user.empresa
                              .razonSocial,
                        }
                      : null,

                  seccion:
                    user.empresaSeccion
                      ? {
                          id:
                            user
                              .empresaSeccion
                              .id,

                          nombre:
                            user
                              .empresaSeccion
                              .nombre,
                        }
                      : null,
                }
              : null,

            course:
              evaluation.test?.course
                ? {
                    id:
                      evaluation.test.course
                        .id,

                    nombre:
                      evaluation.test.course
                        .nombre,

                    sigla:
                      evaluation.test.course
                        .sigla,
                  }
                : null,

            personality:
              evaluation.personality
                ? {
                    id:
                      evaluation.personality
                        .id,

                    numero:
                      evaluation.personality
                        .numero,

                    codigo:
                      evaluation.personality
                        .codigo,

                    nombre:
                      evaluation.personality
                        .nombre,

                    animal:
                      evaluation.personality
                        .animal,

                    colorCabeza:
                      evaluation.personality
                        .colorCabeza,

                    tipoCerebro:
                      evaluation.personality
                        .tipoCerebro,

                    colorPecho:
                      evaluation.personality
                        .colorPecho,

                    tipoComunicacion:
                      evaluation.personality
                        .tipoComunicacion,

                    imagenUrl:
                      evaluation.personality
                        .imagenUrl,
                  }
                : null,

            payment: verifiedPayment
              ? {
                  id:
                    verifiedPayment.id,

                  estado: "verificado",

                  tipoPago:
                    verifiedPayment.tipoPago,

                  valorDepositado:
                    verifiedPayment
                      .valorDepositado,

                  pagoUrl:
                    verifiedPayment.pagoUrl,

                  verificado: true,

                  contificoDocumentoNumero:
                    verifiedPayment
                      .contificoDocumentoNumero,

                  contificoEstado:
                    verifiedPayment
                      .contificoEstado,
                }
              : pendingPayment
                ? {
                    id:
                      pendingPayment.id,

                    estado: "pendiente",

                    tipoPago:
                      pendingPayment.tipoPago,

                    valorDepositado:
                      pendingPayment
                        .valorDepositado,

                    pagoUrl:
                      pendingPayment.pagoUrl,

                    verificado: false,

                    contificoDocumentoNumero:
                      pendingPayment
                        .contificoDocumentoNumero,

                    contificoEstado:
                      pendingPayment
                        .contificoEstado,
                  }
                : null,
          };
        }
      ),
    });
  }
);

/* =========================================================
   RESULTADO PÚBLICO MEDIANTE TOKEN
   GET /psychometric/result/:token
========================================================= */

const getPublicResultByToken = catchError(
  async (req, res) => {
    const { token } = req.params;

    if (!token || !String(token).trim()) {
      return res.status(400).json({
        message:
          "El código de acceso es requerido.",
        code: "TOKEN_REQUIRED",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(String(token).trim())
      .digest("hex");

    const access =
      await PsychometricAccessToken.findOne({
        where: {
          tokenHash,
          purpose: "result",
          activo: true,
        },

        include: [
          {
            model: PsychometricEvaluation,
            as: "evaluation",
            required: true,

            include: [
              {
                model:
                  PsychometricPersonality,

                as: "personality",
                required: false,
              },
              {
                model: PsychometricTest,
                as: "test",
                required: false,

                include: [
                  {
                    model: Course,
                    as: "course",
                    required: false,
                  },
                ],
              },
              {
                model: Inscripcion,
                as: "inscripcion",
                required: true,

                include: [
                  {
                    model: User,
                    as: "user",
                    required: true,

                    include: [
                      {
                        model: Empresa,
                        as: "empresa",
                        required: false,
                      },
                      {
                        model:
                          EmpresaSeccion,

                        as:
                          "empresaSeccion",

                        required: false,
                      },
                    ],
                  },
                ],
              },
              {
                model: Pagos,
                as: "pagos",

                /*
                 * Un token de resultado solo debe abrir
                 * una evaluación con pago verificado.
                 */
                required: true,

                where: {
                  verificado: true,
                  tipoPago:
                    "test_psicometrico",
                },
              },
            ],
          },
        ],
      });

    if (!access) {
      return res.status(404).json({
        message:
          "El enlace del resultado no es válido o no tiene un pago verificado asociado.",

        code:
          "INVALID_RESULT_TOKEN",
      });
    }

    if (
      access.revokedAt ||
      access.activo === false
    ) {
      return res.status(410).json({
        message:
          "El enlace del resultado fue revocado.",

        code:
          "REVOKED_RESULT_TOKEN",
      });
    }

    if (
      !access.expiresAt ||
      new Date(
        access.expiresAt
      ).getTime() < Date.now()
    ) {
      await access.update({
        activo: false,
      });

      return res.status(410).json({
        message:
          "El enlace del resultado ha expirado.",

        code:
          "EXPIRED_RESULT_TOKEN",
      });
    }

    const evaluation = access.evaluation;

    if (!evaluation) {
      return res.status(404).json({
        message:
          "No se encontró la evaluación asociada.",

        code:
          "EVALUATION_NOT_FOUND",
      });
    }

    if (
      evaluation.estado !== "completada"
    ) {
      return res.status(409).json({
        message:
          "La evaluación todavía no ha sido completada.",

        estado:
          evaluation.estado,

        code:
          "EVALUATION_NOT_COMPLETED",
      });
    }

    if (!evaluation.resultadoLiberado) {
      return res.status(403).json({
        message:
          "El resultado está pendiente de validación del pago.",

        paymentRequired: true,

        resultadoLiberado: false,

        code:
          "RESULT_NOT_RELEASED",
      });
    }

    const verifiedPayment =
      (evaluation.pagos || []).find(
        (payment) =>
          payment.verificado === true &&
          payment.tipoPago ===
            "test_psicometrico"
      );

    if (!verifiedPayment) {
      return res.status(403).json({
        message:
          "No se encontró un pago psicométrico verificado para esta evaluación.",

        paymentRequired: true,

        code:
          "VERIFIED_PAYMENT_NOT_FOUND",
      });
    }

    const now = new Date();

    const newAccessCount =
      Number(access.accessCount || 0) + 1;

    await access.update({
      firstUsedAt:
        access.firstUsedAt || now,

      lastUsedAt: now,

      accessCount:
        newAccessCount,
    });

    const user =
      evaluation.inscripcion?.user;

    return res.json({
      message:
        "Resultado psicométrico obtenido correctamente.",

      access: {
        expiresAt:
          access.expiresAt,

        firstUsedAt:
          access.firstUsedAt || now,

        lastUsedAt: now,

        accessCount:
          newAccessCount,
      },

      evaluation: {
        id: evaluation.id,

        numeroEvaluacion:
          evaluation.numeroEvaluacion,

        estado:
          evaluation.estado,

        fechaHabilitacion:
          evaluation.fechaHabilitacion,

        fechaInicio:
          evaluation.fechaInicio,

        fechaFinalizacion:
          evaluation.fechaFinalizacion,

        testVersion:
          evaluation.testVersion,

        puntajeTotal:
          evaluation.puntajeTotal,

        resultadoLiberado:
          evaluation.resultadoLiberado,
      },

      user: user
        ? {
            id: user.id,
            cI: user.cI,
            email: user.email,

            firstName:
              user.firstName,

            lastName:
              user.lastName,

            cellular:
              user.cellular,

            empresa: user.empresa
              ? {
                  id:
                    user.empresa.id,

                  nombre:
                    user.empresa
                      .nombreComercial ||
                    user.empresa
                      .razonSocial,
                }
              : null,

            seccion:
              user.empresaSeccion
                ? {
                    id:
                      user.empresaSeccion.id,

                    nombre:
                      user.empresaSeccion
                        .nombre,
                  }
                : null,
          }
        : null,

      course: evaluation.test?.course
        ? {
            id:
              evaluation.test.course.id,

            nombre:
              evaluation.test.course
                .nombre,

            sigla:
              evaluation.test.course
                .sigla,

            objetivo:
              evaluation.test.course
                .objetivo,
          }
        : null,

      personality:
        evaluation.personality
          ? {
              id:
                evaluation.personality.id,

              numero:
                evaluation.personality
                  .numero,

              codigo:
                evaluation.personality
                  .codigo,

              nombre:
                evaluation.personality
                  .nombre,

              animal:
                evaluation.personality
                  .animal,

              colorCabeza:
                evaluation.personality
                  .colorCabeza,

              tipoCerebro:
                evaluation.personality
                  .tipoCerebro,

              colorPecho:
                evaluation.personality
                  .colorPecho,

              tipoComunicacion:
                evaluation.personality
                  .tipoComunicacion,

              imagenUrl:
                evaluation.personality
                  .imagenUrl,

              descripcion:
                evaluation.personality
                  .descripcion,

              formaPensar:
                evaluation.personality
                  .formaPensar,

              formaAprender:
                evaluation.personality
                  .formaAprender,

              descripcionComunicacion:
                evaluation.personality
                  .descripcionComunicacion,
            }
          : null,

      result:
        evaluation.resultado,

      payment: {
        id: verifiedPayment.id,

        tipoPago:
          verifiedPayment.tipoPago,

        valorDepositado:
          verifiedPayment.valorDepositado,

        verificado:
          verifiedPayment.verificado,

        entidad:
          verifiedPayment.entidad,

        idDeposito:
          verifiedPayment.idDeposito,

        contificoDocumentoId:
          verifiedPayment
            .contificoDocumentoId,

        contificoDocumentoNumero:
          verifiedPayment
            .contificoDocumentoNumero,

        contificoEstado:
          verifiedPayment
            .contificoEstado,

        contificoAutorizacion:
          verifiedPayment
            .contificoAutorizacion,

        contificoUrlRide:
          verifiedPayment
            .contificoUrlRide,

        contificoUrlXml:
          verifiedPayment
            .contificoUrlXml,
      },
    });
  }
);

module.exports = {
  getIndividualResult,
  getUserHistory,
  getAllResults,
  getPublicResultByToken,
};