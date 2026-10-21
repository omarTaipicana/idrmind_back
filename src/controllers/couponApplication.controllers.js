const crypto = require('crypto');
const { Op } = require('sequelize');
const service = require('../utils/benefitCoupon.service');
const Redemption = require('../models/BenefitCouponRedemption');
const Access = require('../models/PsychometricAccessToken');
const Inscripcion = require('../models/Inscripcion');
const Course = require('../models/Course');
const User = require('../models/User');
const Certificado = require('../models/Certificado');
const wrap = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { if (e.status) return res.status(e.status).json({ message: e.message }); next(e); } };
const apply = redeem => wrap(async (req, res) => {
  const result = await service.apply(req, redeem);
  // Crear un token de consulta individual sin tocar accesos empresariales.
  if (redeem && result.cubierto && result.servicio === 'resultados') {
    const row = await Redemption.findByPk(result.id);
    const token = crypto.randomBytes(32).toString('hex');
    await Access.create({ evaluationId: row.evaluationId, tokenHash: crypto.createHash('sha256').update(token).digest('hex'), purpose: 'result', activo: true, expiresAt: new Date(Date.now() + 7 * 86400000) });
    result.resultPath = '/resultado-psicometrico/' + token;
  }
  res.json({ ...result, message: redeem ? result.cubierto ? 'Servicio autorizado con cupón.' : 'Descuento aplicado. Registra únicamente el saldo pendiente.' : 'Cupón válido. Confirma para aplicar el beneficio.' });
});
exports.check = apply(false);
exports.redeem = apply(true);
exports.status = wrap(async (req, res) => {
  const ctx = await service.context(req);
  const rows = await Redemption.findAll({ where: { inscripcionId: ctx.inscription.id, ...(ctx.evaluation ? { evaluationId: ctx.evaluation.id } : { servicio: 'certificados' }) }, order: [['createdAt','DESC']] });
  res.json(rows.map(service.summary));
});
exports.register = wrap(async(req,res)=>res.json(await require('../services/couponRegister.service').register(req.query)));
exports.adminHistory = wrap(async (req, res) => {
  const rows = await Redemption.findAll({ where: { servicio: { [Op.ne]: null } }, order: [['createdAt','DESC']], limit: 1000 });
  const ids = [...new Set(rows.map(r => r.userId))];
  const users = ids.length ? await User.findAll({ where: { id: ids }, attributes: ['id','firstName','lastName','cI','email'] }) : [];
  res.json(rows.map(r => ({ ...service.summary(r), user: users.find(u => u.id === r.userId), inscripcionId: r.inscripcionId, evaluationId: r.evaluationId })));
});
exports.issueCertificate = wrap(async (req, res) => {
  const r = await Redemption.findByPk(req.params.id);
  if (!r || !r.cubierto || r.servicio !== 'certificados') service.fail('No existe autorización completa para este certificado.', 403);
  const inscription = await Inscripcion.findByPk(r.inscripcionId);
  const owner = req.user?.id === r.userId;
  if (!owner && !require('../utils/requirePsychometricAdmin').canAccess(req.user)) service.fail('Acceso no autorizado.',403);
  const tipo = req.body.tipo || 'cert_emp';
  if (!r.seleccion.includes(tipo)) service.fail('El cupón no incluye este certificado.', 403);
  // MDT e internacional conservan su flujo de emisión/importación institucional.
  if (tipo !== 'cert_emp') service.fail('Este certificado se emite mediante el proceso institucional existente; el cupón ya acredita su autorización de pago.');
  const course = await Course.findByPk(inscription.courseId);
  const user = await User.findByPk(inscription.userId);
  await require('../utils/certificateEligibility')(user, course);
  const result = await require('../utils/connection').transaction(async transaction => {
    await inscription.reload({transaction,lock:transaction.LOCK.UPDATE});
    const existing = await Certificado.findOne({ where: { inscripcionId: inscription.id, tipo, curso: course.sigla }, transaction });
    if (existing) return { certificado: existing, url: existing.url, message: 'Certificado ya emitido.' };
    const output = await require('../utils/generarCertificado')({ inscripcionId: inscription.id, authorizationId: r.id });
    const base = process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
    const url = `${base}/uploads/certificados/${String(output.dataCertificado.cursoSigla).toLowerCase()}/${output.fileName}`;
    const certificate = await Certificado.create({ couponRedemptionId:r.id, inscripcionId: inscription.id, curso: output.dataCertificado.cursoSigla, grupo: output.dataCertificado.grupo, tipo, url, entregado: true }, {transaction});
    return { certificado: certificate, url, message: 'Certificado emitido con cupón.' };
  });
  res.json(result);
});
