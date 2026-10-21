const { QueryTypes } = require('sequelize');
const db = require('../utils/connection');
const allowedTypes = ['test_gratis','descuento','certificado_gratis'];
const couponStates = ['activo','suspendido','vencido','agotado','proximo'];
const executionStates = ['sin_usar','canjeado','completado','pendiente_pago','pendiente_certificado','pendiente_resultado'];
const invalid = message => { throw Object.assign(new Error(message), {status:400}); };
const dateColumns = {creacion:'"creadoAt"',canje:'"canjeadoAt"',vencimiento:'"venceAt"'};
function dateBound(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid('Fecha inválida.');
  const date = new Date(`${value}T00:00:00-05:00`);
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime()-5*3600000).toISOString().slice(0,10)!==value) invalid('Fecha inválida.');
  return date;
}
// Una fila por canje; los códigos nunca usados también se incluyen.
const source = `WITH registro AS (
 SELECT c.id AS "couponId", c.codigo, c.nombre, CASE WHEN c.tipo::text IN ('curso_gratis','paquete_empresa') THEN
 CASE WHEN COALESCE(r.servicio,c.servicio)='resultados' THEN 'test_gratis' ELSE 'certificado_gratis' END
 ELSE c.tipo::text END AS tipo,
 COALESCE(r.servicio,c.servicio) AS servicio, c."descuentoTipo"::text AS "descuentoTipo", c."descuentoValor", c."certificadosPermitidos", c."createdAt" AS "creadoAt", c."vigenteDesde", c."venceAt", c.usos,
 c."empresaId", c."objetivoId", COALESCE(organization."nombreComercial",organization."razonSocial") AS "empresaNombre", target.nombre AS "cursoAsignado",
 c."maxUsos", GREATEST(c."maxUsos"-c.usos,0) AS disponibles,
 CASE WHEN NOT c.activo THEN 'suspendido' WHEN c."venceAt"<=NOW() THEN 'vencido'
 WHEN c."vigenteDesde">NOW() THEN 'proximo' WHEN c.usos>=c."maxUsos" THEN 'agotado' ELSE 'activo' END AS "estadoCupon",
 r.id AS "redemptionId", r."createdAt" AS "canjeadoAt", r."inscripcionId", r."evaluationId",
 COALESCE(r.seleccion,'[]'::jsonb) AS seleccion, r."precioOriginal", r."montoDescontado", r."saldoPendiente", r.cubierto,
 r."couponSnapshot", CONCAT_WS(' ',u."firstName",u."lastName") AS participante, u."cI" AS documento, u.email,
 curso.nombre AS "cursoNombre", curso.sigla AS "cursoSigla",
 p.id AS "paymentId", COALESCE(p.verificado,false) AS "pagoVerificado", p."valorDepositado",
 COALESCE(e."resultadoLiberado",false) AS "resultadoLiberado",
 COALESCE(cert.tipos,'[]'::jsonb) AS "certificadosEmitidos",
 CASE WHEN r.id IS NULL THEN 'sin_usar'
 WHEN NOT COALESCE(r.cubierto,false) AND NOT COALESCE(p.verificado,false) THEN 'pendiente_pago'
 WHEN COALESCE(r.servicio,c.servicio)='resultados' THEN CASE WHEN e."resultadoLiberado" THEN 'completado' ELSE 'pendiente_resultado' END
 WHEN jsonb_array_length(COALESCE(r.seleccion,'[]'::jsonb))>0 AND COALESCE(cert.cantidad,0)>=jsonb_array_length(r.seleccion) THEN 'completado'
 ELSE 'pendiente_certificado' END AS ejecucion
 FROM benefit_coupons c
 LEFT JOIN empresas organization ON organization.id=c."empresaId"
 LEFT JOIN psychometric_tests target_test ON target_test.id=c."objetivoId"
 LEFT JOIN courses target ON target.id=COALESCE(target_test."courseId",c."objetivoId")
 LEFT JOIN benefit_coupon_redemptions r ON r."couponId"=c.id
 LEFT JOIN users u ON u.id=r."userId"
 LEFT JOIN inscripcions ins ON ins.id=r."inscripcionId"
 LEFT JOIN courses curso ON curso.id=ins."courseId"
 LEFT JOIN psychometric_evaluations e ON e.id=r."evaluationId"
 LEFT JOIN pagos p ON p."couponRedemptionId"=r.id
 LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT ce.tipo) AS cantidad, jsonb_agg(DISTINCT ce.tipo) AS tipos
  FROM certificados ce WHERE ce."inscripcionId"=r."inscripcionId"
  AND COALESCE(r.seleccion,'[]'::jsonb) ? ce.tipo
 ) cert ON true
)`;
async function register(query = {}) {
  const filters = [];
  const replacements = {};
  if (query.q) {
    replacements.search = `%${String(query.q).trim().slice(0,180)}%`;
    filters.push('(nombre ILIKE :search OR codigo ILIKE :search OR participante ILIKE :search OR documento ILIKE :search OR email ILIKE :search OR "cursoNombre" ILIKE :search OR "empresaNombre" ILIKE :search OR "cursoAsignado" ILIKE :search)');
  }
  if (query.tipo) { if (!allowedTypes.includes(query.tipo)) invalid('Tipo de cupón inválido.'); filters.push('tipo=:tipo');replacements.tipo=query.tipo; }
  if (query.servicio) { if (!['resultados','certificados'].includes(query.servicio)) invalid('Servicio inválido.');filters.push('servicio=:servicio');replacements.servicio=query.servicio; }
  if (query.estado) { if (!couponStates.includes(query.estado)) invalid('Estado de cupón inválido.');filters.push('"estadoCupon"=:estado');replacements.estado=query.estado; }
  if (query.ejecucion) {
    if (!executionStates.includes(query.ejecucion)) invalid('Estado de ejecución inválido.');
    filters.push(query.ejecucion==='canjeado' ? '"redemptionId" IS NOT NULL' : 'ejecucion=:ejecucion');replacements.ejecucion=query.ejecucion;
  }
  const column = dateColumns[query.fecha || 'creacion'];
  if (!column) invalid('Campo de fecha inválido.');
  if (query.desde) { replacements.desde=dateBound(query.desde);filters.push(`${column} >= :desde`); }
  if (query.hasta) { replacements.hasta=new Date(dateBound(query.hasta).getTime()+86400000);filters.push(`${column} < :hasta`); }
  if (replacements.desde && replacements.hasta && replacements.desde>=replacements.hasta) invalid('El rango de fechas es inválido.');
  const size = Math.min(100,Math.max(10,parseInt(query.limit,10)||25));
  const requestedPage = Math.max(1,parseInt(query.page,10)||1);
  const where = filters.length ? 'WHERE '+filters.join(' AND ') : '';
  const stats = await db.query(`${source} SELECT COUNT(*) AS total, COUNT(DISTINCT "couponId") AS cupones,
   COUNT("redemptionId") AS canjes, COUNT(*) FILTER (WHERE ejecucion='completado') AS completados
   FROM registro ${where}`,{type:QueryTypes.SELECT,replacements});
  const total=Number(stats[0].total), pages=Math.max(1,Math.ceil(total/size)),page=Math.min(pages,requestedPage);
  const rows=await db.query(`${source} SELECT * FROM registro ${where}
    ORDER BY nombre ASC, codigo ASC, "canjeadoAt" DESC NULLS LAST, "couponId", "redemptionId"
    LIMIT :limit OFFSET :offset`,{type:QueryTypes.SELECT,replacements:{...replacements,limit:size,offset:(page-1)*size}});
  return {rows,total,page,pages,limit:size,summary:{cupones:Number(stats[0].cupones),canjes:Number(stats[0].canjes),completados:Number(stats[0].completados)}};
}
module.exports={register};
