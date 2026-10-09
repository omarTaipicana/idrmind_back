const sendEmail = require("../utils/sendEmail");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeHtml = value => String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const limit = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
const submitCollaboration = async (req, res) => {
  const { website } = req.body || {};
  if (website) return res.status(202).json({ message: "Solicitud recibida" });
  const nombres = limit(req.body?.nombres, 120);
  const email = limit(req.body?.email, 180);
  const organizacion = limit(req.body?.organizacion, 160);
  const telefono = limit(req.body?.telefono, 35);
  const tipo = limit(req.body?.tipo, 100);
  const mensaje = limit(req.body?.mensaje, 4000);
  if (!nombres || !emailPattern.test(email) || !organizacion || !tipo || !mensaje) return res.status(400).json({ message: "Completa los campos obligatorios" });
  if ([req.body?.nombres,req.body?.email,req.body?.organizacion,req.body?.tipo,req.body?.mensaje].some(v => typeof v !== "string")) return res.status(400).json({ message: "Datos inválidos" });
  const recipient = process.env.IDRMIND_EMAIL;
  if (!recipient) return res.status(503).json({ message: "Servicio de contacto no configurado" });
  try {
    await sendEmail({ to: recipient, subject: "iDr.Mind | Nueva propuesta: Trabaja con nosotros", html: `<div style="font-family:Arial,sans-serif;color:#183451;max-width:640px;margin:auto"><h2>Nueva propuesta de colaboración</h2><p><b>Nombre:</b> ${escapeHtml(nombres)}</p><p><b>Organización:</b> ${escapeHtml(organizacion)}</p><p><b>Correo:</b> ${escapeHtml(email)}</p><p><b>Teléfono:</b> ${escapeHtml(telefono)}</p><p><b>Tipo:</b> ${escapeHtml(tipo)}</p><p><b>Propuesta:</b></p><p style="white-space:pre-wrap">${escapeHtml(mensaje)}</p></div>` });
    return res.status(202).json({ message: "Solicitud recibida" });
  } catch (error) {
    console.error("Error enviando propuesta de alianza:", error.message);
    return res.status(502).json({ message: "No se pudo enviar la propuesta" });
  }
};
module.exports = { submitCollaboration };
