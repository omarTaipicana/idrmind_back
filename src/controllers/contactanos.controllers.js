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
  const iDrMindEmail = process.env.IDRMIND_EMAIL ;


  await sendEmail({
    to: iDrMindEmail, // ✅ Tu correo personal
    subject: "Alguien intenta contactar con iDr.Mind", // ✅ Asunto personalizado
    html: `
  <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
      
 <!-- Encabezado -->
    <div style="text-align: center; background: linear-gradient(135deg, #0a2540, #174a8c); padding: 25px;">
      <img src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1760413741/1_qvykyo.png" alt="iDr.Mind" style="width: 160px;" />
    </div>

      <!-- Cuerpo del mensaje -->
      <div style="padding: 30px;">
        <h2 style="color: #1B326B; text-align: center;">Nuevo contacto desde el formulario iDr.Mind</h2>
        
        <p><strong>Nombre:</strong> ${nombres}</p>
        <p><strong>Correo:</strong> ${email}</p>
        <p><strong>Mensaje:</strong></p>
        <div style="background-color: #f1f1f1; padding: 15px; border-radius: 5px; font-style: italic;">
          ${mensaje}
        </div>

        <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
          Este mensaje fue generado automáticamente desde el formulario de contacto en iDr.Mind.
        </p>
      </div>

      <!-- Pie -->
      <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #999;">
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
    <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
    <!-- Encabezado -->
    <div style="text-align: center; background: linear-gradient(135deg, #0a2540, #174a8c); padding: 25px;">
      <img src="https://res.cloudinary.com/dfq3tzlki/image/upload/v1760413741/1_qvykyo.png" alt="iDr.Mind" style="width: 160px;" />
    </div>
        <div style="padding: 30px; text-align: center;">
          <h2 style="color: #1B326B;">¡Hola ${nombres}!</h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Gracias por escribirnos. Hemos recibido tu mensaje y en breve uno de nuestros representantes se pondrá en contacto contigo.
          </p>
          <p style="font-size: 16px; line-height: 1.6;">
            Tu mensaje nos ayuda a mejorar y a ofrecerte una atención más personalizada.
          </p>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            Mientras tanto, puedes seguirnos en nuestras redes sociales para estar al día con nuestras novedades.
          </p>
        </div>
        <div style="background-color: #f0f0f0; text-align: center; padding: 15px; font-size: 12px; color: #999;">
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
