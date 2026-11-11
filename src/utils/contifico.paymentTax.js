// Mantener el IVA fijado al validar, aun cuando la configuración global cambie.
async function getPaymentTax(paymentId){
 const {one}=require('../services/affiliateCore.service');
 const sale=await one('SELECT gross_cents,base_cents,config_snapshot FROM affiliate_sales WHERE payment_id=:id',{id:paymentId});
 return {
  expectedIva:sale?(Number(sale.gross_cents)-Number(sale.base_cents))/100:undefined,
  expectedVatRate:sale?.config_snapshot?.vatRate,
 };
}
function invoiceTaxFields(doc,tax){
 if(tax.expectedVatRate!=null)return {};
 return {subtotal:Number(doc.subtotal||0),porcentajeIva:Number(doc.detalles?.[0]?.porcentaje_iva||0),iva:Number(doc.iva||0)};
}
module.exports={getPaymentTax,invoiceTaxFields};
