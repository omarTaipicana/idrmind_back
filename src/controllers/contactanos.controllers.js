const catchError = require("../utils/catchError");
const sendEmail = require("../utils/sendEmail");
const Contactanos = require("../models/Contactanos");

const getAll = catchError(async (req, res) => {
  const results = await Contactanos.findAll();
  return res.json(results);
});

const create = catchError(async (req, res) => {
  const result = await Contactanos.create(req.body);
  const { email, nombres, mensaje } = req.body;

  await sendEmail({
    // to: "fernandoparadoja@gmail.com", // ✅ Tu correo personal
    to: "patriciomena1980@gmail.com", // ✅ Tu correo personal
    subject: "Nuevo mensaje desde iDr.Mind", // ✅ Asunto personalizado
    html: `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #eef2f6; padding: 25px; color: #2d2d2d;">
    <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08); overflow: hidden;">
      
      <!-- Encabezado con logo -->
      <div style="text-align: center; background: linear-gradient(135deg, #0a2540, #174a8c); padding: 25px;">
        <img src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1760413741/1_qvykyo.png" alt="iDr.Mind" style="width: 160px;" />
      </div>

      <!-- Cuerpo del mensaje -->
      <div style="padding: 35px;">
        <h2 style="color: #174a8c; text-align: center; font-weight: 700;">Nuevo contacto desde iDr.Mind</h2>
        
        <p style="margin-top: 20px; font-size: 15px;"><strong>Nombre:</strong> ${nombres}</p>
        <p style="font-size: 15px;"><strong>Correo:</strong> ${email}</p>
        <p style="font-size: 15px;"><strong>Mensaje:</strong></p>
        <div style="background-color: #f7f9fc; padding: 15px; border-radius: 8px; border-left: 4px solid #174a8c; font-style: italic;">
          ${mensaje}
        </div>

        <p style="margin-top: 35px; font-size: 14px; color: #777; text-align: center; line-height: 1.6;">
          Este mensaje fue enviado automáticamente desde el formulario de contacto de <strong>iDr.Mind</strong>.<br/>
          Si no solicitaste este mensaje, puedes ignorarlo con seguridad.
        </p>
      </div>

      <!-- Pie -->
      <div style="background-color: #f5f6fa; text-align: center; padding: 18px; font-size: 12px; color: #999;">
        © ${new Date().getFullYear()} iDr.Mind. Todos los derechos reservados.
      </div>

    </div>
  </div>
  `,
  });


  await sendEmail({
    to: email,
    subject: "Hemos recibido tu mensaje en iDr.Mind",
    html: `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #eef2f6; padding: 25px; color: #2d2d2d;">
    <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08); overflow: hidden;">

      <!-- Encabezado con logo -->
      <div style="text-align: center; background: linear-gradient(135deg, #0a2540, #174a8c); padding: 25px;">
        <img src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1760413741/1_qvykyo.png" alt="iDr.Mind" style="width: 160px;" />
      </div>

      <!-- Cuerpo del mensaje -->
      <div style="padding: 35px; text-align: center;">
        <h2 style="color: #174a8c; font-weight: 700;">¡Hola ${nombres}!</h2>
        <p style="margin-top: 20px; font-size: 16px; line-height: 1.7;">
          Gracias por comunicarte con <strong>iDr.Mind</strong>. Hemos recibido tu mensaje correctamente y uno de nuestros representantes se pondrá en contacto contigo muy pronto.
        </p>
        <p style="font-size: 16px; line-height: 1.7;">
          Valoramos tu interés en nuestros programas y servicios. Tu consulta nos ayuda a ofrecerte una atención más personalizada y efectiva.
        </p>

        <div style="margin: 30px auto; width: 80%; background-color: #f7f9fc; border-left: 4px solid #174a8c; padding: 15px; border-radius: 8px;">
          <p style="font-style: italic; font-size: 15px; color: #555;">
            “En iDr.Mind impulsamos el crecimiento profesional y organizacional a través del conocimiento y la innovación.”
          </p>
        </div>

        <!-- Mensaje de contacto rápido -->
        <p style="margin-top: 30px; font-size: 15px; color: #333; line-height: 1.6;">
          Si deseas una <strong>respuesta más rápida</strong>, puedes contactarnos directamente por WhatsApp haciendo clic en el siguiente botón:
        </p>

        <a href="https://wa.me/593979002223" target="_blank" rel="noopener noreferrer"
          style="display: inline-block; margin-top: 15px; background: #25D366; color: white; font-weight: 600; padding: 12px 22px; border-radius: 30px; text-decoration: none; font-size: 15px; transition: background 0.3s;">
          💬 Contáctanos por WhatsApp
        </a>

        <!-- Redes sociales -->
        <div style="margin-top: 45px; text-align: center;">
          <p style="font-size: 14px; color: #555; margin-bottom: 18px;">También puedes seguirnos en nuestras redes sociales:</p>
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





  return res.status(201).json(result);
});

const getOne = catchError(async (req, res) => {
  const { id } = req.params;
  const result = await Contactanos.findByPk(id);
  if (!result) return res.sendStatus(404);
  return res.json(result);
});

const remove = catchError(async (req, res) => {
  const { id } = req.params;
  await Contactanos.destroy({ where: { id } });
  return res.sendStatus(204);
});

const update = catchError(async (req, res) => {
  const { id } = req.params;
  const result = await Contactanos.update(req.body, {
    where: { id },
    returning: true,
  });
  if (result[0] === 0) return res.sendStatus(404);
  return res.json(result[1][0]);
});

module.exports = {
  getAll,
  create,
  getOne,
  remove,
  update,
};
