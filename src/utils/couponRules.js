// El tipo define el beneficio; empresa, producto y destinatarios son restricciones.
const types = ['test_gratis', 'certificado_gratis', 'descuento'];
const legacyTypes = ['curso_gratis', 'paquete_empresa'];
function effectiveType(coupon) {
  if (!legacyTypes.includes(coupon.tipo)) return coupon.tipo;
  // Respetar el servicio guardado de los códigos anteriores, sin cambiar canjes.
  return coupon.servicio === 'resultados' ? 'test_gratis' : 'certificado_gratis';
}
function configurationError(coupon, allowLegacy = false) {
  if (!['resultados', 'certificados'].includes(coupon.servicio)) return 'Selecciona un servicio válido.';
  if (!types.includes(coupon.tipo) && !(allowLegacy && legacyTypes.includes(coupon.tipo))) return 'Selecciona certificado gratuito, resultados gratuitos o descuento.';
  const type = effectiveType(coupon);
  if (type === 'certificado_gratis' && coupon.servicio !== 'certificados') return 'El cupón de certificado gratuito solo puede autorizar certificados de cursos.';
  if (type === 'test_gratis' && coupon.servicio !== 'resultados') return 'El cupón de resultados gratuitos solo puede autorizar resultados psicométricos.';
  return null;
}
module.exports = { types, legacyTypes, effectiveType, configurationError };
