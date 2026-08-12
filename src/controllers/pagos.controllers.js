const catchError = require("../utils/catchError");
const sendEmail = require("../utils/sendEmail");
const sequelizeM = require("../utils/connectionM");
const crypto = require("crypto");

const PsychometricAccessToken = require(
  "../models/PsychometricAccessToken"
);

const path = require("path");
const fs = require("fs");
const Pagos = require("../models/Pagos");
const Inscripcion = require("../models/Inscripcion");
const Course = require("../models/Course");
const User = require("../models/User");
const Certificado = require("../models/Certificado");
const generarCertificado = require("../utils/generarCertificado");
const PsychometricEvaluation = require(
  "../models/PsychometricEvaluation"
);

const { Op, Sequelize } = require("sequelize");

const TZ = "America/Guayaquil";

const getFechaEcuador = (date) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
};





const getAll = catchError(async (req, res) => {
  const {
    curso,
    cert_emp,
    cert_mdt,
    cert_int,
    verificado,
    moneda,
    distintivo,
    entregado,
    busqueda,
    fechaInicio,
    fechaFin,
    certificado,
    contificoDocumentoId,
    contificoDocumentoNumero,
    contificoEstado,
    contificoFirmado,
    contificoUrlRide,
    contificoUrlXml,
    contificoAutorizacion,
  } = req.query;

  const pagosWhere = {};

  if (curso) pagosWhere.curso = curso;
  if (cert_emp) pagosWhere.cert_emp = cert_emp === "true";
  if (cert_mdt) pagosWhere.cert_mdt = cert_mdt === "true";
  if (cert_int) pagosWhere.cert_int = cert_int === "true";
  if (verificado) pagosWhere.verificado = verificado === "true";
  if (moneda) pagosWhere.moneda = moneda === "true";
  if (distintivo) pagosWhere.distintivo = distintivo === "true";
  if (entregado) pagosWhere.entregado = entregado === "true";

  if (fechaInicio || fechaFin) {
    pagosWhere.createdAt = {};

    if (fechaInicio) {
      pagosWhere.createdAt[Op.gte] = new Date(fechaInicio);
    }

    if (fechaFin) {
      const fin = new Date(fechaFin);
      fin.setDate(fin.getDate() + 2);
      pagosWhere.createdAt[Op.lt] = fin;
    }
  }

  const userWhere = busqueda
    ? {
      [Op.or]: [
        { grado: { [Op.iLike]: `%${busqueda}%` } },
        { firstName: { [Op.iLike]: `%${busqueda}%` } },
        { lastName: { [Op.iLike]: `%${busqueda}%` } },
        { cI: { [Op.iLike]: `%${busqueda}%` } },
      ],
    }
    : undefined;

  let results = await Pagos.findAll({
    where: pagosWhere,
    attributes: [
      "id",

      "tipoPago",
      "psychometricEvaluationId",

      "curso",
      "cert_emp",
      "cert_mdt",
      "cert_int",
      "distintivo",
      "moneda",
      "valorDepositado",
      "porcentajeIva",
      "iva",
      "entidad",
      "idDeposito",
      "pagoUrl",
      "verificado",
      "confirmacion",
      "entregado",
      "observacion",
      "createdAt",
      "inscripcionId",
      "usuarioEdicion",
      "contificoDocumentoId",
      "contificoDocumentoNumero",
      "contificoEstado",
      "contificoFirmado",
      "contificoUrlRide",
      "contificoUrlXml",
      "contificoAutorizacion",
    ],
    include: [
      {
        model: Inscripcion,
        required: true,
        attributes: ["id", "curso", "userId"],
        include: [
          {
            model: User,
            required: true,
            attributes: [
              "grado",
              "firstName",
              "lastName",
              "cI",
              "cellular",
              "email",
            ],
            where: userWhere || undefined,
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  // =========================
  // USUARIOS MOODLE
  // =========================

  const emails = [
    ...new Set(
      results
        .map((pago) => pago.inscripcion?.user?.email?.toLowerCase())
        .filter(Boolean)
    ),
  ];

  let moodleUserMap = {};
  let moodleUserIds = [];

  if (emails.length) {
    const [moodleUsersRes] = await sequelizeM.query(
      `
      SELECT id, LOWER(email) AS email
      FROM mdl_user
      WHERE deleted = 0
        AND suspended = 0
        AND LOWER(email) IN (?)
      `,
      { replacements: [emails] }
    );

    moodleUsersRes.forEach((m) => {
      moodleUserMap[m.email] = m;
    });

    moodleUserIds = moodleUsersRes.map((u) => u.id);
  }

  // =========================
  // CURSOS MATRICULADOS MOODLE
  // =========================

  let enrolMap = {};

  if (moodleUserIds.length) {
    const [enrolRes] = await sequelizeM.query(
      `
      SELECT ue.userid, c.id AS courseid, c.shortname AS curso
      FROM mdl_user_enrolments ue
      JOIN mdl_enrol e ON ue.enrolid = e.id
      JOIN mdl_course c ON e.courseid = c.id
      WHERE ue.userid IN (?)
      `,
      { replacements: [moodleUserIds] }
    );

    enrolRes.forEach((e) => {
      const uid = String(e.userid);
      const cursoKey = String(e.curso || "").toLowerCase();

      if (!enrolMap[uid]) enrolMap[uid] = {};
      enrolMap[uid][cursoKey] = { courseid: e.courseid };
    });
  }

  // =========================
  // NOTAS FINALES MOODLE
  // =========================

  let userCourseGradesMap = {};

  if (moodleUserIds.length) {
    const [finalGradesRes] = await sequelizeM.query(
      `
      SELECT gg.userid, gi.courseid, gg.finalgrade
      FROM mdl_grade_grades gg
      JOIN mdl_grade_items gi ON gg.itemid = gi.id
      WHERE gg.userid IN (?)
        AND gi.itemtype = 'course'
      `,
      { replacements: [moodleUserIds] }
    );

    finalGradesRes.forEach(({ userid, courseid, finalgrade }) => {
      const uid = String(userid);
      const cid = String(courseid);

      if (!userCourseGradesMap[uid]) userCourseGradesMap[uid] = {};
      if (!userCourseGradesMap[uid][cid]) userCourseGradesMap[uid][cid] = {};

      userCourseGradesMap[uid][cid]["Nota Final"] =
        finalgrade !== null && finalgrade !== undefined
          ? Number(finalgrade).toFixed(2)
          : null;
    });
  }

  // =========================
  // TIEMPO DE ACTIVIDAD EN CURSO MOODLE
  // =========================

  let userCourseTimeMap = {};

  if (moodleUserIds.length) {
    const [activityRes] = await sequelizeM.query(
      `
      SELECT 
        userid,
        courseid,
        timecreated
      FROM mdl_logstore_standard_log
      WHERE userid IN (?)
        AND courseid IS NOT NULL
        AND courseid > 1
      ORDER BY userid, courseid, timecreated
      `,
      { replacements: [moodleUserIds] }
    );

    const SESSION_LIMIT_SECONDS = 30 * 60;

    activityRes.forEach((row) => {
      const uid = String(row.userid);
      const cid = String(row.courseid);

      if (!userCourseTimeMap[uid]) userCourseTimeMap[uid] = {};
      if (!userCourseTimeMap[uid][cid]) {
        userCourseTimeMap[uid][cid] = {
          totalSeconds: 0,
          lastTime: null,
        };
      }

      const currentTime = Number(row.timecreated);
      const lastTime = userCourseTimeMap[uid][cid].lastTime;

      if (lastTime) {
        const diff = currentTime - lastTime;

        if (diff > 0 && diff <= SESSION_LIMIT_SECONDS) {
          userCourseTimeMap[uid][cid].totalSeconds += diff;
        }
      }

      userCourseTimeMap[uid][cid].lastTime = currentTime;
    });
  }

  // =========================
  // TIEMPO DE ZOOM POR CURSO MOODLE
  // =========================

  let userCourseZoomTimeMap = {};

  if (moodleUserIds.length) {
    const [zoomRes] = await sequelizeM.query(
      `
      SELECT 
        zmp.userid,
        z.course AS courseid,
        SUM(COALESCE(zmp.duration, 0)) AS total_minutes
      FROM mdl_zoom_meeting_participants zmp
      JOIN mdl_zoom_meeting_details zmd ON zmp.detailsid = zmd.id
      JOIN mdl_zoom z ON zmd.zoomid = z.id
      WHERE zmp.userid IN (?)
      GROUP BY zmp.userid, z.course
      `,
      { replacements: [moodleUserIds] }
    );

    zoomRes.forEach((row) => {
      const uid = String(row.userid);
      const cid = String(row.courseid);

      if (!userCourseZoomTimeMap[uid]) userCourseZoomTimeMap[uid] = {};

      userCourseZoomTimeMap[uid][cid] = {
        totalMinutes: Number(row.total_minutes || 0),
      };
    });
  }

  // =========================
  // CERTIFICADOS
  // =========================

  const certificados = await Certificado.findAll({
    attributes: ["id", "inscripcionId", "url", "tipo"],
    raw: true,
  });

  // =========================
  // MAPEAR RESULTADOS
  // =========================

  results = results.map((pago) => {
    const inscripcion = pago.inscripcion;
    const user = inscripcion.user;

    const emailKey = String(user.email || "").toLowerCase();
    const moodleUser = moodleUserMap[emailKey];

    const cursoKey = String(inscripcion.curso || pago.curso || "").toLowerCase();

    const enrolData =
      moodleUser && enrolMap[String(moodleUser.id)]?.[cursoKey]
        ? enrolMap[String(moodleUser.id)][cursoKey]
        : null;

    const gradesObj =
      enrolData && userCourseGradesMap[String(moodleUser?.id)]
        ? userCourseGradesMap[String(moodleUser.id)][String(enrolData.courseid)] || {}
        : {};

    const notaFinal = gradesObj["Nota Final"] || null;

    const activityData =
      enrolData && userCourseTimeMap[String(moodleUser?.id)]
        ? userCourseTimeMap[String(moodleUser.id)][String(enrolData.courseid)]
        : null;

    const tiempoActividadSegundos = Number(activityData?.totalSeconds || 0);

    const actividadHoras = Math.floor(tiempoActividadSegundos / 3600);
    const actividadMinutos = Math.floor((tiempoActividadSegundos % 3600) / 60);
    const actividadSegundos = tiempoActividadSegundos % 60;

    const tiempoActividadMinutos = Math.floor(tiempoActividadSegundos / 60);

    const tiempoActividadCurso = `${String(actividadHoras).padStart(2, "0")}:${String(
      actividadMinutos
    ).padStart(2, "0")}:${String(actividadSegundos).padStart(2, "0")}`;




    const zoomData =
      enrolData && userCourseZoomTimeMap[String(moodleUser?.id)]
        ? userCourseZoomTimeMap[String(moodleUser.id)][String(enrolData.courseid)]
        : null;

    // ======================
    // ZOOM (Zoom entrega SEGUNDOS)
    // ======================
    const tiempoZoomSegundos = Number(zoomData?.totalMinutes || 0);

    const zoomHoras = Math.floor(tiempoZoomSegundos / 3600);
    const zoomMinutos = Math.floor((tiempoZoomSegundos % 3600) / 60);
    const zoomSegundos = tiempoZoomSegundos % 60;

    const tiempoZoomMinutos = Math.floor(tiempoZoomSegundos / 60);

    const tiempoZoomCurso = `${String(zoomHoras).padStart(2, "0")}:${String(
      zoomMinutos
    ).padStart(2, "0")}:${String(zoomSegundos).padStart(2, "0")}`;

    // ======================
    // TOTAL
    // ======================
    const tiempoTotalSegundos =
      tiempoActividadSegundos + tiempoZoomSegundos;

    const tiempoTotalMinutos = Math.floor(tiempoTotalSegundos / 60);

    const totalHoras = Math.floor(tiempoTotalSegundos / 3600);
    const totalMinutos = Math.floor((tiempoTotalSegundos % 3600) / 60);
    const totalSegundos = tiempoTotalSegundos % 60;

    const tiempoTotalCurso = `${String(totalHoras).padStart(2, "0")}:${String(
      totalMinutos
    ).padStart(2, "0")}:${String(totalSegundos).padStart(2, "0")}`;

    const certEmp =
      pago.cert_emp === true || pago.cert_emp === "true"
        ? certificados.find(
          (c) =>
            c.inscripcionId === inscripcion.id &&
            c.tipo === "cert_emp"
        ) || null
        : null;

    const certMdt =
      pago.cert_mdt === true || pago.cert_mdt === "true"
        ? certificados.find(
          (c) =>
            c.inscripcionId === inscripcion.id &&
            c.tipo === "cert_mdt"
        ) || null
        : null;

    const certInt =
      pago.cert_int === true || pago.cert_int === "true"
        ? certificados.find(
          (c) =>
            c.inscripcionId === inscripcion.id &&
            c.tipo === "cert_int"
        ) || null
        : null;

    return {
      ...pago.toJSON(),

      notaFinal,

      tiempoActividadSegundos,
      tiempoActividadMinutos,
      tiempoActividadCurso,

      tiempoZoomMinutos,
      tiempoZoomCurso,

      tiempoTotalMinutos,
      tiempoTotalCurso,

      certificadoEmp: !!certEmp,
      certificadoMdt: !!certMdt,
      certificadoInt: !!certInt,

      urlCertificadoEmp: certEmp ? certEmp.url : null,
      urlCertificadoMdt: certMdt ? certMdt.url : null,
      urlCertificadoInt: certInt ? certInt.url : null,
    };
  });

  if (certificado === "true") {
    results = results.filter(
      (p) => p.certificadoEmp || p.certificadoMdt || p.certificadoInt
    );
  }

  if (certificado === "false") {
    results = results.filter(
      (p) => !p.certificadoEmp && !p.certificadoMdt && !p.certificadoInt
    );
  }

  return res.json(results);
});






const getDashboardPagos = catchError(async (req, res) => {
  const { desde, hasta, curso, verificado } = req.query;

  // Filtro de fechas en Pagos
  const where = { confirmacion: true };
  if (desde || hasta) {
    where.createdAt = {};
    if (desde) where.createdAt[Op.gte] = new Date(`${desde}T00:00:00-05:00`);
    if (hasta) {
      where.createdAt[Op.lt] = new Date(`${hasta}T23:59:59.999-05:00`);
    }
  }

  // Filtro por verificación
  if (verificado === "verificados") where.verificado = true;
  if (verificado === "no_verificados") where.verificado = false;

  // Filtro por curso
  if (curso && curso !== "todos") where.curso = curso;

  // Traemos los pagos filtrados con relaciones
  const pagos = await Pagos.findAll({
    where,
    order: [["createdAt", "ASC"]],
    include: [
      {
        model: Inscripcion,
        include: [
          {
            model: User,
            attributes: ["grado"], // aquí está el grado
          },
        ],
      },
    ],
  });

  // Conteo monedas y distintivos
  const countMonedas = pagos.filter((p) => p.moneda).length;
  const countDistintivos = pagos.filter((p) => p.distintivo).length;

  const totalMonedas = countMonedas * 15;
  const totalDistintivos = countDistintivos * 10;
  const totalConceptos = totalMonedas + totalDistintivos;

  const totalPagos = pagos.reduce(
    (acc, p) => acc + Number(p.valorDepositado || 0),
    0
  );
  const totalPagosNum = pagos.length;
  const pagosUnicosPorCurso = new Set(
    pagos.map((p) => `${p.inscripcionId}-${p.curso}`),
  );

  // Conteo de pagos únicos (uno por curso por inscrito)
  const totalPagosDinstint = pagosUnicosPorCurso.size;
  const totalPagosVerificados = pagos.filter((p) => p.verificado).length;

  const conteoDistMoneda = [
    {
      name: "Distintivo",
      value: countDistintivos,
      entregado: pagos.filter((p) => p.distintivo && p.entregado).length,
    },
    {
      name: "Moneda",
      value: countMonedas,
      entregado: pagos.filter((p) => p.moneda && p.entregado).length,
    },
  ];

  // Evolutivo diario
  // Evolutivo diario con zona horaria Ecuador
  const pagosPorFechaMap = {};

  pagos.forEach((p) => {
    const fechaStr = getFechaEcuador(p.createdAt);

    pagosPorFechaMap[fechaStr] =
      (pagosPorFechaMap[fechaStr] || 0) + Number(p.valorDepositado || 0);
  });

  const pagosPorFecha = Object.entries(pagosPorFechaMap)
    .map(([fecha, total]) => ({ fecha, total }))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // Pagos por curso
  const pagosPorCursoCount = {};
  pagos.forEach((p) => {
    const c = p.curso || "Sin curso";
    pagosPorCursoCount[c] = (pagosPorCursoCount[c] || 0) + 1;
  });
  const pagosPorCurso = Object.entries(pagosPorCursoCount).map(
    ([curso, cantidad]) => ({ curso, cantidad }),
  );

  // Pagos por grado (desde la relación con inscripcion.user.grado)
  const pagosPorGradoCount = {};
  pagos.forEach((p) => {
    const grado = p.inscripcion?.user?.grado || "Sin grado";
    pagosPorGradoCount[grado] = (pagosPorGradoCount[grado] || 0) + 1;
  });
  const pagosPorGrado = Object.entries(pagosPorGradoCount).map(
    ([grado, cantidad]) => ({ grado, cantidad }),
  );

  return res.json({
    totalPagos,
    totalPagosNum,
    totalPagosDinstint,
    totalPagosVerificados,
    totalConceptos,
    totalMonedas,
    totalDistintivos,
    conteoDistMoneda,
    pagosPorFecha,
    pagosPorCurso,
    pagosPorGrado,
  });
});

const validatePago = catchError(async (req, res) => {
  const { cedula, code } = req.body;

  if (!cedula || !code) {
    return res.status(400).json({ error: "Faltan parámetros (cedula y code)" });
  }

  // Buscar usuario por cédula
  const user = await User.findOne({ where: { cI: cedula } });
  if (!user) {
    return res.status(200).json({
      exists: false,
      pagos: [],
      inscripcion: null,
      message: "⚠️ No existe registros con esa cédula",
    });
  }

  // Buscar inscripción del usuario en el curso específico
  const inscripcion = await Inscripcion.findOne({
    where: { userId: user.id, curso: code },
  });

  if (!inscripcion) {
    return res.status(200).json({
      exists: false,
      pagos: [],
      inscripcion: null,
      message: `⚠️ No existe inscripción de la cédula ${cedula} en este curso`,
    });
  }

  // Buscar pagos de esa inscripción
  const pagos = await Pagos.findAll({
    where: { inscripcionId: inscripcion.id },
    order: [["createdAt", "DESC"]],
  });

  if (pagos.length > 0) {
    return res.status(200).json({
      exists: true,
      pagos,
      inscripcion,
      user,
      message: "✅ Inscripción encontrada con pagos registrados",
    });
  }

  return res.status(200).json({
    exists: true,
    pagos: [],
    inscripcion,
    user,
    message: "✅ Inscripción encontrada, aún no tiene pagos",
  });
});




const create = catchError(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Debes subir un archivo.",
    });
  }

  const {
    inscripcionId,
    curso,
    cert_emp,
    cert_mdt,
    cert_int,
    valorDepositado,
    confirmacion,
    verificado,
    distintivo,
    moneda,
    entregado,
    observacion,
    usuarioEdicion,

    psychometricEvaluationId,
    tipoPago,
  } = req.body;

  const url = req.fileUrl;

  /* =========================================
     VALIDACIONES GENERALES
  ========================================= */

  if (!inscripcionId) {
    return res.status(400).json({
      message: "El identificador de la inscripción es requerido.",
    });
  }

  if (
    valorDepositado === undefined ||
    valorDepositado === null ||
    valorDepositado === ""
  ) {
    return res.status(400).json({
      message: "El valor depositado es requerido.",
    });
  }

  const valorDepositadoFinal = Number(valorDepositado);

  if (
    Number.isNaN(valorDepositadoFinal) ||
    valorDepositadoFinal <= 0
  ) {
    return res.status(400).json({
      message: "El valor depositado no es válido.",
    });
  }

  /* =========================================
     BUSCAR INSCRIPCIÓN, USUARIO Y CURSO
  ========================================= */

  const inscrito = await Inscripcion.findByPk(
    inscripcionId
  );

  if (!inscrito) {
    return res.status(404).json({
      message: "La inscripción no existe.",
    });
  }

  const user = await User.findByPk(
    inscrito.userId
  );

  if (!user) {
    return res.status(404).json({
      message:
        "No se encontró el usuario asociado a la inscripción.",
    });
  }

  const cursoData = inscrito.courseId
    ? await Course.findByPk(
      inscrito.courseId
    )
    : null;

  if (!cursoData) {
    return res.status(404).json({
      message:
        "No se encontró el curso asociado a la inscripción.",
    });
  }

  /* =========================================
     VALIDAR PAGO PSICOMÉTRICO
  ========================================= */

  let evaluation = null;

  if (psychometricEvaluationId) {
    evaluation =
      await PsychometricEvaluation.findByPk(
        psychometricEvaluationId
      );

    if (!evaluation) {
      return res.status(404).json({
        message:
          "La evaluación psicométrica no existe.",
      });
    }

    if (
      String(evaluation.inscripcionId) !==
      String(inscripcionId)
    ) {
      return res.status(400).json({
        message:
          "La evaluación psicométrica no pertenece a la inscripción indicada.",
      });
    }

    if (
      evaluation.estado !== "completada"
    ) {
      return res.status(409).json({
        message:
          "La evaluación debe estar completada antes de registrar el pago.",
        estadoEvaluacion:
          evaluation.estado,
      });
    }

    const verifiedPayment =
      await Pagos.findOne({
        where: {
          psychometricEvaluationId:
            evaluation.id,
          verificado: true,
        },
      });

    if (verifiedPayment) {
      return res.status(409).json({
        message:
          "Esta evaluación ya tiene un pago verificado.",
        pagoId: verifiedPayment.id,
      });
    }
  }

  /* =========================================
     DETERMINAR TIPO DE PAGO
  ========================================= */

  const tipoPagoFinal =
    psychometricEvaluationId
      ? "test_psicometrico"
      : "curso";

  /*
   * No confiamos directamente en tipoPago enviado
   * por el frontend. Se calcula desde la evaluación.
   */
  if (
    tipoPago &&
    tipoPago !== tipoPagoFinal
  ) {
    return res.status(400).json({
      message:
        "El tipo de pago no corresponde con los datos enviados.",
    });
  }

  const cursoFinal =
    curso ||
    cursoData.sigla ||
    inscrito.curso;

  if (!cursoFinal) {
    return res.status(400).json({
      message:
        "No se pudo determinar el curso del pago.",
    });
  }

  /* =========================================
     CREAR PAGO
  ========================================= */

  const result = await Pagos.create({
    inscripcionId,

    psychometricEvaluationId:
      evaluation?.id || null,

    tipoPago: tipoPagoFinal,

    curso: cursoFinal,

    cert_emp:
      tipoPagoFinal === "curso"
        ? cert_emp || null
        : null,

    cert_mdt:
      tipoPagoFinal === "curso"
        ? cert_mdt || null
        : null,

    cert_int:
      tipoPagoFinal === "curso"
        ? cert_int || null
        : null,

    valorDepositado:
      valorDepositadoFinal,

    confirmacion:
      confirmacion === true ||
      confirmacion === "true" ||
      confirmacion === 1 ||
      confirmacion === "1",

    verificado:
      verificado === true ||
      verificado === "true" ||
      verificado === 1 ||
      verificado === "1",

    distintivo:
      tipoPagoFinal === "curso" &&
      (
        distintivo === true ||
        distintivo === "true" ||
        distintivo === 1 ||
        distintivo === "1"
      ),

    moneda:
      tipoPagoFinal === "curso" &&
      (
        moneda === true ||
        moneda === "true" ||
        moneda === 1 ||
        moneda === "1"
      ),

    entregado:
      entregado === true ||
      entregado === "true" ||
      entregado === 1 ||
      entregado === "1",

    observacion:
      observacion || null,

    usuarioEdicion:
      usuarioEdicion || null,

    pagoUrl: url,
  });

  /* =========================================
     PREPARAR CONTENIDO DEL CORREO
  ========================================= */

  const incluyeMoneda =
    result.moneda === true;

  const incluyeDistintivo =
    result.distintivo === true;

  const certificados = [];

  if (
    tipoPagoFinal === "curso" &&
    (
      cert_emp === true ||
      cert_emp === "true"
    )
  ) {
    certificados.push(
      "Certificado Empresarial iDr.Mind."
    );
  }

  if (
    tipoPagoFinal === "curso" &&
    (
      cert_mdt === true ||
      cert_mdt === "true"
    )
  ) {
    certificados.push(
      "Certificado por el Ministerio de Trabajo"
    );
  }

  if (
    tipoPagoFinal === "curso" &&
    (
      cert_int === true ||
      cert_int === "true"
    )
  ) {
    certificados.push(
      "Certificado Internacional"
    );
  }

  const nombreServicio =
    tipoPagoFinal === "test_psicometrico"
      ? cursoData.nombre ||
      "Test Psicotécnico"
      : cursoData.nombre;

  const detallePago =
    tipoPagoFinal === "test_psicometrico"
      ? `Pago correspondiente a la evaluación psicométrica número ${evaluation.numeroEvaluacion}.`
      : certificados.length > 0
        ? `Pago por: ${certificados.join(", ")}`
        : "Pago registrado.";

  const mensajePosterior =
    tipoPagoFinal === "test_psicometrico"
      ? `
        Una vez validado el pago, tu informe de resultados
        psicométricos será habilitado por iDr.Mind.
      `
      : `
        Una vez validado el pago, se emitirá tu certificado.
        En caso de haber solicitado reconocimientos físicos,
        recibirás otro correo cuando estén disponibles para
        su retiro.
      `;

  /* =========================================
     ENVIAR CORREO
  ========================================= */

  let emailSent = true;

  try {
    await sendEmail({
      to: user.email,

      subject:
        tipoPagoFinal ===
          "test_psicometrico"
          ? "✅ Pago registrado - Test Psicotécnico iDr.Mind"
          : "✅ Pago registrado - iDr.Mind",

      html: `
        <div style="
          font-family:Arial,sans-serif;
          background-color:#f0f8ff;
          padding:20px;
          color:#333;
        ">
          <div style="
            max-width:600px;
            margin:0 auto;
            background-color:#ffffff;
            border-radius:10px;
            box-shadow:0 2px 10px rgba(0,0,0,.1);
            overflow:hidden;
          ">

            <div style="
              text-align:center;
              background:linear-gradient(
                135deg,
                #0a2540,
                #174a8c
              );
              padding:25px;
            ">
              <img
                src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1760413741/1_qvykyo.png"
                alt="iDr.Mind"
                style="width:160px;"
              />
            </div>

            <div style="
              padding:30px;
              text-align:center;
            ">
              <h2 style="color:#1B326B;">
                ¡Hola ${user.firstName || ""}
                ${user.lastName || ""}!
              </h2>

              <p style="
                font-size:16px;
                line-height:1.6;
              ">
                Hemos recibido tu comprobante de pago por:
                <strong>
                  "${nombreServicio}"
                </strong>.
              </p>

              <div style="
                margin:22px 0;
                padding:16px;
                border-radius:10px;
                background:#eef6ff;
              ">
                <p style="
                  margin:0 0 8px;
                  font-size:16px;
                  line-height:1.6;
                ">
                  <strong>${detallePago}</strong>
                </p>

                <p style="
                  margin:0;
                  font-size:16px;
                  line-height:1.6;
                ">
                  <strong>
                    Valor depositado:
                  </strong>
                  $${valorDepositadoFinal.toFixed(2)}
                </p>
              </div>

              ${incluyeMoneda ||
          incluyeDistintivo
          ? `
                    <p style="
                      font-size:16px;
                      line-height:1.6;
                    ">
                      Incluye:
                      ${[
            incluyeMoneda
              ? "🪙 Moneda conmemorativa"
              : "",

            incluyeDistintivo
              ? "🎖️ Distintivo"
              : "",
          ]
            .filter(Boolean)
            .join(" y ")}
                    </p>
                  `
          : ""
        }

              <p style="
                font-size:16px;
                line-height:1.6;
              ">
                ${mensajePosterior}
              </p>

              <div style="margin-top:30px;">
                <a
                  href="${url}"
                  target="_blank"
                  rel="noopener"
                  style="
                    background-color:#1B326B;
                    color:white;
                    padding:12px 20px;
                    border-radius:5px;
                    text-decoration:none;
                    display:inline-block;
                  "
                >
                  Ver comprobante de pago
                </a>
              </div>

              <p style="
                margin-top:30px;
                font-size:14px;
                color:#666;
              ">
                Si no realizaste este registro de pago,
                comunícate con nosotros.
              </p>
            </div>

            <div style="
              background-color:#f0f0f0;
              text-align:center;
              padding:15px;
              font-size:12px;
              color:#999;
            ">
              © ${new Date().getFullYear()}
              iDr.Mind. Todos los derechos reservados.
            </div>
          </div>
        </div>
      `,
    });
  } catch (emailError) {
    emailSent = false;

    console.error(
      "No se pudo enviar el correo de pago:",
      emailError
    );
  }

  /* =========================================
     SOCKET
  ========================================= */

  const io = req.app.get("io");

  if (io) {
    io.emit("pagoCreado", result);
  }

  return res.status(201).json({
    message: emailSent
      ? "Pago registrado correctamente. Se envió la confirmación al correo."
      : "Pago registrado correctamente, pero no se pudo enviar el correo.",

    emailSent,
    payment: result,
  });
});






const getOne = catchError(async (req, res) => {
  const { id } = req.params;
  const result = await Pagos.findByPk(id);
  if (!result) return res.sendStatus(404);
  return res.json(result);
});

const remove = catchError(async (req, res) => {
  const { id } = req.params;
  const Pago = await Pagos.findByPk(id);
  if (!Pago) return res.status(400).json({ message: "No existe el ID" });

  if (Pago.pagoUrl) {
    const imagePath = path.join(
      __dirname,
      "..",
      "..",
      "uploads",
      "pagos",
      path.basename(Pago.pagoUrl),
    );

    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error("Error al eliminar el archivo:", err);
        return res
          .status(500)
          .json({ message: "Error al eliminar el archivo" });
      }
    });
  }
  await Pago.destroy();

  return res.sendStatus(204);
});


/* =========================================================
   GENERAR TOKEN DE RESULTADO
========================================================= */

const createPsychometricResultAccess = async (
  evaluationId
) => {
  /*
   * Desactiva enlaces anteriores de resultado
   * para esta evaluación.
   */
  await PsychometricAccessToken.update(
    {
      activo: false,
      revokedAt: new Date(),
    },
    {
      where: {
        evaluationId,
        purpose: "result",
        activo: true,
      },
    }
  );

  const token = crypto
    .randomBytes(32)
    .toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const resultTokenHours = Number(
    process.env.PSYCHOMETRIC_RESULT_TOKEN_HOURS ||
    720
  );

  const expiresAt = new Date(
    Date.now() +
    resultTokenHours *
    60 *
    60 *
    1000
  );

  await PsychometricAccessToken.create({
    evaluationId,
    tokenHash,
    purpose: "result",
    expiresAt,
    activo: true,
  });

  return {
    token,
    expiresAt,
  };
};


/* =========================================================
   ENVIAR CORREO DE RESULTADO LIBERADO
========================================================= */

const sendPsychometricResultEmail = async ({
  user,
  course,
  evaluation,
  token,
  expiresAt,
}) => {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    "https://idrmind.com";

  const resultUrl =
    `${frontendUrl}/#/resultado-psicometrico/${token}`;

  const expirationDate =
    expiresAt.toLocaleString("es-EC", {
      timeZone: "America/Guayaquil",
      dateStyle: "long",
      timeStyle: "short",
    });

  await sendEmail({
    to: user.email,

    subject:
      "Tu resultado psicométrico está disponible - iDr.Mind",

    html: `
      <div style="
        margin:0;
        padding:30px 15px;
        background:#f1f5f9;
        font-family:Arial,sans-serif;
        color:#101828;
      ">
        <div style="
          max-width:640px;
          margin:0 auto;
          background:#ffffff;
          border-radius:18px;
          overflow:hidden;
          box-shadow:0 18px 45px rgba(7,27,63,.16);
        ">
          <div style="
            padding:28px;
            text-align:center;
            background:linear-gradient(
              135deg,
              #071b3f,
              #173a8a
            );
          ">
            <img
              src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1760413741/1_qvykyo.png"
              alt="iDr.Mind"
              style="width:165px;max-width:100%;"
            />
          </div>

          <div style="padding:34px;">
            <h1 style="
              margin:0 0 18px;
              color:#071b3f;
              font-size:27px;
            ">
              ¡Hola ${user.firstName || ""}
              ${user.lastName || ""}!
            </h1>

            <p style="
              font-size:16px;
              line-height:1.7;
              color:#475467;
            ">
              Tu pago fue validado correctamente y
              tu informe de resultados de
              <strong>${course.nombre}</strong>
              ya se encuentra disponible.
            </p>

            <div style="
              margin:25px 0;
              padding:18px;
              border-radius:12px;
              background:#eef6ff;
              border-left:5px solid #28a7e8;
            ">
              <p style="
                margin:0;
                color:#344054;
                line-height:1.6;
              ">
                Evaluación número:
                <strong>
                  ${evaluation.numeroEvaluacion}
                </strong>
              </p>

              <p style="
                margin:6px 0 0;
                color:#344054;
                line-height:1.6;
              ">
                Enlace válido hasta:
                <strong>${expirationDate}</strong>
              </p>
            </div>

            <div style="
              text-align:center;
              margin:30px 0;
            ">
              <a
                href="${resultUrl}"
                style="
                  display:inline-block;
                  padding:15px 30px;
                  border-radius:12px;
                  background:linear-gradient(
                    135deg,
                    #173a8a,
                    #071b3f
                  );
                  color:#ffffff;
                  text-decoration:none;
                  font-size:16px;
                  font-weight:bold;
                "
              >
                Consultar mi resultado
              </a>
            </div>

            <p style="
              font-size:14px;
              color:#667085;
              line-height:1.6;
            ">
              Este enlace es personal. No lo compartas
              con otras personas.
            </p>
          </div>

          <div style="
            padding:18px;
            background:#f8fafc;
            text-align:center;
            color:#98a2b3;
            font-size:12px;
          ">
            © ${new Date().getFullYear()}
            iDr.Mind. Todos los derechos reservados.
          </div>
        </div>
      </div>
    `,
  });

  return resultUrl;
};


const update = catchError(async (req, res) => {
  const { id } = req.params;

  /* =========================================================
     1. BUSCAR PAGO ANTES DE ACTUALIZAR
  ========================================================= */

  const pagoOriginal = await Pagos.findByPk(id);

  if (!pagoOriginal) {
    return res.status(404).json({
      message: "Pago no encontrado.",
    });
  }

  /* =========================================================
     2. VALIDAR ENTIDAD + ID DEPÓSITO ÚNICOS
  ========================================================= */

  const entidadFinal =
    req.body.entidad !== undefined
      ? req.body.entidad
      : pagoOriginal.entidad;

  const idDepositoFinal =
    req.body.idDeposito !== undefined
      ? req.body.idDeposito
      : pagoOriginal.idDeposito;

  const entidadNormalizada =
    entidadFinal !== undefined &&
      entidadFinal !== null
      ? String(entidadFinal).trim()
      : "";

  const idDepositoNormalizado =
    idDepositoFinal !== undefined &&
      idDepositoFinal !== null
      ? String(idDepositoFinal).trim()
      : "";

  if (
    entidadNormalizada &&
    idDepositoNormalizado
  ) {
    const existe =
      await Pagos.findOne({
        where: {
          entidad:
            entidadNormalizada,

          idDeposito:
            idDepositoNormalizado,

          id: {
            [Op.ne]: id,
          },
        },
      });

    if (existe) {
      return res.status(400).json({
        message:
          "Ya existe un pago registrado con ese ID de depósito para la entidad seleccionada.",
      });
    }
  }

  /* =========================================================
     3. PREPARAR DATOS A ACTUALIZAR
  ========================================================= */

  const updateData = {
    ...req.body,
  };

  /*
   * Normalizamos estos dos valores si vienen
   * dentro del request.
   */
  if (
    req.body.entidad !== undefined
  ) {
    updateData.entidad =
      entidadNormalizada || null;
  }

  if (
    req.body.idDeposito !==
    undefined
  ) {
    updateData.idDeposito =
      idDepositoNormalizado ||
      null;
  }

  /* =========================================================
     4. NO PERMITIR CAMBIAR DATOS ESTRUCTURALES
     DEL PAGO DESDE ESTE UPDATE
  ========================================================= */

  delete updateData.id;

  delete updateData.inscripcionId;

  delete updateData.psychometricEvaluationId;

  delete updateData.tipoPago;

  delete updateData.createdAt;

  delete updateData.updatedAt;

  /*
   * Esto evita que desde el front administrativo
   * puedan cambiar accidentalmente la relación
   * del pago con otra inscripción/evaluación.
   */

  /* =========================================================
     5. ACTUALIZAR PAGO
  ========================================================= */

  let pagoActualizado;

  try {
    const [
      rowsUpdated,
      updated,
    ] = await Pagos.update(
      updateData,
      {
        where: {
          id,
        },

        returning: true,
      }
    );

    if (rowsUpdated === 0) {
      return res.status(404).json({
        message:
          "Pago no encontrado.",
      });
    }

    pagoActualizado =
      updated[0];
  } catch (error) {
    /*
     * Protección adicional si existe un
     * índice UNIQUE en PostgreSQL.
     */
    if (
      error?.name ===
      "SequelizeUniqueConstraintError"
    ) {
      return res.status(400).json({
        message:
          "Ya existe un pago registrado con ese ID de depósito para la entidad seleccionada.",
      });
    }

    throw error;
  }

  /* =========================================================
     6. DETECTAR CAMBIO DE VERIFICACIÓN
  ========================================================= */

  const verificadoAntes =
    Boolean(
      pagoOriginal.verificado
    );

  const verificadoDespues =
    Boolean(
      pagoActualizado.verificado
    );

  const pagoFueValidadoAhora =
    !verificadoAntes &&
    verificadoDespues;

  const pagoFueDesvalidadoAhora =
    verificadoAntes &&
    !verificadoDespues;

  /* =========================================================
     7. SOCKET
  ========================================================= */

  const io =
    req.app.get("io");

  if (io) {
    io.emit(
      "pagoActualizado",
      pagoActualizado
    );
  }

  /* =========================================================
     8. RESPUESTA
  ========================================================= */

  let message =
    "Pago actualizado correctamente.";

  if (pagoFueValidadoAhora) {
    if (
      pagoActualizado.tipoPago ===
      "test_psicometrico" &&
      pagoActualizado
        .psychometricEvaluationId
    ) {
      message =
        "Pago psicométrico validado correctamente. Ya puede generar el resultado.";
    } else {
      message =
        "Pago validado correctamente.";
    }
  }

  if (pagoFueDesvalidadoAhora) {
    message =
      "La validación del pago fue retirada correctamente.";
  }

  return res.json({
    ...pagoActualizado.toJSON(),

    message,

    paymentStatus: {
      verificado:
        pagoActualizado.verificado,

      validatedNow:
        pagoFueValidadoAhora,

      unvalidatedNow:
        pagoFueDesvalidadoAhora,

      isPsychometric:
        pagoActualizado.tipoPago ===
        "test_psicometrico" &&
        Boolean(
          pagoActualizado
            .psychometricEvaluationId
        ),

      canGeneratePsychometricResult:
        pagoActualizado.verificado ===
        true &&
        pagoActualizado.tipoPago ===
        "test_psicometrico" &&
        Boolean(
          pagoActualizado
            .psychometricEvaluationId
        ),
    },
  });
});





const certificado = catchError(async (req, res) => {
  const { id } = req.params;

  const pago = await Pagos.findByPk(id);
  if (!pago) {
    return res.status(404).json({ message: "Pago no encontrado" });
  }

  if (!pago.verificado) {
    return res.status(400).json({
      message: "El pago debe estar verificado para generar el certificado.",
    });
  }

  const inscripcion = await Inscripcion.findByPk(pago.inscripcionId);
  if (!inscripcion) {
    return res.status(400).json({
      message: "No se encontró la inscripción asociada al pago.",
    });
  }

  const user = await User.findByPk(inscripcion.userId);
  if (!user) {
    return res.status(400).json({
      message: "No se encontró el usuario asociado a la inscripción.",
    });
  }

  const curso = inscripcion.courseId
    ? await Course.findByPk(inscripcion.courseId)
    : null;

  const siglaCurso = String(curso?.sigla || inscripcion.curso || pago.curso)
    .trim()
    .toLowerCase();

  const tipoCertificado = String(req.body.tipo || "cert_emp")
    .trim()
    .toLowerCase();

  const certYaExiste = await Certificado.findOne({
    where: {
      inscripcionId: inscripcion.id,
      curso: siglaCurso,
      tipo: tipoCertificado,
    },
  });

  if (certYaExiste) {
    return res.status(400).json({
      message: `El certificado ya fue emitido para este curso.`,
      certificado: certYaExiste,
      url: certYaExiste.url,
    });
  }

  try {
    const resultado = await generarCertificado(id);

    const { fileName, dataCertificado } = resultado;
    const { inscripcionId, cursoSigla, grupo } = dataCertificado;

    const siglaUrl = String(cursoSigla).trim().toLowerCase();
    const relativeUrl = `/uploads/certificados/${siglaUrl}/${fileName}`;
    const host = `${req.protocol}://${req.get("host")}`;
    const absoluteUrl = `${host}${relativeUrl}`;

    let certExistente = await Certificado.findOne({
      where: {
        inscripcionId,
        curso: cursoSigla,
      },
    });

    if (certExistente) {
      certExistente.url = absoluteUrl;
      certExistente.entregado = true;
      certExistente.grupo = grupo || null;
      await certExistente.save();
    } else {
      certExistente = await Certificado.create({
        inscripcionId,
        curso: cursoSigla,
        grupo: grupo || null,
        url: absoluteUrl,
        entregado: true,
        tipo: "cert_emp",
      });
    }

    await sendEmail({
      to: user.email,
      subject: "🎓 Tu certificado está listo - iDr.Mind",
      html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); overflow: hidden;">
          
          <div style="text-align: center; background: linear-gradient(135deg, #0a2540, #174a8c); padding: 25px;">
            <img src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1760413741/1_qvykyo.png" alt="iDr.Mind" style="width: 160px;" />
          </div>
          
          <div style="padding: 35px; text-align: center;">
            <h1 style="color: #1B326B; margin-bottom: 10px;">¡Felicitaciones ${user.firstName} ${user.lastName}!</h1>
            <h2 style="font-weight: normal; margin-bottom: 25px;">Tu certificado del curso:</h2>
            <h2 style="color: #1B326B; margin-bottom: 25px;">"${String(
        curso?.nombre || pago.curso || "",
      ).toUpperCase()}"</h2>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Nos complace informarte que tu certificado ha sido emitido exitosamente y ya se encuentra disponible para su descarga.
            </p>

            <p style="text-align: center; margin-bottom: 35px;">
              <a href="${absoluteUrl}" target="_blank"
                style="
                  background-color: #4D4D4D;
                  color: #ffffff;
                  padding: 14px 30px;
                  text-decoration: none;
                  border-radius: 6px;
                  font-size: 16px;
                  font-weight: 600;
                  display: inline-block;
                  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                ">
                📄 Descargar certificado
              </a>
            </p>

            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Si tienes dudas o necesitas asistencia adicional, estamos aquí para ayudarte.
            </p>
          </div>
          
          <div style="background-color: #f0f0f0; padding: 25px; text-align: center; font-size: 13px; color: #666;">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p style="margin-top: 20px;">© ${new Date().getFullYear()} iDr.Mind. Todos los derechos reservados.</p>
          </div>
          
        </div>
      </div>
      `,
    });

    const io = req.app.get("io");
    if (io) io.emit("pagoActualizado", pago);

    return res.status(200).json({
      message:
        "Certificado generado, guardado en BD y enviado al usuario correctamente.",
      certificado: certExistente,
      url: absoluteUrl,
    });
  } catch (error) {
    console.error("Error en endpoint certificado:", error);
    return res.status(500).json({
      message: "Ocurrió un error al generar el certificado.",
      error: error.message,
    });
  }
});


/* =========================================================
   TOKEN DE PAGO PSICOMÉTRICO
========================================================= */

const createPsychometricPaymentAccess = async (
  evaluationId
) => {
  await PsychometricAccessToken.update(
    {
      activo: false,
      revokedAt: new Date(),
    },
    {
      where: {
        evaluationId,
        purpose: "payment",
        activo: true,
      },
    }
  );

  const token = crypto
    .randomBytes(32)
    .toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const hours = Number(
    process.env.PSYCHOMETRIC_PAYMENT_TOKEN_HOURS ||
    720
  );

  const expiresAt = new Date(
    Date.now() +
    hours * 60 * 60 * 1000
  );

  await PsychometricAccessToken.create({
    evaluationId,
    tokenHash,
    purpose: "payment",
    expiresAt,
    activo: true,
  });

  return {
    token,
    expiresAt,
  };
};

const getPsychometricPaymentAccess =
  catchError(async (req, res) => {
    const { token } = req.params;

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const access =
      await PsychometricAccessToken.findOne({
        where: {
          tokenHash,
          purpose: "payment",
          activo: true,
        },
      });

    if (!access) {
      return res.status(404).json({
        message:
          "El enlace de pago no es válido.",
      });
    }

    if (
      access.expiresAt &&
      new Date(access.expiresAt) <
      new Date()
    ) {
      return res.status(410).json({
        message:
          "El enlace de pago ha expirado.",
      });
    }

    const evaluation =
      await PsychometricEvaluation.findByPk(
        access.evaluationId,
        {
          include: [
            {
              model: Inscripcion,
              as: "inscripcion",
              include: [
                {
                  model: User,
                  as: "user",
                },
              ],
            },
          ],
        }
      );

    if (!evaluation) {
      return res.status(404).json({
        message:
          "La evaluación no existe.",
      });
    }

    if (
      evaluation.estado !== "completada"
    ) {
      return res.status(409).json({
        message:
          "La evaluación todavía no está completada.",
      });
    }

    const inscripcion =
      evaluation.inscripcion;

    const user =
      inscripcion?.user;

    const course =
      inscripcion?.courseId
        ? await Course.findByPk(
          inscripcion.courseId
        )
        : null;

    const existingPayment =
      await Pagos.findOne({
        where: {
          psychometricEvaluationId:
            evaluation.id,
        },
        order: [["createdAt", "DESC"]],
      });

    return res.json({
      evaluation: {
        id: evaluation.id,
        numeroEvaluacion:
          evaluation.numeroEvaluacion,
      },

      user: {
        firstName:
          user?.firstName || "",
        lastName:
          user?.lastName || "",
        email: user?.email || "",
      },

      course: course
        ? {
          id: course.id,
          nombre: course.nombre,
          sigla: course.sigla,
        }
        : null,

      payment: {
        alreadyRegistered:
          Boolean(existingPayment),

        verified:
          Boolean(
            existingPayment?.verificado
          ),

        paymentId:
          existingPayment?.id || null,
      },
    });
  });


/* =========================================================
 REGISTRAR PAGO PSICOMÉTRICO MEDIANTE TOKEN
========================================================= */

const createPsychometricPayment =
  catchError(async (req, res) => {
    const { token } = req.params;

    /* =========================================
       1. VALIDAR COMPROBANTE
    ========================================= */

    if (!req.file) {
      return res.status(400).json({
        message:
          "Debes subir el comprobante de pago.",
      });
    }

    const url = req.fileUrl;

    if (!url) {
      return res.status(400).json({
        message:
          "No se pudo obtener la URL del comprobante.",
      });
    }

    /* =========================================
       2. VALIDAR TOKEN
    ========================================= */

    if (!token) {
      return res.status(400).json({
        message:
          "No se recibió el token de pago.",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const access =
      await PsychometricAccessToken.findOne({
        where: {
          tokenHash,
          purpose: "payment",
          activo: true,
        },
      });

    if (!access) {
      return res.status(404).json({
        message:
          "El enlace de pago no es válido.",
      });
    }

    /* =========================================
       3. VALIDAR EXPIRACIÓN
    ========================================= */

    if (
      access.expiresAt &&
      new Date(access.expiresAt) <
      new Date()
    ) {
      return res.status(410).json({
        message:
          "El enlace de pago ha expirado.",
      });
    }

    /* =========================================
       4. BUSCAR EVALUACIÓN
    ========================================= */

    const evaluation =
      await PsychometricEvaluation.findByPk(
        access.evaluationId,
        {
          include: [
            {
              model: Inscripcion,
              as: "inscripcion",

              include: [
                {
                  model: User,
                  as: "user",
                },
              ],
            },
          ],
        }
      );

    if (!evaluation) {
      return res.status(404).json({
        message:
          "No se encontró la evaluación asociada al enlace.",
      });
    }

    /* =========================================
       5. VALIDAR ESTADO DE LA EVALUACIÓN
    ========================================= */

    if (
      evaluation.estado !==
      "completada"
    ) {
      return res.status(409).json({
        message:
          "La evaluación debe estar completada antes de registrar el pago.",

        estadoEvaluacion:
          evaluation.estado,
      });
    }

    const inscripcion =
      evaluation.inscripcion;

    if (!inscripcion) {
      return res.status(404).json({
        message:
          "No se encontró la inscripción asociada a la evaluación.",
      });
    }

    const user =
      inscripcion.user;

    if (!user) {
      return res.status(404).json({
        message:
          "No se encontró el usuario asociado a la evaluación.",
      });
    }

    /* =========================================
       6. BUSCAR CURSO
    ========================================= */

    const course =
      inscripcion.courseId
        ? await Course.findByPk(
          inscripcion.courseId
        )
        : null;

    if (!course) {
      return res.status(404).json({
        message:
          "No se encontró el test o curso asociado a la evaluación.",
      });
    }

    /* =========================================
       7. IMPEDIR PAGO DUPLICADO
    ========================================= */

    const existingPayment =
      await Pagos.findOne({
        where: {
          psychometricEvaluationId:
            evaluation.id,
        },

        order: [
          ["createdAt", "DESC"],
        ],
      });

    if (existingPayment) {
      return res.status(409).json({
        message:
          existingPayment.verificado
            ? "El pago de esta evaluación ya fue registrado y validado."
            : "Ya existe un comprobante de pago registrado para esta evaluación y está pendiente de validación.",

        payment: {
          id: existingPayment.id,

          verificado:
            existingPayment.verificado,

          createdAt:
            existingPayment.createdAt,
        },
      });
    }

    /* =========================================
       8. VALIDAR VALOR DEPOSITADO
    ========================================= */

    const {
      valorDepositado,
      entidad,
      idDeposito,
      observacion,
    } = req.body;

    if (
      valorDepositado === undefined ||
      valorDepositado === null ||
      String(
        valorDepositado
      ).trim() === ""
    ) {
      return res.status(400).json({
        message:
          "El valor depositado es requerido.",
      });
    }

    const valorDepositadoFinal =
      Number(valorDepositado);

    if (
      Number.isNaN(
        valorDepositadoFinal
      ) ||
      valorDepositadoFinal <= 0
    ) {
      return res.status(400).json({
        message:
          "El valor depositado no es válido.",
      });
    }

    /* =========================================
       9. VALIDAR ID DE DEPÓSITO DUPLICADO
    ========================================= */

    if (
      entidad &&
      String(entidad).trim() &&
      idDeposito &&
      String(idDeposito).trim()
    ) {
      const duplicateDeposit =
        await Pagos.findOne({
          where: {
            entidad:
              String(
                entidad
              ).trim(),

            idDeposito:
              String(
                idDeposito
              ).trim(),
          },
        });

      if (duplicateDeposit) {
        return res.status(409).json({
          message:
            "Ya existe un pago registrado con ese ID de depósito para la entidad seleccionada.",
        });
      }
    }

    /* =========================================
       10. DETERMINAR CÓDIGO DEL TEST
    ========================================= */

    const cursoFinal =
      course.sigla ||
      inscripcion.curso ||
      "test_psicometrico";

    /* =========================================
       11. CREAR PAGO
    ========================================= */

    const payment =
      await Pagos.create({
        inscripcionId:
          inscripcion.id,

        psychometricEvaluationId:
          evaluation.id,

        tipoPago:
          "test_psicometrico",

        curso:
          cursoFinal,

        pagoUrl:
          url,

        valorDepositado:
          valorDepositadoFinal,

        entidad:
          entidad
            ? String(
              entidad
            ).trim()
            : null,

        idDeposito:
          idDeposito
            ? String(
              idDeposito
            ).trim()
            : null,

        /*
         * El usuario confirma que
         * registró el comprobante.
         */
        confirmacion: true,

        /*
         * La validación la hará
         * posteriormente el administrador.
         */
        verificado: false,

        distintivo: false,
        moneda: false,
        entregado: false,

        cert_emp: null,
        cert_mdt: null,
        cert_int: null,

        observacion:
          observacion ||
          `Pago de evaluación psicométrica N.º ${evaluation.numeroEvaluacion}`,

        usuarioEdicion: null,
      });

    /* =========================================
       12. CORREO DE CONFIRMACIÓN
    ========================================= */

    let emailSent = true;

    try {
      await sendEmail({
        to: user.email,

        subject:
          "✅ Comprobante recibido - Proyecto Pensar iDr.Mind",

        html: `
          <div style="
            margin:0;
            padding:30px 15px;
            background:#f1f5f9;
            font-family:Arial,sans-serif;
            color:#101828;
          ">

            <div style="
              max-width:640px;
              margin:0 auto;
              background:#ffffff;
              border-radius:18px;
              overflow:hidden;
              box-shadow:
                0 18px 45px
                rgba(7,27,63,.16);
            ">

              <div style="
                padding:28px;
                text-align:center;
                background:
                  linear-gradient(
                    135deg,
                    #071b3f,
                    #173a8a
                  );
              ">

                <img
                  src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1760413741/1_qvykyo.png"
                  alt="iDr.Mind"
                  style="
                    width:165px;
                    max-width:100%;
                  "
                />

              </div>

              <div style="
                padding:34px;
                text-align:center;
              ">

                <h1 style="
                  margin:0 0 18px;
                  color:#071b3f;
                  font-size:27px;
                ">
                  ¡Gracias
                  ${user.firstName || ""}
                  ${user.lastName || ""}!
                </h1>

                <p style="
                  font-size:16px;
                  line-height:1.7;
                  color:#475467;
                ">
                  Hemos recibido correctamente
                  tu comprobante de pago de
                  <strong>
                    ${course.nombre ||
          "Proyecto Pensar"}
                  </strong>.
                </p>

                <div style="
                  margin:25px 0;
                  padding:18px;
                  border-radius:12px;
                  background:#eef6ff;
                  border-left:
                    5px solid #28a7e8;
                  text-align:left;
                ">

                  <p style="
                    margin:0;
                    color:#344054;
                    line-height:1.7;
                  ">
                    <strong>
                      Evaluación:
                    </strong>
                    N.º
                    ${evaluation.numeroEvaluacion}
                  </p>

                  <p style="
                    margin:6px 0 0;
                    color:#344054;
                    line-height:1.7;
                  ">
                    <strong>
                      Valor registrado:
                    </strong>
                    $${valorDepositadoFinal.toFixed(
            2
          )}
                  </p>

                  ${entidad
            ? `
                        <p style="
                          margin:6px 0 0;
                          color:#344054;
                          line-height:1.7;
                        ">
                          <strong>
                            Entidad:
                          </strong>
                          ${entidad}
                        </p>
                      `
            : ""
          }

                  ${idDeposito
            ? `
                        <p style="
                          margin:6px 0 0;
                          color:#344054;
                          line-height:1.7;
                        ">
                          <strong>
                            ID de depósito:
                          </strong>
                          ${idDeposito}
                        </p>
                      `
            : ""
          }

                </div>

                <p style="
                  font-size:16px;
                  line-height:1.7;
                  color:#475467;
                ">
                  Nuestro equipo verificará
                  el pago. Una vez aprobado,
                  recibirás automáticamente
                  otro correo con el enlace
                  para consultar tu informe
                  de resultados.
                </p>

                <div style="
                  margin-top:28px;
                  padding:15px;
                  border-radius:10px;
                  background:#ecfdf3;
                  color:#087443;
                  font-size:14px;
                  line-height:1.6;
                ">
                  No necesitas volver a
                  registrar el comprobante.
                  Te notificaremos cuando
                  haya sido validado.
                </div>

              </div>

              <div style="
                padding:18px;
                background:#f8fafc;
                text-align:center;
                color:#98a2b3;
                font-size:12px;
              ">
                © ${new Date().getFullYear()}
                iDr.Mind.
                Todos los derechos reservados.
              </div>

            </div>
          </div>
        `,
      });
    } catch (emailError) {
      emailSent = false;

      console.error(
        "No se pudo enviar el correo de confirmación del pago psicométrico:",
        emailError
      );
    }

    /* =========================================
       13. SOCKET
    ========================================= */

    const io =
      req.app.get("io");

    if (io) {
      io.emit(
        "pagoCreado",
        payment
      );
    }

    /* =========================================
       14. RESPUESTA
    ========================================= */

    return res
      .status(201)
      .json({
        message: emailSent
          ? "Comprobante registrado correctamente. Recibirás un correo cuando el pago sea validado."
          : "Comprobante registrado correctamente, pero no se pudo enviar el correo de confirmación.",

        emailSent,

        payment: {
          id: payment.id,

          psychometricEvaluationId:
            payment.psychometricEvaluationId,

          tipoPago:
            payment.tipoPago,

          valorDepositado:
            payment.valorDepositado,

          verificado:
            payment.verificado,

          createdAt:
            payment.createdAt,
        },
      });
  });


/* =========================================================
 GENERAR / ENVIAR RESULTADO PSICOMÉTRICO
 POST /pagos/:id/resultado-psicometrico
========================================================= */

const generatePsychometricResult =
  catchError(async (req, res) => {
    const { id } = req.params;

    /*
     * Si enviamos:
     *
     * {
     *   "reenviar": true
     * }
     *
     * permite mandar nuevamente el resultado.
     */
    const reenviar =
      req.body?.reenviar === true ||
      req.body?.reenviar === "true";

    /* =========================================
       1. BUSCAR PAGO
    ========================================= */

    const pago = await Pagos.findByPk(id);

    if (!pago) {
      return res.status(404).json({
        message:
          "Pago no encontrado.",
      });
    }

    /* =========================================
       2. SOLO PARA TEST PSICOMÉTRICO
    ========================================= */

    if (
      pago.tipoPago !==
      "test_psicometrico"
    ) {
      return res.status(400).json({
        message:
          "Esta acción solamente está disponible para pagos de test psicométrico.",
      });
    }

    if (
      !pago.psychometricEvaluationId
    ) {
      return res.status(400).json({
        message:
          "El pago no tiene una evaluación psicométrica asociada.",
      });
    }

    /* =========================================
       3. PAGO DEBE ESTAR VERIFICADO
    ========================================= */

    if (!pago.verificado) {
      return res.status(409).json({
        message:
          "El pago debe estar verificado antes de generar el resultado.",
      });
    }

    /* =========================================
       4. BUSCAR EVALUACIÓN
    ========================================= */

    const evaluation =
      await PsychometricEvaluation.findByPk(
        pago.psychometricEvaluationId,
        {
          include: [
            {
              model: Inscripcion,
              as: "inscripcion",

              include: [
                {
                  model: User,
                  as: "user",
                },
              ],
            },
          ],
        }
      );

    if (!evaluation) {
      return res.status(404).json({
        message:
          "No se encontró la evaluación psicométrica asociada.",
      });
    }

    /* =========================================
       5. DEBE ESTAR COMPLETADA
    ========================================= */

    if (
      evaluation.estado !==
      "completada"
    ) {
      return res.status(409).json({
        message:
          "La evaluación todavía no se encuentra completada.",

        estado:
          evaluation.estado,
      });
    }

    if (
      !evaluation.resultado ||
      !evaluation.personalityId
    ) {
      return res.status(409).json({
        message:
          "La evaluación no tiene un resultado psicométrico calculado.",
      });
    }

    /* =========================================
       6. CONTROLAR ENVÍOS DUPLICADOS
    ========================================= */

    if (
      evaluation.resultadoEmailEnviado &&
      !reenviar
    ) {
      return res.status(409).json({
        message:
          "El resultado ya fue enviado anteriormente.",

        alreadySent: true,

        resultadoEmailEnviadoAt:
          evaluation.resultadoEmailEnviadoAt,

        resultadoEmailEnvios:
          evaluation.resultadoEmailEnvios,

        resultadoInformeUrl:
          evaluation.resultadoInformeUrl ||
          null,

        hint:
          "Para enviarlo nuevamente usa reenviar=true.",
      });
    }

    /* =========================================
       7. OBTENER USUARIO
    ========================================= */

    const inscripcion =
      evaluation.inscripcion;

    const user =
      inscripcion?.user;

    if (!user?.email) {
      return res.status(404).json({
        message:
          "No se encontró el correo del participante.",
      });
    }

    /* =========================================
       8. OBTENER CURSO
    ========================================= */

    const course =
      inscripcion?.courseId
        ? await Course.findByPk(
          inscripcion.courseId
        )
        : null;

    if (!course) {
      return res.status(404).json({
        message:
          "No se encontró el test asociado a la evaluación.",
      });
    }

    /* =========================================
       9. LIBERAR RESULTADO
    ========================================= */

    if (
      !evaluation.resultadoLiberado
    ) {
      await evaluation.update({
        resultadoLiberado: true,
      });
    }

    /* =========================================
       10. GENERAR INFORME PDF

       LO CONECTAREMOS EN EL SIGUIENTE PASO.

       const informe =
         await generarInformePsicometrico({
           evaluationId: evaluation.id
         });

       const informeUrl =
         informe.absoluteUrl;
    ========================================= */

    const informeUrl =
      evaluation.resultadoInformeUrl ||
      null;

    /* =========================================
       11. GENERAR TOKEN DE RESULTADO

       Esta función ya invalida el token
       anterior y genera uno nuevo.
    ========================================= */

    const {
      token,
      expiresAt,
    } =
      await createPsychometricResultAccess(
        evaluation.id
      );

    /* =========================================
       12. ENVIAR CORREO
    ========================================= */

    let emailSent = false;

    try {
      await sendPsychometricResultEmail({
        user,
        course,
        evaluation,
        token,
        expiresAt,

        /*
         * Después podemos pasar:
         * informeUrl
         */
      });

      emailSent = true;
    } catch (emailError) {
      console.error(
        "No se pudo enviar el correo del resultado psicométrico:",
        emailError
      );
    }

    /* =========================================
       13. REGISTRAR HISTORIAL
    ========================================= */

    const now = new Date();

    const totalEnvios =
      Number(
        evaluation.resultadoEmailEnvios ||
        0
      ) +
      (emailSent ? 1 : 0);

    await evaluation.update({
      resultadoGeneradoAt:
        evaluation.resultadoGeneradoAt ||
        now,

      resultadoEmailEnviado:
        emailSent
          ? true
          : evaluation.resultadoEmailEnviado,

      resultadoEmailEnviadoAt:
        emailSent
          ? now
          : evaluation.resultadoEmailEnviadoAt,

      resultadoEmailEnvios:
        totalEnvios,

      resultadoInformeUrl:
        informeUrl,
    });

    /* =========================================
       14. SOCKET
    ========================================= */

    const io =
      req.app.get("io");

    if (io) {
      io.emit(
        "resultadoPsicometricoGenerado",
        {
          evaluationId:
            evaluation.id,

          pagoId:
            pago.id,

          emailSent,

          resultadoEmailEnvios:
            totalEnvios,
        }
      );
    }

    /* =========================================
       15. RESPUESTA
    ========================================= */

    return res.json({
      message: emailSent
        ? reenviar
          ? "Resultado reenviado correctamente al participante."
          : "Resultado generado y enviado correctamente al participante."
        : "El resultado fue liberado, pero no se pudo enviar el correo.",

      emailSent,

      reenviado:
        reenviar,

      result: {
        evaluationId:
          evaluation.id,

        numeroEvaluacion:
          evaluation.numeroEvaluacion,

        resultadoLiberado:
          true,

        resultadoGeneradoAt:
          evaluation.resultadoGeneradoAt ||
          now,

        resultadoEmailEnviado:
          emailSent
            ? true
            : evaluation.resultadoEmailEnviado,

        resultadoEmailEnviadoAt:
          emailSent
            ? now
            : evaluation.resultadoEmailEnviadoAt,

        resultadoEmailEnvios:
          totalEnvios,

        resultadoInformeUrl:
          informeUrl,
      },
    });
  });


module.exports = {
  getAll,
  getDashboardPagos,
  validatePago,
  create,
  getOne,
  remove,
  update,
  certificado,

  createPsychometricPaymentAccess,
  getPsychometricPaymentAccess,
  createPsychometricPayment,

  generatePsychometricResult,
};
