const crypto = require('crypto');
const sequelize = require('../utils/connection');
const User = require('../models/User');
const Evaluation = require('../models/PsychometricEvaluation');
const Answer = require('../models/PsychometricAnswer');
const AccessToken = require('../models/PsychometricAccessToken');
const Identity = require('../models/PsychometricIdentityVerification');
const Pagos = require('../models/Pagos');
const Code = require('../models/SensitiveActionCode');
const sendEmail = require('../utils/sendEmail');
const { isSuperAdmin } = require('../utils/sessionSecurity');
const ttl = Math.max(1, Number(process.env.DELETE_CODE_MINUTES || 5));
const hash = (code, userId, evaluationId) => crypto.createHmac('sha256', process.env.TOKEN_SECRET).update(`${userId}:${evaluationId}:${code}`).digest('hex');
async function authorized(req, res) {
  // Consultar BD; nunca confiar en el rol/CI dentro de un token o el frontend.
  const user = await User.findByPk(req.user.id);
  if (!isSuperAdmin(user)) { res.status(403).json({ message: 'Operación exclusiva de superadministradores' }); return null; }
  if (!user.email) { res.status(400).json({ message: 'El administrador no tiene correo registrado' }); return null; }
  return user;
}
const requestDeletion = async (req, res, next) => {
  try {
    const user = await authorized(req, res); if (!user) return;
    const evaluation = await Evaluation.findByPk(req.params.evaluationId);
    if (!evaluation) return res.sendStatus(404);
    const last = await Code.findOne({ where: { userId: user.id, evaluationId: evaluation.id }, order: [['createdAt', 'DESC']] });
    if (last && Date.now() - new Date(last.createdAt).getTime() < 60000) return res.status(429).json({ message: 'Espera 60 segundos antes de solicitar otro código' });
    const code = String(crypto.randomInt(100000, 1000000));
    const record = await Code.create({ userId: user.id, evaluationId: evaluation.id, codeHash: hash(code, user.id, evaluation.id), expiresAt: new Date(Date.now() + ttl * 60000) });
    try {
      await sendEmail({ to: user.email, subject: 'iDr.Mind | Confirmación de eliminación', text: `Código de eliminación: ${code}. Válido durante ${ttl} minutos. Evaluación: ${evaluation.id}. Si no solicitaste esto, ignora el mensaje.` });
    } catch (error) { await record.destroy(); throw error; }
    return res.json({ message: 'Código enviado al correo del administrador', expiresInSeconds: ttl * 60 });
  } catch (err) { next(err); }
};
const confirmDeletion = async (req, res, next) => {
  try {
    const user = await authorized(req, res); if (!user) return;
    const { evaluationId } = req.params;
    const code = String(req.body?.code || '').trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ message: 'Ingresa el código de seis dígitos' });
    const record = await Code.findOne({ where: { userId: user.id, evaluationId, consumedAt: null }, order: [['createdAt', 'DESC']] });
    if (!record || new Date(record.expiresAt).getTime() < Date.now() || record.attempts >= 5) return res.status(400).json({ message: 'Código expirado o bloqueado. Solicita otro.' });
    const expected = Buffer.from(record.codeHash, 'hex'); const received = Buffer.from(hash(code, user.id, evaluationId), 'hex');
    if (!crypto.timingSafeEqual(expected, received)) { await record.increment('attempts'); return res.status(400).json({ message: 'Código incorrecto' }); }
    await sequelize.transaction(async transaction => {
      const evaluation = await Evaluation.findByPk(evaluationId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!evaluation) { const e = new Error('Evaluación no encontrada'); e.status = 404; throw e; }
      await record.update({ consumedAt: new Date() }, { transaction });
      await Pagos.update({ psychometricEvaluationId: null }, { where: { psychometricEvaluationId: evaluationId }, transaction });
      await Answer.destroy({ where: { evaluationId }, transaction });
      await AccessToken.destroy({ where: { evaluationId }, transaction });
      await Identity.destroy({ where: { evaluationId }, transaction });
      await evaluation.destroy({ transaction });
    });
    console.info('[AUDITORIA ELIMINACION PSICOMETRICA]', JSON.stringify({ evaluationId, adminId: user.id, timestamp: new Date().toISOString() }));
    return res.json({ message: 'Evaluación eliminada correctamente' });
  } catch (err) { if (err.status === 404) return res.status(404).json({ message: err.message }); next(err); }
};
module.exports = { requestDeletion, confirmDeletion };
