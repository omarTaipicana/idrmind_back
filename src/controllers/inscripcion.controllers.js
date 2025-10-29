const catchError = require("../utils/catchError");
const sendEmail = require("../utils/sendEmail");
const { Op } = require("sequelize");
const Inscripcion = require("../models/Inscripcion");
const Course = require("../models/Course");
const User = require("../models/User");
const { crearUsuarioMoodle, inscribirUsuarioCurso, registrarUsuarioEnCurso  } = require("../utils/moodle");


const sequelizeM = require("../utils/connectionM");
const sequelize = require("../utils/connection");

const getAll = catchError(async (req, res) => {
  const results = await Inscripcion.findAll({
    include: [
      {
        model: User,
        attributes: ["firstName", "lastName", "cI", "grado", "email"],
      },
    ],
  });

  return res.json(results);
});

const getDashboardInscripciones = catchError(async (req, res) => {
  const { desde, hasta } = req.query;

  // Filtro de fechas en Inscripcion
  const where = {};
  if (desde || hasta) {
    where.createdAt = {};
    if (desde) where.createdAt[Op.gte] = new Date(desde);
    if (hasta) {
      const hastaDate = new Date(hasta);
      hastaDate.setDate(hastaDate.getDate() + 1); // sumamos 1 día
      where.createdAt[Op.lt] = hastaDate; // menor que el siguiente día
    }
  }

  // Traemos las inscripciones con datos del usuario relacionados
  const inscripciones = await Inscripcion.findAll({
    attributes: ["createdAt"], // solo lo necesario
    where,
    include: [
      {
        model: User,
        as: "user", // debe coincidir con tu alias en la relación
        attributes: ["grado", "subsistema"], // para los gráficos
      },
    ],
  });

  const totalInscritos = inscripciones.length;

  // Conteo por grado
  const inscritosPorGrado = {};
  inscripciones.forEach((i) => {
    const grado = i.user?.grado || "Sin grado";
    inscritosPorGrado[grado] = (inscritosPorGrado[grado] || 0) + 1;
  });

  // Conteo por subsistema
  const inscritosPorSubsistema = {};
  inscripciones.forEach((i) => {
    const subsistema = i.user?.subsistema || "Sin subsistema";
    inscritosPorSubsistema[subsistema] =
      (inscritosPorSubsistema[subsistema] || 0) + 1;
  });

  // Conteo por día
  const inscritosPorDia = {};
  inscripciones.forEach((i) => {
    const fecha = i.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
    inscritosPorDia[fecha] = (inscritosPorDia[fecha] || 0) + 1;
  });

  // Conteo por franja horaria
  const franjas = [
    { label: "00H-03H", from: 0, to: 3 },
    { label: "04H-07H", from: 4, to: 7 },
    { label: "08H-11H", from: 8, to: 11 },
    { label: "12H-15H", from: 12, to: 15 },
    { label: "16H-19H", from: 16, to: 19 },
    { label: "20H-23H", from: 20, to: 23 },
  ];

  const inscritosPorFranjaHoraria = franjas.map((f) => ({
    label: f.label,
    value: 0,
  }));

  inscripciones.forEach((i) => {
    const hour = i.createdAt.getHours(); // hora local
    const franja = franjas.find((f) => hour >= f.from && hour <= f.to);
    if (franja) {
      const index = inscritosPorFranjaHoraria.findIndex(
        (f) => f.label === franja.label
      );
      if (index !== -1) inscritosPorFranjaHoraria[index].value++;
    }
  });

  return res.json({
    totalInscritos,
    inscritosPorGrado: Object.entries(inscritosPorGrado).map(
      ([grado, cantidad]) => ({ grado, cantidad })
    ),
    inscritosPorSubsistema: Object.entries(inscritosPorSubsistema).map(
      ([subsistema, cantidad]) => ({ subsistema, cantidad })
    ),
    inscritosPorDia: Object.entries(inscritosPorDia).map(
      ([fecha, cantidad]) => ({
        fecha,
        cantidad,
      })
    ),
    inscritosPorFranjaHoraria,
  });
});




const getDashboardObservaciones = catchError(async (req, res) => {
  const { desde, hasta, curso, usuarioEdicion } = req.query;

  // Filtros dinámicos
  const where = {
    [Op.and]: [
      { observacion: { [Op.ne]: null } },
      { observacion: { [Op.ne]: "" } },
    ],
  };

  // filtro de fechas usando updatedAt
  if (desde || hasta) {
    where.updatedAt = {};
    if (desde) where.updatedAt[Op.gte] = new Date(desde);
    if (hasta) {
      const hastaDate = new Date(hasta);
      hastaDate.setDate(hastaDate.getDate() + 1);
      where.updatedAt[Op.lt] = hastaDate;
    }
  }

  // filtro por curso
  if (curso && curso !== "todos") {
    where.curso = curso;
  }

  // filtro por usuarioEdicion
  if (usuarioEdicion && usuarioEdicion !== "todos") {
    where.usuarioEdicion = usuarioEdicion;
  }

  // Obtener las inscripciones filtradas
  const observaciones = await Inscripcion.findAll({
    attributes: ["updatedAt", "usuarioEdicion", "curso", "observacion"],
    where,
    include: [
      {
        model: User,
        as: "user",
        attributes: ["firstName", "lastName"],
      },
    ],
  });

  // ---- Agrupaciones ----

  // Conteo por día
  // Agrupando observaciones por día
  const observacionesPorDia = {};

  // obtenemos las observaciones filtradas desde la DB
  observaciones.forEach((o) => {
    const fecha = o.updatedAt.toISOString().split("T")[0];
    observacionesPorDia[fecha] = (observacionesPorDia[fecha] || 0) + 1;
  });

  // convertimos a array y ordenamos por fecha ascendente
  const observacionesPorDiaOrdenado = Object.entries(observacionesPorDia)
    .map(([fecha, cantidad]) => ({ fecha, cantidad }))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));


  // Conteo por hora
  const franjas = [
    { label: "00H-03H", from: 0, to: 3 },
    { label: "04H-07H", from: 4, to: 7 },
    { label: "08H-11H", from: 8, to: 11 },
    { label: "12H-15H", from: 12, to: 15 },
    { label: "16H-19H", from: 16, to: 19 },
    { label: "20H-23H", from: 20, to: 23 },
  ];

  const observacionesPorFranjaHoraria = franjas.map((f) => ({
    label: f.label,
    value: 0,
  }));

  observaciones.forEach((o) => {
    const hour = o.updatedAt.getHours();
    const franja = franjas.find((f) => hour >= f.from && hour <= f.to);
    if (franja) {
      const index = observacionesPorFranjaHoraria.findIndex(
        (f) => f.label === franja.label
      );
      if (index !== -1) observacionesPorFranjaHoraria[index].value++;
    }
  });

  // Conteo por usuarioEdicion
  const observacionesPorUsuario = {};
  observaciones.forEach((o) => {
    const userEdit = o.usuarioEdicion || "Desconocido";
    observacionesPorUsuario[userEdit] =
      (observacionesPorUsuario[userEdit] || 0) + 1;
  });

  return res.json({
    totalObservaciones: observaciones.length,
    observacionesPorDiaOrdenado: Object.entries(observacionesPorDiaOrdenado).map(
      ([fecha, cantidad]) => ({ fecha, cantidad })
    ),
    observacionesPorFranjaHoraria,
    observacionesPorUsuario: Object.entries(observacionesPorUsuario).map(
      ([usuario, cantidad]) => ({ usuario, cantidad })
    ),
  });
});



const validateUser = catchError(async (req, res) => {
  const { email, code } = req.body;

  if (!email) {
    return res.status(400).json({ error: "El email es requerido" });
  }

  // Buscar usuario
  const user = await User.findOne({ where: { email } });

  if (!user) {
    return res.status(200).json({
      exists: false,
      enrolled: false,
      user: null,
    });
  }

  // Buscar inscripción del usuario para el curso específico
  const inscripcion = await Inscripcion.findOne({
    where: { userId: user.id, curso: code },
  });

  if (inscripcion) {
    return res.status(200).json({
      exists: true,
      enrolled: true,
      user,
      inscripcion, // solo la inscripción del curso que coincide con code
    });
  }

  return res.status(200).json({
    exists: true,
    enrolled: false,
    user,
  });
});

const create = catchError(async (req, res) => {
  const {
    cedula,
    email,
    nombres,
    apellidos,
    celular,
    grado,
    subsistema,
    curso,
    aceptacion,
    courseId,
  } = req.body;

  if (!email || !courseId) {
    return res.status(400).json({ error: "Email y courseId son requeridos" });
  }

  // Buscar usuario local
  let user = await User.findOne({ where: { email } });
  let usuarioMoodleNuevo = false;

  if (user) {
    await user.update({ cI: cedula, cellular: celular, grado, subsistema });
  } else {
    user = await User.create({
      cI: cedula,
      email,
      firstName: nombres,
      lastName: apellidos,
      cellular: celular,
      grado,
      subsistema,
    });
    usuarioMoodleNuevo = true;
  }

  // Buscar curso
  const course = await Course.findByPk(courseId);
  if (!course) return res.status(404).json({ error: "Curso no encontrado" });

  let inscripcion = null;

  try {
    // Intentamos crear y matricular usuario en Moodle
    const resultadoMoodle = await registrarUsuarioEnCurso({
      cedula,
      nombres,
      apellidos,
      email,
      courseShortname: course.sigla,
    });

    if (!resultadoMoodle) {
      console.error("❌ No se pudo registrar usuario en Moodle. Inscripción local NO creada.");
    } else {
      console.log(`✅ Usuario ${cedula} inscrito en Moodle curso ${course.nombre}`);

      // Guardamos el ID Moodle en nuestra base local si no lo tiene
      if (!user.moodleId) {
        await user.update({ moodleId: resultadoMoodle.usuario.id });
      }

      // Registramos la inscripción solo si Moodle fue exitoso
      inscripcion = await Inscripcion.findOne({
        where: { userId: user.id, courseId },
      });

      if (!inscripcion) {
        inscripcion = await Inscripcion.create({
          aceptacion,
          curso,
          courseId,
          userId: user.id,
        });
      }
    }
  } catch (error) {
    console.error("Error con Moodle:", error.message);
  }

  // URL curso Moodle
  const cursoUrl = `${process.env.MOODLE_URL}/course/view.php?id=${course.nombreCorto}`;

  // Enviar correo
  await sendEmail({
    to: email,
    subject: "🎓 Inscripción confirmada - iDr.Mind",
    html: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #eef2f6; padding: 25px; color: #2d2d2d;">
  <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 18px rgba(0,0,0,0.08); overflow: hidden;">

    <!-- Encabezado -->
    <div style="text-align: center; background: linear-gradient(135deg, #0a2540, #174a8c); padding: 25px;">
      <img src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1760413741/1_qvykyo.png" alt="iDr.Mind" style="width: 160px;" />
    </div>

    <!-- Cuerpo -->
    <div style="padding: 35px; text-align: center;">
      <h2 style="color: #174a8c; font-weight: 700;">¡Hola ${nombres} ${apellidos}!</h2>
      <h3 style="font-weight: normal; margin-top: 10px;">🎉 ¡Tu inscripción ha sido confirmada!</h3>
      <h2 style="color: #0a2540; margin-top: 10px;">"${course.nombre}"</h2>

      <p style="margin-top: 20px; font-size: 16px; line-height: 1.7;">
        Nos alegra darte la bienvenida a <strong>iDr.Mind</strong>. Has dado un paso importante hacia tu crecimiento profesional al unirte a nuestro curso.
      </p>

<p style="font-size: 16px; line-height: 1.7;">
  ${usuarioMoodleNuevo
    ? `Tus credenciales para ingresar a la plataforma son: <br>
       <strong>Usuario:</strong> ${cedula} <br>
       <strong>Contraseña:</strong> Mp${cedula}*`
    : `Ya tienes un usuario en nuestra plataforma. Usa tus credenciales habituales para ingresar.`}
</p>


      <p style="font-size: 16px; line-height: 1.7;">
        Accede directamente a tu curso aquí: 
        <a href="${cursoUrl}" target="_blank" style="color:#007BFF; text-decoration:none;">Ir al curso</a>
      </p>

      <div style="margin: 30px auto; width: 85%; background-color: #f7f9fc; border-left: 4px solid #174a8c; padding: 15px; border-radius: 8px;">
        <p style="font-style: italic; font-size: 15px; color: #555;">
          “En iDr.Mind impulsamos el crecimiento profesional y organizacional a través del conocimiento y la innovación.”
        </p>
      </div>

      <!-- WhatsApp -->
      <p style="margin-top: 25px; font-size: 15px; color: #333; line-height: 1.6;">
        Si tienes alguna pregunta o necesitas asistencia, contáctanos directamente por WhatsApp:
      </p>
      <a href="https://wa.me/593979002223" target="_blank" rel="noopener noreferrer"
        style="display: inline-block; margin-top: 15px; background: #25D366; color: white; font-weight: 600; padding: 12px 22px; border-radius: 30px; text-decoration: none; font-size: 15px; transition: background 0.3s;">
        💬 Contactar por WhatsApp
      </a>

      <p style="margin-top: 30px; font-size: 14px; color: #777;">
        Si no realizaste esta inscripción, por favor comunícate con nosotros inmediatamente.
      </p>

      <!-- Redes sociales -->
      <div style="margin-top: 45px; text-align: center;">
        <p style="font-size: 14px; color: #555; margin-bottom: 18px;">Síguenos en nuestras redes sociales:</p>
        <div style="text-align: center; margin-top: 25px;">
          <a href="https://www.facebook.com/profile.php?id=100054880556231&mibextid=ZbWKwL"
            target="_blank" rel="noopener noreferrer"
            style="display: inline-block; text-decoration: none; margin: 0 12px;">
            <img src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1761701111/facebook_zm9lvo.png"
              alt="Facebook" width="34" height="34" style="vertical-align: middle;" />
          </a>
          <a href="https://www.tiktok.com/@idr.mind?_t=8rXF11o0DPs&_r=1"
            target="_blank" rel="noopener noreferrer"
            style="display: inline-block; text-decoration: none; margin: 0 12px;">
            <img src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1761701130/tik-tok_wbtykw.png"
              alt="TikTok" width="34" height="34" style="vertical-align: middle;" />
          </a>
          <a href="https://www.instagram.com/idr.mind/"
            target="_blank" rel="noopener noreferrer"
            style="display: inline-block; text-decoration: none; margin: 0 12px;">
            <img src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1761701119/instagram_ljg7hu.png"
              alt="Instagram" width="34" height="34" style="vertical-align: middle;" />
          </a>
        </div>
      </div>
    </div>

    <!-- Pie -->
    <div style="background-color: #f5f6fa; text-align: center; padding: 18px; font-size: 12px; color: #999;">
      © ${new Date().getFullYear()} iDr.Mind. Todos los derechos reservados.
    </div>
  </div>
</div>
    `,
  });

  // Emitir evento socket
  const io = req.app.get("io");
  if (io) io.emit("inscripcionCreada", { inscripcion, user, course });

  return res.status(201).json({ inscripcion, user, course });
});

const getOne = catchError(async (req, res) => {
  const { id } = req.params;
  const result = await Inscripcion.findByPk(id);
  if (!result) return res.sendStatus(404);
  return res.json(result);
});

const remove = catchError(async (req, res) => {
  const { id } = req.params;
  await Inscripcion.destroy({ where: { id } });
  return res.sendStatus(204);
});

const update = catchError(async (req, res) => {
  const { id } = req.params;

  const result = await Inscripcion.update(req.body, {
    where: { id },
    returning: true,
  });

  if (result[0] === 0)
    return res.status(404).json({ message: "Inscripción no encontrada" });

  const inscripcionActualizada = result[1][0];

  // Emitir evento a todos los clientes conectados
  const io = req.app.get("io");
  if (io) io.emit("inscripcionActualizada", inscripcionActualizada);

  return res.json(inscripcionActualizada);
});

module.exports = {
  getAll,
  getDashboardInscripciones,
  getDashboardObservaciones,
  validateUser,
  create,
  getOne,
  remove,
  update,
};
