const nodemailer = require("nodemailer");

const sendEmail = (options) =>
  new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com", // Servidor SMTP correcto
      port: 465,                  // o 587 si prefieres TLS
      secure: true,               // true para 465, false para 587
      auth: {
        user: process.env.EMAIL,      // ej: no-reply@acadexeduc.com
        pass: process.env.PASSWORD,   // contraseña del buzón de Hostinger
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `".Dr.Mind." <${process.env.EMAIL}>`,
      ...options,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("❌ Error al enviar:", error);
        return reject({ message: "Error sending email", error });
      }
      console.log("✅ Correo enviado:", info.messageId);
      return resolve({ message: "Email sent successfully" });
    });
  });

module.exports = sendEmail;
