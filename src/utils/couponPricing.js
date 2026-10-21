const selected = value => value === true || value === 'true' || value === 1 || value === '1';
const cents = value => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw Object.assign(new Error('Precio inválido en el catálogo.'), { status: 409 });
  return Math.round(n * 100);
};
function calculate(original, coupon) {
  const base = cents(original);
  let discount = base;
  if (coupon.tipo === 'descuento') {
    const value = Number(coupon.descuentoValor);
    if (!Number.isFinite(value) || value <= 0 || !['porcentaje', 'fijo'].includes(coupon.descuentoTipo) || (coupon.descuentoTipo === 'porcentaje' && value > 100)) throw Object.assign(new Error('Configuración de descuento inválida.'), { status: 409 });
    discount = coupon.descuentoTipo === 'porcentaje' ? Math.round(base * value / 100) : cents(value);
  }
  discount = Math.min(base, discount);
  return { precioOriginal: base / 100, montoDescontado: discount / 100, saldoPendiente: (base - discount) / 100, cubierto: base === discount };
}
module.exports = { selected, cents, calculate };
