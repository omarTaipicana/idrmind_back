const crypto = require("crypto");
const { Op } = require("sequelize");

const sequelize = require("../utils/connection");
const catchError = require("../utils/catchError");

const User = require("../models/User");
const Course = require("../models/Course");
const Inscripcion = require("../models/Inscripcion");

const Empresa = require("../models/Empresa");
const EmpresaSeccion = require(
  "../models/EmpresaSeccion"
);

const PsychometricTest = require(
  "../models/PsychometricTest"
);

const PsychometricEvaluation = require(
  "../models/PsychometricEvaluation"
);

const PsychometricAccessToken = require(
  "../models/PsychometricAccessToken"
);

/*
 * Ajusta esta importación a la ruta real
 * que ya utilizas para enviar correos.
 */
const sendEmail = require("../utils/sendEmail");

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://idrmind.com";

/*
 * El enlace será válido durante 7 días.
 */
const ACCESS_TOKEN_HOURS = Number(
  process.env.PSYCHOMETRIC_TOKEN_HOURS || 168
);

/* =========================================================
   NORMALIZAR TEXTO
========================================================= */

const normalizeText = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

/* =========================================================
   CAPITALIZAR NOMBRES
========================================================= */

const capitalizeWords = (value) => {
  return normalizeText(value)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};

/* =========================================================
   GENERAR TOKEN SEGURO
========================================================= */

const generateAccessToken = () => {
  const token = crypto
    .randomBytes(32)
    .toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  return {
    token,
    tokenHash,
  };
};

/* =========================================================
   VALIDAR EMPRESA Y SECCIÓN
========================================================= */

const validateCompanyData = async ({
  empresaId,
  seccionId,
  transaction,
}) => {
  const empresaIdFinal = normalizeText(empresaId);
  const seccionIdFinal = normalizeText(seccionId);

  /*
   * Participante individual.
   */
  if (!empresaIdFinal) {
    return {
      empresaId: null,
      seccionId: null,
    };
  }

  const empresa = await Empresa.findByPk(
    empresaIdFinal,
    {
      transaction,
    }
  );

  if (!empresa) {
    const error = new Error(
      "La empresa seleccionada no existe."
    );

    error.statusCode = 404;
    throw error;
  }

  if (empresa.activo === false) {
    const error = new Error(
      "La empresa seleccionada no está activa."
    );

    error.statusCode = 400;
    throw error;
  }

  if (!seccionIdFinal) {
    const error = new Error(
      "Debe seleccionar una sección de la empresa."
    );

    error.statusCode = 400;
    throw error;
  }

  const seccion =
    await EmpresaSeccion.findOne({
      where: {
        id: seccionIdFinal,
        empresaId: empresaIdFinal,
      },
      transaction,
    });

  if (!seccion) {
    const error = new Error(
      "La sección seleccionada no pertenece a la empresa."
    );

    error.statusCode = 400;
    throw error;
  }

  if (seccion.activo === false) {
    const error = new Error(
      "La sección seleccionada no está activa."
    );

    error.statusCode = 400;
    throw error;
  }

  return {
    empresaId: empresa.id,
    seccionId: seccion.id,
  };
};

/* =========================================================
   CREAR O ACTUALIZAR USUARIO
========================================================= */

const findOrCreateUser = async ({
  email,
  cedula,
  nombres,
  apellidos,
  celular,
  grado,
  subsistema,
  empresaId,
  seccionId,
  transaction,
}) => {
  let user = await User.findOne({
    where: {
      email,
    },
    transaction,
  });

  if (!user) {
    user = await User.create(
      {
        cI: cedula || null,
        email,
        firstName:
          capitalizeWords(nombres) || null,
        lastName:
          capitalizeWords(apellidos) || null,
        cellular: celular || null,
        grado: grado || null,
        subsistema: subsistema || null,
        empresaId,
        seccionId,
      },
      {
        transaction,
      }
    );

    return {
      user,
      userCreated: true,
    };
  }

  /*
   * Si el usuario ya tiene empresa registrada,
   * se conserva y no se reemplaza desde este formulario.
   *
   * Si todavía tiene empresaId null, puede completar
   * empresa y sección durante esta inscripción.
   */
  const userHasCompany = Boolean(
    user.empresaId
  );

  const userUpdate = {
    cI: user.cI || cedula || null,

    firstName:
      user.firstName ||
      capitalizeWords(nombres) ||
      null,

    lastName:
      user.lastName ||
      capitalizeWords(apellidos) ||
      null,

    cellular:
      user.cellular || celular || null,

    grado: user.grado || grado || null,

    subsistema:
      user.subsistema || subsistema || null,

    empresaId: userHasCompany
      ? user.empresaId
      : empresaId,

    seccionId: userHasCompany
      ? user.seccionId
      : seccionId,
  };

  await user.update(userUpdate, {
    transaction,
  });

  return {
    user,
    userCreated: false,
  };
};

/* =========================================================
   BUSCAR O CREAR INSCRIPCIÓN
========================================================= */

const findOrCreateInscription = async ({
  user,
  course,
  aceptacion,
  transaction,
}) => {
  let inscripcion =
    await Inscripcion.findOne({
      where: {
        userId: user.id,
        courseId: course.id,
      },
      transaction,
    });

  if (inscripcion) {
    return {
      inscripcion,
      inscriptionCreated: false,
    };
  }

  /*
   * Ajusta estos campos si tu modelo Inscripcion
   * utiliza otros nombres obligatorios.
   */
  inscripcion = await Inscripcion.create(
    {
      userId: user.id,
      courseId: course.id,
      curso: course.sigla,
      aceptacion: Boolean(aceptacion),
    },
    {
      transaction,
    }
  );

  return {
    inscripcion,
    inscriptionCreated: true,
  };
};

/* =========================================================
   CREAR O REUTILIZAR EVALUACIÓN ACTIVA
========================================================= */

const createOrReuseEvaluation = async ({
  inscripcion,
  test,
  transaction,
}) => {
  /*
   * Evita que el usuario genere evaluaciones duplicadas
   * si registra varias veces el mismo formulario antes
   * de terminar el test.
   */
  const createOrReuseEvaluation = async ({
    inscripcion,
    test,
    transaction,
  }) => {
    /*
     * La inscripción es única para el usuario y el test,
     * pero cada intento genera una nueva evaluación.
     *
     * Ejemplo:
     * Inscripción
     * ├── Evaluación 1
     * ├── Evaluación 2
     * └── Evaluación 3
     */

    const lastEvaluationNumber =
      await PsychometricEvaluation.max(
        "numeroEvaluacion",
        {
          where: {
            inscripcionId: inscripcion.id,
            testId: test.id,
          },
          transaction,
        }
      );

    const numeroEvaluacion =
      Number(lastEvaluationNumber || 0) + 1;

    const evaluation =
      await PsychometricEvaluation.create(
        {
          inscripcionId: inscripcion.id,
          testId: test.id,

          numeroEvaluacion,

          estado: "habilitada",

          fechaHabilitacion: new Date(),

          testVersion:
            Number(test.version || 1),

          puntajeTotal: null,
          resultado: null,
          personalityId: null,

          resultadoLiberado: false,

          observacion: null,
        },
        {
          transaction,
        }
      );

    return {
      evaluation,
      evaluationCreated: true,
    };
  };

  const lastEvaluationNumber =
    await PsychometricEvaluation.max(
      "numeroEvaluacion",
      {
        where: {
          inscripcionId: inscripcion.id,
          testId: test.id,
        },

        transaction,
      }
    );

  const numeroEvaluacion =
    Number(lastEvaluationNumber || 0) + 1;

  /*
   * Como el usuario realizará primero el test
   * y recibirá luego información de pago,
   * la evaluación comienza habilitada.
   */
  const evaluation =
    await PsychometricEvaluation.create(
      {
        inscripcionId: inscripcion.id,
        testId: test.id,
        numeroEvaluacion,
        estado: "habilitada",
        fechaHabilitacion: new Date(),
        testVersion: test.version,
        resultadoLiberado: false,
      },
      {
        transaction,
      }
    );

  return {
    evaluation,
    evaluationCreated: true,
  };
};

/* =========================================================
   GENERAR ACCESO
========================================================= */

const createEvaluationAccess = async ({
  evaluation,
  transaction,
}) => {
  /*
   * Desactivamos enlaces anteriores de la misma
   * evaluación antes de generar uno nuevo.
   */
  await PsychometricAccessToken.update(
    {
      activo: false,
      revokedAt: new Date(),
    },
    {
      where: {
        evaluationId: evaluation.id,
        activo: true,
      },

      transaction,
    }
  );

  const { token, tokenHash } =
    generateAccessToken();

  const expiresAt = new Date(
    Date.now() +
    ACCESS_TOKEN_HOURS *
    60 *
    60 *
    1000
  );

  await PsychometricAccessToken.create(
    {
      evaluationId: evaluation.id,
      tokenHash,
      expiresAt,
      purpose: "test",
      activo: true,
    },
    {
      transaction,
    }
  );

  return {
    token,
    expiresAt,
  };
};

/* =========================================================
   ENVIAR CORREO
========================================================= */

const sendPsychometricAccessEmail = async ({
  user,
  course,
  evaluation,
  token,
  expiresAt,
}) => {
  /*
   * Si tu frontend usa HashRouter:
   * /#/test-psicotecnico/:token
   */
  const link =
    `${FRONTEND_URL}/#/test-psicotecnico/${token}`;

  const expirationDate =
    expiresAt.toLocaleString("es-EC", {
      timeZone: "America/Guayaquil",
      dateStyle: "long",
      timeStyle: "short",
    });

  await sendEmail({
    to: user.email,

    subject:
      "Acceso al Test Psicotécnico - iDr.Mind",

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
              style="
                width:165px;
                max-width:100%;
              "
            />
          </div>

          <div style="padding:34px;">
            <h1 style="
              margin:0 0 18px;
              color:#071b3f;
              font-size:27px;
            ">
              Hola ${user.firstName || ""}
              ${user.lastName || ""}
            </h1>

            <p style="
              font-size:16px;
              line-height:1.7;
              color:#475467;
            ">
              Tu registro para
              <strong>${course.nombre}</strong>
              se completó correctamente.
            </p>

            <p style="
              font-size:16px;
              line-height:1.7;
              color:#475467;
            ">
              Lee cuidadosamente las instrucciones,
              responde con sinceridad y procura completar
              todas las secciones del test.
            </p>

            <div style="
              margin:26px 0;
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
                href="${link}"
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
                Iniciar test psicotécnico
              </a>
            </div>

            <p style="
              font-size:14px;
              color:#667085;
              line-height:1.6;
            ">
              Puedes volver a abrir el mismo enlace para
              continuar mientras se encuentre vigente y
              la evaluación no haya sido finalizada.
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

  return link;
};

/* =========================================================
   POST /psychometric/register
========================================================= */

const registerPsychometric = catchError(
  async (req, res) => {
    const {
      cedula,
      email,
      nombres,
      apellidos,
      celular,
      grado,
      subsistema,
      empresaId,
      seccionId,
      courseId,
      aceptacion,
    } = req.body;

    const emailFinal = normalizeText(
      email
    ).toLowerCase();

    if (!emailFinal) {
      return res.status(400).json({
        message:
          "El correo electrónico es requerido.",
      });
    }

    if (!courseId) {
      return res.status(400).json({
        message:
          "El identificador del curso es requerido.",
      });
    }

    const transaction =
      await sequelize.transaction();

    let responseData;

    try {
      /* =====================================
         1. VALIDAR CURSO
      ===================================== */

      const course = await Course.findByPk(
        courseId,
        {
          transaction,
        }
      );

      if (!course) {
        await transaction.rollback();

        return res.status(404).json({
          message:
            "El test seleccionado no existe.",
        });
      }

      if (course.tipo !== "test_psicotecnico") {
        await transaction.rollback();

        return res.status(400).json({
          message:
            "El curso seleccionado no corresponde a un test psicotécnico.",
        });
      }

      if (course.vigente === false) {
        await transaction.rollback();

        return res.status(400).json({
          message:
            "El test seleccionado no está disponible.",
        });
      }

      /* =====================================
         2. BUSCAR CONFIGURACIÓN DEL TEST
      ===================================== */

      const test =
        await PsychometricTest.findOne({
          where: {
            courseId: course.id,
            activo: true,
          },

          transaction,
        });

      if (!test) {
        await transaction.rollback();

        return res.status(404).json({
          message:
            "El curso no tiene un test psicotécnico configurado.",
        });
      }

      /* =====================================
         3. VALIDAR EMPRESA Y SECCIÓN
      ===================================== */

      const companyData =
        await validateCompanyData({
          empresaId,
          seccionId,
          transaction,
        });

      /* =====================================
         4. BUSCAR O CREAR USUARIO
      ===================================== */

      const {
        user,
        userCreated,
      } = await findOrCreateUser({
        email: emailFinal,
        cedula: normalizeText(cedula),
        nombres,
        apellidos,
        celular: normalizeText(celular),
        grado: normalizeText(grado),
        subsistema:
          normalizeText(subsistema),

        empresaId:
          companyData.empresaId,

        seccionId:
          companyData.seccionId,

        transaction,
      });

      /* =====================================
         5. BUSCAR O CREAR INSCRIPCIÓN
      ===================================== */

      const {
        inscripcion,
        inscriptionCreated,
      } = await findOrCreateInscription({
        user,
        course,
        aceptacion,
        transaction,
      });

      /* =====================================
         6. CREAR O REUTILIZAR EVALUACIÓN
      ===================================== */

      const {
        evaluation,
        evaluationCreated,
      } = await createOrReuseEvaluation({
        inscripcion,
        test,
        transaction,
      });

      /* =====================================
         7. GENERAR NUEVO ENLACE
      ===================================== */

      const {
        token,
        expiresAt,
      } = await createEvaluationAccess({
        evaluation,
        transaction,
      });

      await transaction.commit();

      responseData = {
        user,
        course,
        test,
        inscripcion,
        evaluation,
        token,
        expiresAt,
        userCreated,
        inscriptionCreated,
        evaluationCreated,
      };
    } catch (error) {
      await transaction.rollback();

      if (error.statusCode) {
        return res
          .status(error.statusCode)
          .json({
            message: error.message,
          });
      }

      throw error;
    }

    /*
     * Enviamos el correo después del commit.
     *
     * De esta manera, si el servidor de correo falla,
     * no se pierde el registro en la base.
     */
    let emailSent = true;
    let accessUrl = null;

    try {
      accessUrl =
        await sendPsychometricAccessEmail({
          user: responseData.user,
          course: responseData.course,
          evaluation:
            responseData.evaluation,
          token: responseData.token,
          expiresAt:
            responseData.expiresAt,
        });
    } catch (emailError) {
      emailSent = false;

      console.error(
        "No se pudo enviar el correo del test:",
        emailError
      );
    }

    return res.status(
      responseData.evaluationCreated
        ? 201
        : 200
    ).json({
      message: emailSent
        ? "Registro completado. Se envió el enlace del test al correo electrónico."
        : "Registro completado, pero no se pudo enviar el correo. El administrador deberá reenviar el acceso.",

      emailSent,

      user: {
        id: responseData.user.id,
        email: responseData.user.email,
        firstName:
          responseData.user.firstName,
        lastName:
          responseData.user.lastName,
        empresaId:
          responseData.user.empresaId,
        seccionId:
          responseData.user.seccionId,
      },

      inscripcion: {
        id: responseData.inscripcion.id,
        created:
          responseData.inscriptionCreated,
      },

      evaluation: {
        id: responseData.evaluation.id,
        numeroEvaluacion:
          responseData.evaluation
            .numeroEvaluacion,
        estado:
          responseData.evaluation.estado,
        created:
          responseData.evaluationCreated,
        expiresAt:
          responseData.expiresAt,
      },

      /*
       * En producción puedes eliminar accessUrl
       * de la respuesta para que solo llegue por correo.
       *
       * Durante desarrollo es útil para probar.
       */
      accessUrl:
        process.env.NODE_ENV === "production"
          ? undefined
          : accessUrl,
    });
  }
);

module.exports = {
  registerPsychometric,
};