const C=require('./affiliateCore.service');
const Pagos=require('../models/Pagos');
const bool=v=>v===true||v==='true'||v===1||v==='1';
async function rateFor(p,cfg,t){
 const current=C.month(),existing=await C.one('SELECT rate FROM affiliate_monthly_tiers WHERE affiliate_id=:id AND month=:month',{id:p.id,month:current},t);if(existing)return Number(existing.rate);
 const prev=C.month(new Date(current+'-01T00:00:00-05:00').getTime()-86400000);
 const revenue=C.int((await C.one('SELECT COALESCE(SUM(net_base_cents),0) AS total FROM affiliate_sales WHERE affiliate_id=:id AND month=:month',{id:p.id,month:prev},t)).total);
 const rate=cfg.directRates[revenue>=C.cents(cfg.revenueGoals[1])?2:revenue>=C.cents(cfg.revenueGoals[0])?1:0];
 await C.exec('INSERT INTO affiliate_monthly_tiers(affiliate_id,month,rate,source_revenue) VALUES (:id,:month,:rate,:revenue) ON CONFLICT DO NOTHING',{id:p.id,month:current,rate,revenue},t);return rate;
}
async function bookSale(p,actor,t){
 if(await C.one('SELECT id FROM affiliate_sales WHERE payment_id=:id',{id:p.id},t))return;
 const gross=C.cents(p.valorDepositado),vat=C.cents(p.iva||0);if(vat>gross)C.fail('El IVA no puede superar el pago.',400);if(!gross)C.fail('El pago debe ser mayor a cero.',400);
 const ins=await C.one('SELECT "userId","courseId" FROM inscripcions WHERE id=:id',{id:p.inscripcionId},t);
 const a=await C.one('SELECT * FROM affiliate_attributions WHERE inscripcion_id=:id',{id:p.inscripcionId},t);
 const cfg=await C.settings(t),base=gross-vat;
 let list=a?.chain||[];
 if(list.some(item=>item.userId===ins.userId))list=[];
 const seller=list.length?await C.one("SELECT * FROM affiliate_profiles WHERE id=:id AND status='activo'",{id:list[0].id},t):null;
 if(!seller)list=[];
 const sale=await C.one(`INSERT INTO affiliate_sales(payment_id,affiliate_id,course_id,payment_type,gross_cents,base_cents,net_base_cents,month,config_snapshot,chain)
 VALUES (:pay,:affiliate,:course,:type,:gross,:base,:base,:month,CAST(:cfg AS jsonb),CAST(:chain AS jsonb)) RETURNING *`,{pay:p.id,affiliate:seller?.id||null,course:ins.courseId,type:p.tipoPago,gross,base,month:C.month(),cfg:JSON.stringify(cfg),chain:JSON.stringify(list)},t);
 for(let level=0;level<list.length;level++){
  const recipient=await C.one("SELECT * FROM affiliate_profiles WHERE id=:id AND status='activo'",{id:list[level].id},t);if(!recipient)continue;
  const rate=level===0?await rateFor(recipient,cfg,t):cfg.uplineRates[level-1];
  const amount=Math.floor(base*rate/100); // Centavos; nunca repartir por encima del fondo por redondeo.
  if(!amount)continue;
  const commission=await C.one('INSERT INTO affiliate_commissions(sale_id,affiliate_id,level,rate,original_cents) VALUES (:sale,:affiliate,:level,:rate,:amount) RETURNING id',{sale:sale.id,affiliate:recipient.id,level,rate,amount},t);
  await C.exec("INSERT INTO affiliate_entries(affiliate_id,sale_id,commission_id,amount_cents,entry_key) VALUES (:affiliate,:sale,:commission,:amount,:key)",{affiliate:recipient.id,sale:sale.id,commission:commission.id,amount,key:'sale:'+p.id+':'+level},t);
 }
 await C.audit(actor,'payment_validated',p.id,{saleId:sale.id,baseCents:base},t);
}
async function updatePayment(id,data,actor){return C.atomic(async t=>{
 const p=await Pagos.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!p)C.fail('Pago no encontrado.',404);
 const sale=await C.one('SELECT id FROM affiliate_sales WHERE payment_id=:id',{id},t);
 const refunds=await C.one("SELECT id FROM payment_refunds WHERE payment_id=:id AND status<>'rechazada' LIMIT 1",{id},t);
 if(sale||refunds){
  for(const k of ['valorDepositado','iva','subtotal','porcentajeIva','cert_emp','cert_mdt','cert_int','curso'])if(data[k]!==undefined&&(['valorDepositado','iva','subtotal','porcentajeIva'].includes(k)?Number(data[k]||0)!==Number(p[k]||0):String(data[k]??'')!==String(p[k]??'')))C.fail('El pago tiene movimientos financieros. No se puede cambiar su importe o servicio; registra una devolución.');
  if(data.verificado!==undefined&&!bool(data.verificado))C.fail('Este pago tiene movimientos. Usa Registrar devolución; no retires la validación.');
 }
 if(!p.verificado&&bool(data.verificado)&&data.iva==null&&p.iva==null)C.fail('Indica el IVA incluido en el pago (0 si no aplica) antes de validar.',400);
 const bank=String(data.entidad??p.entidad??'').trim(),deposit=String(data.idDeposito??p.idDeposito??'').trim();
 if(!p.verificado&&bool(data.verificado)&&(!bank||!deposit))C.fail('Entidad e identificador de pago son obligatorios al validar.',400);
 if(bank&&deposit&&await C.one('SELECT id FROM pagos WHERE entidad=:bank AND "idDeposito"=:deposit AND id <> :id LIMIT 1',{bank,deposit,id},t))C.fail('Ese identificador de pago ya está registrado para la entidad.');
 if(data.entidad!==undefined)data.entidad=bank||null;
 if(data.idDeposito!==undefined)data.idDeposito=deposit||null;
 if(!p.verificado&&bool(data.verificado)&&p.psychometricEvaluationId&&await C.one('SELECT id FROM pagos WHERE "psychometricEvaluationId"=:evaluation AND verificado=true AND id <> :id LIMIT 1',{evaluation:p.psychometricEvaluationId,id},t))C.fail('La evaluación ya tiene otro pago validado.');
 const previous=p.verificado;
 if(data.verificado!==undefined)data.verificado=bool(data.verificado);
 await p.update(data,{transaction:t});
 if(!previous&&p.verificado)await bookSale(p,actor,t);
 return p;
});}
async function paymentSummary(id,t){
 const r=await C.one(`SELECT COALESCE(SUM(amount_cents) FILTER(WHERE status='realizada'),0) AS refunded,
 COALESCE(SUM(amount_cents) FILTER(WHERE status IN ('solicitada','aprobada')),0) AS reserved FROM payment_refunds WHERE payment_id=:id`,{id},t);
 return {devuelto:C.int(r.refunded)/100,reservado:C.int(r.reserved)/100};
}
async function requestRefund(id,body,actor){
 if(!C.uuid(body.idempotencyKey))C.fail('Identificador de solicitud inválido.',400);
 return C.atomic(async t=>{
  const previous=await C.one('SELECT * FROM payment_refunds WHERE idempotency_key=:key',{key:body.idempotencyKey},t);
  if(previous){if(previous.payment_id!==id||C.int(previous.amount_cents)!==C.cents(body.amount)||previous.reason!==String(body.reason||'').trim())C.fail('El identificador ya se utilizó en otra solicitud.');return previous;}
  const p=await Pagos.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!p||!p.verificado)C.fail('Solo se puede devolver un pago validado.');
  const amount=C.cents(body.amount),reason=String(body.reason||'').trim();if(!amount||reason.length<5||reason.length>1500)C.fail('Indica importe y motivo de al menos cinco caracteres.',400);
  const sum=await paymentSummary(id,t);if(amount>C.cents(p.valorDepositado)-C.cents(sum.devuelto)-C.cents(sum.reservado))C.fail('La devolución supera el saldo disponible, incluyendo solicitudes pendientes.');
  const result=await C.one('INSERT INTO payment_refunds(payment_id,amount_cents,reason,requested_by,idempotency_key) VALUES (:pay,:amount,:reason,:actor,:key) RETURNING *',{pay:id,amount,reason,actor,key:body.idempotencyKey},t);
  await C.audit(actor,'refund_requested',result.id,{paymentId:id,amountCents:amount},t);return result;
 });
}
async function checkFile(id,purpose,owner,t){if(!C.uuid(id))C.fail('Adjunta el comprobante correspondiente.',400);const file=await C.one('SELECT * FROM affiliate_files WHERE id=:id AND purpose=:purpose AND owner_id=:owner',{id,purpose,owner},t);if(!file)C.fail('Archivo no autorizado.',403);return file;}
async function transitionRefund(id,action,body,actor){return C.atomic(async t=>{
 const r=await C.one('SELECT * FROM payment_refunds WHERE id=:id FOR UPDATE',{id},t);if(!r)C.fail('Devolución no encontrada.',404);
 const next={approve:'aprobada',reject:'rechazada',complete:'realizada'}[action];if(!next)C.fail('Acción inválida.',400);if(r.status===next)return r;
 if(action==='approve'&&r.status!=='solicitada'||action==='reject'&&!['solicitada','aprobada'].includes(r.status)||action==='complete'&&r.status!=='aprobada')C.fail('La devolución no está en el estado requerido.');
 if(action!=='complete'){
  await C.exec('UPDATE payment_refunds SET status=:status,reviewed_by=:actor,updated_at=now() WHERE id=:id',{id,status:next,actor},t);
 }else{
  await checkFile(body.proofId,'devolucion',actor,t);
  if(!String(body.reference||'').trim())C.fail('Indica la referencia de transferencia.',400);
  const when=body.refundedAt?new Date(body.refundedAt):new Date();if(!Number.isFinite(when.getTime())||when.getTime()>Date.now()+60000)C.fail('Fecha de devolución inválida.',400);
  const p=await Pagos.findByPk(r.payment_id,{transaction:t,lock:t.LOCK.UPDATE});const previous=await paymentSummary(p.id,t);
  if(C.cents(previous.devuelto)+C.int(r.amount_cents)>C.cents(p.valorDepositado))C.fail('El total devuelto supera el pago.');
  await C.exec("UPDATE payment_refunds SET status='realizada',completed_by=:actor,proof_id=:proof,reference=:ref,refunded_at=:when,updated_at=now() WHERE id=:id",{id,actor,proof:body.proofId,ref:body.reference,when},t);
  const sale=await C.one('SELECT * FROM affiliate_sales WHERE payment_id=:id FOR UPDATE',{id:p.id},t);
  if(sale){
   const refunded=C.cents(previous.devuelto)+C.int(r.amount_cents),gross=C.int(sale.gross_cents),net=gross-refunded;
   await C.exec('UPDATE affiliate_sales SET refunded_cents=:refunded,net_base_cents=:base WHERE id=:id',{refunded,base:Math.round(C.int(sale.base_cents)*net/gross),id:sale.id},t);
   const commissions=await C.query('SELECT * FROM affiliate_commissions WHERE sale_id=:id FOR UPDATE',{id:sale.id},t);
   for(const c of commissions){
    const newReversed=C.int(c.original_cents)-Math.floor(C.int(c.original_cents)*net/gross),delta=newReversed-C.int(c.reversed_cents);if(delta<=0)continue;
    const drafts=await C.query(`SELECT DISTINCT p.id FROM affiliate_payouts p JOIN affiliate_entries e ON e.payout_id=p.id WHERE e.sale_id=:sale AND e.affiliate_id=:affiliate AND p.status NOT IN ('pagada','cancelada')`,{sale:sale.id,affiliate:c.affiliate_id},t);
    for(const draft of drafts){await C.exec("UPDATE affiliate_payouts SET status='cancelada',note='Cancelada por devolución: revisar factura/nota de crédito antes de reliquidar',updated_at=now() WHERE id=:id",{id:draft.id},t);await C.exec('UPDATE affiliate_entries SET payout_id=NULL WHERE payout_id=:id',{id:draft.id},t);await C.audit(actor,'payout_cancelled_refund',draft.id,{refundId:id},t);}
    await C.exec('UPDATE affiliate_commissions SET reversed_cents=:amount WHERE id=:id',{amount:newReversed,id:c.id},t);
    await C.exec('INSERT INTO affiliate_entries(affiliate_id,sale_id,commission_id,refund_id,amount_cents,entry_key) VALUES (:affiliate,:sale,:commission,:refund,:amount,:key)',{affiliate:c.affiliate_id,sale:sale.id,commission:c.id,refund:id,amount:-delta,key:'refund:'+id+':'+c.id},t);
   }
  }
 }
 await C.audit(actor,'refund_'+next,id,{paymentId:r.payment_id},t);return C.one('SELECT * FROM payment_refunds WHERE id=:id',{id},t);
});}
async function closeMonth(period,actor){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)||period>C.month()||(period===C.month()&&process.env.AFFILIATE_TEST_MODE!=='true'))C.fail('Selecciona un mes ya cerrado.',400);
 const cutoff=new Date(period+'-01T00:00:00-05:00');cutoff.setUTCMonth(cutoff.getUTCMonth()+1);
 return C.atomic(async t=>{
  const cfg=await C.settings(t),created=[],skipped=[];const profiles=await C.query("SELECT * FROM affiliate_profiles WHERE status IN ('activo','suspendido') ORDER BY id",{},t);
  for(const p of profiles){
   if(await C.one("SELECT id FROM affiliate_payouts WHERE affiliate_id=:id AND month=:month AND status<>'cancelada'",{id:p.id,month:period},t))continue;
   // Toda deuda sin liquidar reduce el saldo, incluso si se detectó después del corte.
   const entries=await C.query("SELECT e.* FROM affiliate_entries e WHERE affiliate_id=:id AND payout_id IS NULL AND (created_at < :cutoff OR amount_cents<0) AND (amount_cents<=0 OR NOT EXISTS (SELECT 1 FROM affiliate_sales s JOIN payment_refunds r ON r.payment_id=s.payment_id WHERE s.id=e.sale_id AND r.status IN ('solicitada','aprobada'))) FOR UPDATE OF e",{id:p.id,cutoff},t);
   const amount=entries.reduce((sum,e)=>sum+C.int(e.amount_cents),0);if(amount<=0||amount<C.cents(cfg.minimumPayout))continue;
   if(!/^\d{13}$/.test(p.ruc||'')||!p.fiscal_address||!p.bank?.bank||!p.bank?.account||!p.bank?.holder){skipped.push({affiliateId:p.id,name:p.fiscal_name,reason:'Completar RUC, dirección y cuenta bancaria antes del corte.'});continue;}
   const payout=await C.one('INSERT INTO affiliate_payouts(affiliate_id,month,commission_cents,bank_snapshot,fiscal_snapshot) VALUES (:id,:month,:amount,CAST(:bank AS jsonb),CAST(:fiscal AS jsonb)) RETURNING *',{id:p.id,month:period,amount,bank:JSON.stringify(p.bank),fiscal:JSON.stringify({name:p.fiscal_name,ruc:p.ruc,address:p.fiscal_address})},t);
   await C.exec('UPDATE affiliate_entries SET payout_id=:payout WHERE id IN (:ids)',{payout:payout.id,ids:entries.map(e=>e.id)},t);created.push(payout);
  }
  await C.audit(actor,'month_closed',null,{month:period,created:created.length,skipped:skipped.length},t);created.skipped=skipped;return created;
 });
}
async function invoice(id,body,actor){return C.atomic(async t=>{
 const row=await C.one('SELECT p.*,a.user_id,a.ruc FROM affiliate_payouts p JOIN affiliate_profiles a ON a.id=p.affiliate_id WHERE p.id=:id FOR UPDATE OF p',{id},t);
 if(!row||row.user_id!==actor)C.fail('Liquidación no autorizada.',403);
 if(row.status!=='pendiente_factura')C.fail('La liquidación no está pendiente de factura.');
 if(!/^\d{13}$/.test(row.ruc||''))C.fail('Completa tu RUC en tus datos fiscales.');
 if(!/^\d{49}$/.test(String(body.key||''))||!/^\d{3}-\d{3}-\d{9}$/.test(String(body.number||'')))C.fail('Indica clave de acceso de 49 dígitos y número de factura válido.',400);
 await checkFile(body.fileId,'factura',actor,t);
 if(C.cents(body.base)!==C.int(row.commission_cents))C.fail('La base de la factura debe coincidir con la comisión de esta liquidación.');
 const cfg=await C.settings(t);if(!cfg.merchantName||!/^\d{13}$/.test(cfg.merchantRuc||''))C.fail('Administración debe configurar los datos del receptor de la factura.');
 const used=await C.one('SELECT payout_id FROM affiliate_invoice_keys WHERE invoice_key=:key',{key:body.key},t);
 if(used&&used.payout_id!==id)C.fail('Esta factura ya se presentó en otra liquidación.');
 await C.exec('INSERT INTO affiliate_invoice_keys(invoice_key,payout_id) VALUES (:key,:id) ON CONFLICT DO NOTHING',{key:body.key,id},t);
 await C.exec("UPDATE affiliate_payouts SET status='factura_recibida',invoice_id=:file,invoice_key=:key,invoice_number=:number,invoice_vat_cents=:vat,updated_at=now() WHERE id=:id",{id,file:body.fileId,key:body.key,number:body.number,vat:C.cents(body.vat||0)},t);
 await C.audit(actor,'invoice_submitted',id,{fileId:body.fileId,key:body.key,number:body.number,baseCents:C.int(row.commission_cents),vatCents:C.cents(body.vat||0)},t);return {message:'Factura recibida para revisión administrativa.'};
});}
async function payoutAction(id,action,body,actor){return C.atomic(async t=>{
 const p=await C.one('SELECT * FROM affiliate_payouts WHERE id=:id FOR UPDATE',{id},t);if(!p)C.fail('Liquidación no encontrada.',404);
 if(action==='return'){
  if(!['factura_recibida','aprobada'].includes(p.status)||!String(body.note||'').trim())C.fail('Indica la corrección requerida.');
  await C.exec("UPDATE affiliate_payouts SET status='pendiente_factura',note=:note,updated_at=now() WHERE id=:id",{id,note:body.note},t);
 }else if(action==='approve'){
  if(p.status==='aprobada')return p;if(p.status!=='factura_recibida')C.fail('Revisa primero la factura recibida.');
  const income=C.cents(body.retentionIncome||0),vat=C.cents(body.retentionVat||0);
  if(income>C.int(p.commission_cents)||vat>C.int(p.invoice_vat_cents))C.fail('Las retenciones superan las bases correspondientes.');
  if(income||vat)await checkFile(body.retentionProofId,'retencion',actor,t);
  await C.exec("UPDATE affiliate_payouts SET status='aprobada',retention_income_cents=:income,retention_vat_cents=:vat,retention_proof_id=:proof,reviewed_by=:actor,note=:note,updated_at=now() WHERE id=:id",{id,income,vat,proof:(income||vat)?body.retentionProofId:null,actor,note:String(body.note||'')},t);
 }else if(action==='pay'){
  if(p.status==='pagada')return p;if(p.status!=='aprobada')C.fail('Primero aprueba la factura.');
  if(await C.one("SELECT r.id FROM affiliate_entries e JOIN affiliate_sales s ON s.id=e.sale_id JOIN payment_refunds r ON r.payment_id=s.payment_id WHERE e.payout_id=:id AND r.status IN ('solicitada','aprobada') LIMIT 1",{id},t))C.fail('Hay una devolución en revisión asociada al corte. Resuélvela antes de transferir.');
  await checkFile(body.fileId,'liquidacion',actor,t);if(!String(body.reference||'').trim())C.fail('Indica la referencia bancaria.',400);
  if(!p.bank_snapshot?.account)C.fail('La liquidación no tiene una cuenta bancaria verificada en su corte. Cancela y vuelve a liquidar después de completar los datos.');
  await C.exec("UPDATE affiliate_payouts SET status='pagada',proof_id=:file,transfer_reference=:ref,paid_by=:actor,paid_at=now(),updated_at=now() WHERE id=:id",{id,file:body.fileId,ref:body.reference,actor},t);
 }else if(action==='cancel'){
  if(['pagada','cancelada'].includes(p.status))C.fail('No se puede cancelar esta liquidación.');
  await C.exec("UPDATE affiliate_payouts SET status='cancelada',note=:note,updated_at=now() WHERE id=:id",{id,note:String(body.note||'Cancelada por administración')},t);await C.exec('UPDATE affiliate_entries SET payout_id=NULL WHERE payout_id=:id',{id},t);
 }else C.fail('Acción inválida.',400);
 await C.audit(actor,'payout_'+action,id,{},t);return C.one('SELECT * FROM affiliate_payouts WHERE id=:id',{id},t);
});}
module.exports={updatePayment,bookSale,paymentSummary,requestRefund,transitionRefund,closeMonth,invoice,payoutAction,checkFile};
