const Coupon = require('../models/BenefitCoupon');
const Redemption = require('../models/BenefitCouponRedemption');
const User = require('../models/User');
const db = require('../utils/connection');
const { isSuperAdmin } = require('../utils/sessionSecurity');
const { legacyTypes, effectiveType, configurationError } = require('../utils/couponRules');
const { validateTargets, options } = require('../services/couponOptions.service');
const fields = ['nombre','tipo','objetivoId','empresaId','descuentoTipo','descuentoValor','maxUsos','vigenteDesde','venceAt','incluyeResultados','activo','servicio','certificadosPermitidos','beneficiarios','maxPorPersona'];
const pick = source => Object.fromEntries(fields.filter(key => source[key] !== undefined).map(key => [key, source[key]]));
const invalid = message => { throw Object.assign(new Error(message), { status:400 }); };
const handle = (res,error) => {
  if (error.status) return res.status(error.status).json({message:error.message});
  if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({message:'Código existente.'});
  return res.status(500).json({message:'No se pudo guardar o consultar el cupón.',detail:process.env.NODE_ENV === 'development' ? error.message : undefined});
};
function prepare(source, allowLegacy = false) {
  const payload = pick(source);
  const error = configurationError(payload, allowLegacy);
  if (error) invalid(error);
  if (legacyTypes.includes(payload.tipo)) payload.tipo = effectiveType(payload);
  payload.nombre = String(payload.nombre || '').trim();
  if (!payload.nombre) invalid('El nombre del beneficio es obligatorio.');
  if (!Number.isInteger(Number(payload.maxUsos)) || Number(payload.maxUsos) < 1) invalid('Cantidad de usos inválida.');
  if (!Number.isInteger(Number(payload.maxPorPersona)) || Number(payload.maxPorPersona) < 1) invalid('Límite por persona inválido.');
  if (!Array.isArray(payload.beneficiarios) || payload.beneficiarios.some(v => typeof v !== 'string' || !v.trim())) invalid('Beneficiarios inválidos.');
  if (!Array.isArray(payload.certificadosPermitidos) || payload.certificadosPermitidos.some(v => !['cert_emp','cert_mdt','cert_int'].includes(v))) invalid('Certificados inválidos.');
  if (payload.servicio === 'certificados' && !payload.certificadosPermitidos.length) invalid('Selecciona al menos un certificado autorizado.');
  payload.incluyeResultados = payload.servicio === 'resultados';
  if (payload.servicio === 'resultados') payload.certificadosPermitidos = [];
  if ([payload.vigenteDesde,payload.venceAt].some(v => v && !Number.isFinite(new Date(v).getTime()))) invalid('Fecha inválida.');
  if (payload.venceAt && payload.vigenteDesde && new Date(payload.venceAt) <= new Date(payload.vigenteDesde)) invalid('El vencimiento debe ser posterior al inicio.');
  if (payload.tipo === 'descuento') {
    const value = Number(payload.descuentoValor);
    if (!['porcentaje','fijo'].includes(payload.descuentoTipo) || !Number.isFinite(value) || value <= 0 || (payload.descuentoTipo === 'porcentaje' && value > 100)) invalid('Descuento inválido.');
  } else {
    payload.descuentoTipo = null;
    payload.descuentoValor = null;
  }
  return payload;
}
exports.admin = async(req,res,next) => {
  try {
    if (!req.user?.id) return res.status(401).json({message:'Autenticación requerida.'});
    const user = await User.findByPk(req.user.id);
    if (!user || !isSuperAdmin(user)) return res.status(403).json({message:'Acceso exclusivo para Superadmin.'});
    next();
  } catch(error) { next(error); }
};
exports.options = async(req,res) => { try {res.json(await options(req.query));} catch(error) {handle(res,error);} };
exports.list = async(req,res) => { try {res.json(await Coupon.findAll({order:[['createdAt','DESC']],limit:500}));} catch(error) {handle(res,error);} };
exports.create = async(req,res) => {
  try {
    const payload = prepare(req.body);
    payload.codigo = String(req.body.codigo || '').trim().toUpperCase();
    if (!payload.codigo || payload.codigo.length > 80) invalid('El código es obligatorio y admite hasta 80 caracteres.');
    payload.creadoPor = req.user.id;
    await validateTargets(payload);
    res.status(201).json(await Coupon.create(payload));
  } catch(error) { handle(res,error); }
};
exports.update = async(req,res) => {
  try {
    const result = await db.transaction(async transaction => {
      const coupon = await Coupon.findByPk(req.params.id,{transaction,lock:transaction.LOCK.UPDATE});
      if (!coupon) throw Object.assign(new Error('Cupón no encontrado.'),{status:404});
      // Siempre permitir suspender un código anterior, aunque requiera corregir su configuración.
      if (Object.keys(req.body).length === 1 && req.body.activo === false) return coupon.update({activo:false},{transaction});
      const allowLegacy = legacyTypes.includes(coupon.tipo) && (!req.body.tipo || req.body.tipo === coupon.tipo);
      const payload = prepare({...coupon.toJSON(),...pick(req.body)},allowLegacy);
      if (Number(payload.maxUsos) < coupon.usos) invalid('El límite no puede ser menor que los usos registrados.');
      await validateTargets(payload,transaction);
      return coupon.update(payload,{transaction});
    });
    res.json(result);
  } catch(error) { handle(res,error); }
};
exports.history = async(req,res) => {
  try {res.json(await Redemption.findAll({where:{couponId:req.params.id},order:[['createdAt','DESC']],limit:500}));} catch(error) {handle(res,error);}
};
