const crypto = require('crypto');
const { Op } = require('sequelize');
const db = require('./connection');
const Coupon = require('../models/BenefitCoupon');
const Redemption = require('../models/BenefitCouponRedemption');
const Inscripcion = require('../models/Inscripcion');
const User = require('../models/User');
const Course = require('../models/Course');
const Evaluation = require('../models/PsychometricEvaluation');
const Access = require('../models/PsychometricAccessToken');
const Pagos = require('../models/Pagos');
const { selected, cents, calculate } = require('./couponPricing');
const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };
const normalize = value => String(value || '').trim().toUpperCase();
const types = ['cert_emp', 'cert_mdt', 'cert_int'];
async function context(req, transaction, lock = false) {
  let evaluation, inscription;
  if (req.params.token) {
    const access = await Access.findOne({ where: { tokenHash: crypto.createHash('sha256').update(req.params.token).digest('hex'), purpose: 'payment', activo: true, revokedAt: null }, transaction });
    if (!access || new Date(access.expiresAt).getTime() <= Date.now()) fail('Enlace de pago inválido o vencido.', 401);
    evaluation = await Evaluation.findByPk(access.evaluationId, { transaction });
    if (!evaluation || evaluation.estado !== 'completada') fail('La evaluación debe estar completada.');
    inscription = await Inscripcion.findByPk(evaluation.inscripcionId, { transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}) });
  } else {
    inscription = await Inscripcion.findByPk(req.body.inscripcionId, { transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}) });
    if (!inscription || String(inscription.userId) !== String(req.user?.id)) fail('Inicia sesión con la cuenta titular de la inscripción.', 403);
    if (req.body.evaluationId) {
      evaluation = await Evaluation.findByPk(req.body.evaluationId, { transaction });
      if (!evaluation || evaluation.inscripcionId !== inscription.id || evaluation.estado !== 'completada') fail('Evaluación no aplicable.');
    }
  }
  if (evaluation && !evaluation.resultado) fail('La evaluación aún no tiene resultados calculados.');
  if (!inscription) fail('Inscripción no encontrada.', 404);
  const user = await User.findByPk(inscription.userId, { transaction });
  const course = await Course.findByPk(inscription.courseId, { transaction });
  if (!user || !course) fail('No existe el participante o servicio.', 404);
  const servicio = evaluation ? 'resultados' : 'certificados';
  if (!evaluation && course.tipo === 'test_psicotecnico') fail('Selecciona una evaluación completada.');
  const seleccion = evaluation ? [] : types.filter(t => selected(req.body[t]) || (Array.isArray(req.body.seleccion) && req.body.seleccion.includes(t))).sort();
  if (!evaluation && !seleccion.length) fail('Selecciona al menos un certificado.', 400);
  const original = evaluation ? Number(course.precio_emp) : seleccion.reduce((sum, type) => sum + cents(course['precio_' + type.slice(5)]), 0) / 100;
  if (!Number.isFinite(original) || original <= 0) fail('El catálogo no contiene un precio de pago válido.');
  return { evaluation, inscription, user, course, servicio, seleccion, original, referencia: evaluation ? `evaluation:${evaluation.id}:individual` : `certificate:${inscription.id}:${seleccion.join(',')}` };
}
function restrictions(c, ctx) {
  const now = Date.now();
  if (!c.activo) fail('Cupón suspendido.');
  if (c.vigenteDesde && new Date(c.vigenteDesde).getTime() > now) fail('El cupón todavía no está vigente.');
  if (c.venceAt && new Date(c.venceAt).getTime() <= now) fail('Cupón vencido.');
  if (c.usos >= c.maxUsos) fail('Cupón agotado: no existen cupos disponibles.');
  const configurationError = require('./couponRules').configurationError(c, true);
  if (configurationError) fail('La configuración del cupón requiere corrección administrativa: ' + configurationError);
  if (c.servicio !== ctx.servicio) fail('El cupón no corresponde al servicio solicitado.');
  const company = ctx.evaluation ? ctx.evaluation.empresaIdSnapshot : ctx.user.empresaId;
  if (c.empresaId && c.empresaId !== company) fail('Cupón reservado para otra empresa.', 403);
  if (c.objetivoId && ![ctx.course.id, ctx.evaluation?.testId].includes(c.objetivoId)) fail('Cupón no aplicable a este curso o test.');
  if (c.beneficiarios?.length && !c.beneficiarios.map(x => String(x).trim().toLowerCase()).some(x => [ctx.user.id, ctx.user.cI, ctx.user.email?.toLowerCase()].includes(x))) fail('El participante no está autorizado para este cupón.', 403);
  if (ctx.servicio === 'resultados' && !c.incluyeResultados) fail('Este cupón no autoriza resultados individuales.');
  if (ctx.seleccion.some(t => !c.certificadosPermitidos.includes(t))) fail('El cupón no cubre todos los certificados seleccionados.');
}
async function quote(ctx, codigo, transaction, lock) {
  const c = await Coupon.findOne({ where: { codigo: normalize(codigo) }, transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}) });
  if (!c) fail('El código de cupón no existe.', 404);
  const previous = await Redemption.findOne({ where: { referencia: ctx.referencia, servicio: ctx.servicio }, transaction });
  if (previous) {
    if (previous.couponId !== c.id) fail('Ya existe otro cupón aplicado a este servicio.');
    return { c, previous, ...previous.toJSON() };
  }
  restrictions(c, ctx);
  if (await Redemption.count({ where: { couponId: c.id, userId: ctx.user.id, servicio: { [Op.ne]: null } }, transaction }) >= c.maxPorPersona) fail('El participante alcanzó el límite de usos.');
  // No permitir descuentos superpuestos sobre un certificado ya seleccionado.
  if (ctx.servicio === 'certificados') {
    const rows = await Redemption.findAll({ where: { inscripcionId: ctx.inscription.id, servicio: 'certificados' }, transaction });
    if (rows.some(r => r.seleccion.some(t => ctx.seleccion.includes(t)))) fail('Ya existe un cupón para alguno de los certificados seleccionados.');
    const paid = await Pagos.findAll({ where: { inscripcionId: ctx.inscription.id, confirmacion: true }, transaction });
    if (paid.some(p => ctx.seleccion.some(t => selected(p[t])))) fail('Ya existe un comprobante para alguno de los certificados seleccionados.');
  } else {
    if (ctx.evaluation.resultadoLiberado || await Pagos.count({ where: { psychometricEvaluationId: ctx.evaluation.id }, transaction })) fail('La evaluación ya tiene autorización o comprobante registrado.');
  }
  return { c, ...calculate(ctx.original, c) };
}
function summary(row) {
  const r = row.toJSON ? row.toJSON() : row;
  return { id: r.id, codigo: r.couponSnapshot?.codigo, nombre: r.couponSnapshot?.nombre, servicio: r.servicio, seleccion: r.seleccion, precioOriginal: Number(r.precioOriginal), montoDescontado: Number(r.montoDescontado), saldoPendiente: Number(r.saldoPendiente), cubierto: r.cubierto, createdAt: r.createdAt, couponSnapshot: r.couponSnapshot };
}
async function apply(req, redeem) {
  return db.transaction(async transaction => {
    const ctx = await context(req, transaction, true);
    const q = await quote(ctx, req.body.codigo, transaction, true);
    if (!redeem) return { valid: true, codigo: q.c.codigo, nombre: q.c.nombre, precioOriginal: Number(q.precioOriginal), montoDescontado: Number(q.montoDescontado), saldoPendiente: Number(q.saldoPendiente), cubierto: q.cubierto, aplicado: Boolean(q.previous) };
    if (q.previous) return summary(q.previous);
    const row = await Redemption.create({ couponId: q.c.id, userId: ctx.user.id, inscripcionId: ctx.inscription.id, evaluationId: ctx.evaluation?.id || null, referencia: ctx.referencia, servicio: ctx.servicio, seleccion: ctx.seleccion, precioOriginal: q.precioOriginal, montoDescontado: q.montoDescontado, saldoPendiente: q.saldoPendiente, cubierto: q.cubierto, couponSnapshot: { codigo: q.c.codigo, nombre: q.c.nombre, creadoPor: q.c.creadoPor, descuentoTipo: q.c.tipo === 'descuento' ? q.c.descuentoTipo : 'cortesia', descuentoValor: q.c.descuentoValor, alcance: ctx.servicio === 'resultados' ? 'individual' : 'certificados', empresaId: q.c.empresaId } }, { transaction });
    await q.c.increment('usos', { transaction });
    if (q.cubierto && ctx.evaluation) await ctx.evaluation.update({ resultadoLiberado: true, resultadoGeneradoAt: ctx.evaluation.resultadoGeneradoAt || new Date() }, { transaction });
    return summary(row);
  });
}
async function fullEvaluation(evaluationId) {
  return Redemption.findOne({ where: { evaluationId, servicio: 'resultados', cubierto: true } });
}
async function createPayment(data) {
  return db.transaction(async transaction => {
    await Inscripcion.findByPk(data.inscripcionId, { transaction, lock: transaction.LOCK.UPDATE });
    const selection = types.filter(t => selected(data[t])).sort();
    const referencia = data.psychometricEvaluationId ? `evaluation:${data.psychometricEvaluationId}:individual` : `certificate:${data.inscripcionId}:${selection.join(',')}`;
    const rows = await Redemption.findAll({ where: { inscripcionId: data.inscripcionId, servicio: data.psychometricEvaluationId ? 'resultados' : 'certificados' }, transaction });
    const r = rows.find(r => r.referencia === referencia);
    if (!r && !data.psychometricEvaluationId && rows.some(r => r.seleccion.some(t => selection.includes(t)))) fail('La selección debe coincidir exactamente con los certificados del cupón aplicado.');
    if (r) {
      if (r.cubierto) fail('Este servicio ya está autorizado con cupón. No necesita comprobante.');
      if (cents(data.valorDepositado) !== cents(r.saldoPendiente)) fail(`El pago debe corresponder al saldo del cupón: $${Number(r.saldoPendiente).toFixed(2)}.`);
      if (await Pagos.count({ where: { couponRedemptionId: r.id }, transaction })) fail('Ya existe un comprobante asociado al cupón.');
      data.couponRedemptionId = r.id;
    }
    data.verificado = false;
    return Pagos.create(data, { transaction });
  });
}
async function paymentSummary(payment) {
  if (!payment.couponRedemptionId) return null;
  const r = await Redemption.findByPk(payment.couponRedemptionId);
  if (!r) fail('No se encontró el canje asociado.');
  return { ...summary(r), valorDepositado: Number(payment.valorDepositado), corresponde: cents(payment.valorDepositado) === cents(r.saldoPendiente) };
}
async function certificateAuthorization(inscripcionId, tipo, transaction) {
  if (!types.includes(tipo)) fail('Tipo de certificado inválido.',400);
  const payments = await Pagos.findAll({where:{inscripcionId,tipoPago:'curso',verificado:true},transaction,order:[['createdAt','DESC']]});
  for (const p of payments) {
    if (!selected(p[tipo])) continue;
    if (p.couponRedemptionId) {
      const r = await Redemption.findByPk(p.couponRedemptionId,{transaction});
      if (!r || r.inscripcionId !== inscripcionId || r.servicio !== 'certificados' || !r.seleccion.includes(tipo) || cents(p.valorDepositado) !== cents(r.saldoPendiente)) continue;
      return {metodo:'pago_con_descuento',couponRedemptionId:r.id,paymentId:p.id,codigo:r.couponSnapshot?.codigo};
    }
    return {metodo:'pago_validado',paymentId:p.id};
  }
  const rows = await Redemption.findAll({where:{inscripcionId,servicio:'certificados',cubierto:true},transaction});
  const r = rows.find(row=>row.seleccion.includes(tipo));
  return r ? {metodo:'cupon',couponRedemptionId:r.id,codigo:r.couponSnapshot?.codigo} : null;
}
module.exports = { certificateAuthorization, apply, context, fullEvaluation, summary, createPayment, paymentSummary, types, fail };
