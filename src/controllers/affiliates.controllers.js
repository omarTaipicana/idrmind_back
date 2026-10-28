const fs=require('fs');
const path=require('path');
const C=require('../services/affiliateCore.service');
const F=require('../services/affiliateFinance.service');
const User=require('../models/User');
const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){if(e.status)return res.status(e.status).json({message:e.message});if(e.name==='SequelizeUniqueConstraintError')return res.status(409).json({message:'La operación o documento ya está registrado.'});next(e);}};
exports.wrap=wrap;
exports.admin=(req,res,next)=>C.adminUser(req.user)?next():res.status(403).json({message:'Administración de afiliados requerida.'});
exports.referral=wrap(async(req,res)=>res.json(await C.referral(req.body.code)));
exports.invitation=wrap(async(req,res)=>{
 const p=await C.one("SELECT id,depth,status FROM affiliate_profiles WHERE code=:code",{code:String(req.params.code).toUpperCase()});
 if(!p||!await C.canRecruit(p))C.fail('Este patrocinador no puede recibir afiliados actualmente.',409);
 res.json({available:true,position:C.names[p.depth],depth:p.depth+1});
});
function profileData(body){
 const text=(key,max)=>String(body[key]||'').trim().slice(0,max);
 const value={name:text('name',220),document:text('document',30).replace(/[\s.-]/g,'').toUpperCase(),phone:text('phone',30),ruc:text('ruc',13),address:text('address',500),bank:{bank:text('bankName',100),type:text('bankType',50),account:text('account',30),holder:text('holder',220)}};
 if(value.name.length<3||!/^[A-Z0-9]{5,30}$/.test(value.document)||value.phone.length<7)C.fail('Completa nombres fiscales, documento y teléfono.',400);
 if(value.ruc&&!/^\d{13}$/.test(value.ruc))C.fail('El RUC debe tener 13 dígitos.',400);
 if(value.bank.account&&!/^\d{6,30}$/.test(value.bank.account))C.fail('Cuenta bancaria inválida.',400);
 return value;
}
async function apply(userId,body,actor,adminCreated){return C.atomic(async t=>{
 const account=await User.findByPk(userId,{transaction:t});if(!account)C.fail('Usuario no encontrado.',404);
 const data=profileData(body);if(account.cI&&String(account.cI).replace(/[\s.-]/g,'').toUpperCase()!==data.document)C.fail('El documento debe coincidir con el de la cuenta del usuario.',400);
 const cfg=await C.settings(t),accepted=!adminCreated&&body.acceptTerms===true&&body.termsVersion===cfg.termsVersion;
 if(!adminCreated&&!accepted)C.fail('Debes aceptar las condiciones vigentes del programa.',400);
 let p=await C.profile(userId,t);if(p&&['activo','suspendido'].includes(p.status))C.fail('Ya existe una afiliación. Usa Actualizar mis datos.');
 let sponsor=null;
 const sponsorCode=String(body.sponsorCode||'').trim().toUpperCase();
 if(sponsorCode){
  sponsor=await C.one('SELECT * FROM affiliate_profiles WHERE code=:code',{code:sponsorCode},t);
  if(!sponsor)C.fail('El código de patrocinador no existe. Corrígelo o selecciona Afiliarme sin patrocinador.',400);
  if(sponsor.user_id===userId)C.fail('No puedes ser tu propio patrocinador. Selecciona Afiliarme sin patrocinador.',400);
  if(!await C.canRecruit(sponsor,t))C.fail('El patrocinador elegido todavía no puede incorporar afiliados: debe estar activo, cumplir su meta y tener un nivel disponible. Puedes solicitar tu afiliación sin patrocinador; tú no necesitas ventas previas.',409);
 }
 if(p&&p.sponsor_id!==(sponsor?.id||null))C.fail('El patrocinador de la solicitud ya está fijado. Contacta con administración.');
 const r={user:userId,name:data.name,document:data.document,phone:data.phone,ruc:data.ruc||null,address:data.address,bank:JSON.stringify(data.bank),terms:accepted?cfg.termsVersion:null,accepted:accepted?new Date():null};
 if(!p){p=await C.one(`INSERT INTO affiliate_profiles(user_id,sponsor_id,depth,code,fiscal_name,document,phone,ruc,fiscal_address,bank,terms_version,accepted_at)
 VALUES (:user,:sponsor,:depth,:code,:name,:document,:phone,:ruc,:address,CAST(:bank AS jsonb),:terms,:accepted) RETURNING *`,{...r,sponsor:sponsor?.id||null,depth:sponsor?sponsor.depth+1:1,code:C.randomCode()},t);}
 else{await C.exec("UPDATE affiliate_profiles SET status='pendiente',fiscal_name=:name,document=:document,phone=:phone,ruc=:ruc,fiscal_address=:address,bank=CAST(:bank AS jsonb),terms_version=:terms,accepted_at=:accepted,updated_at=now() WHERE user_id=:user",r,t);p=await C.profile(userId,t);}
 await C.audit(actor,'affiliate_requested',p.id,{adminCreated},t);return p;
});}
exports.apply=wrap(async(req,res)=>res.status(201).json(await apply(req.user.id,req.body,req.user.id,false)));
exports.adminAdd=wrap(async(req,res)=>{if(!C.uuid(req.body.userId))C.fail('Selecciona un usuario existente.',400);res.status(201).json(await apply(req.body.userId,req.body,req.user.id,true));});
exports.updateProfile=wrap(async(req,res)=>{
 const data=profileData(req.body);const p=await C.profile(req.user.id);if(!p)C.fail('Afiliación no encontrada.',404);if(data.document!==p.document)C.fail('El documento de una afiliación registrada no se cambia desde este formulario. Contacta con administración.',400);
 await C.atomic(async t=>{await C.exec('UPDATE affiliate_profiles SET fiscal_name=:name,document=:document,phone=:phone,ruc=:ruc,fiscal_address=:address,bank=CAST(:bank AS jsonb),updated_at=now() WHERE id=:id',{id:p.id,...data,ruc:data.ruc||null,bank:JSON.stringify(data.bank)},t);await C.audit(req.user.id,'affiliate_details_updated',p.id,{},t);});res.json({message:'Datos actualizados. Las liquidaciones anteriores conservan sus datos de corte.'});
});
exports.me=wrap(async(req,res)=>{
 const p=await C.profile(req.user.id),cfg=await C.settings();
 const terms={version:cfg.termsVersion,text:'Afiliación gratuita. Comisiones únicamente por ventas reales cobradas y validadas de certificados y resultados. No se remunera el registro de personas ni se garantizan ingresos. No se permiten autorreferidos, cuentas duplicadas o publicidad engañosa. Las devoluciones ajustan comisiones; si ya se pagaron, se compensan con ingresos futuros. Para cobrar debes presentar la factura correspondiente y datos fiscales/bancarios correctos. La aceptación queda registrada. Los cambios de porcentajes no modifican comisiones ya generadas.'};
 if(!p)return res.json({profile:null,terms,config:cfg,user:{name:[req.user.firstName,req.user.lastName].filter(Boolean).join(' '),document:req.user.cI||'',phone:req.user.cellular||''}});
 const m=await C.metrics(p.id),eligible=await C.canRecruit(p);
 const balance=await C.one(`SELECT COALESCE(SUM(amount_cents) FILTER(WHERE payout_id IS NULL),0) AS unassigned,
 COALESCE(SUM(amount_cents),0) AS lifetime FROM affiliate_entries WHERE affiliate_id=:id`,{id:p.id});
 const entries=await C.query(`SELECT e.id,e.amount_cents,e.created_at,e.payout_id,e.refund_id,c.level,c.rate,s.payment_type,s.month,co.nombre AS course_name
 FROM affiliate_entries e JOIN affiliate_commissions c ON c.id=e.commission_id JOIN affiliate_sales s ON s.id=e.sale_id
 LEFT JOIN courses co ON co.id=s.course_id WHERE e.affiliate_id=:id ORDER BY e.created_at DESC LIMIT 200`,{id:p.id});
 const sales=await C.query(`SELECT s.id,s.gross_cents,s.net_base_cents,s.refunded_cents,s.month,s.validated_at,s.payment_type,co.nombre AS course_name FROM affiliate_sales s LEFT JOIN courses co ON co.id=s.course_id WHERE s.affiliate_id=:id ORDER BY s.validated_at DESC LIMIT 200`,{id:p.id});
 const team=await C.query('SELECT id,depth,status,fiscal_name,created_at FROM affiliate_profiles WHERE sponsor_id=:id ORDER BY created_at DESC LIMIT 200',{id:p.id});
 const payouts=await C.query('SELECT * FROM affiliate_payouts WHERE affiliate_id=:id ORDER BY created_at DESC LIMIT 100',{id:p.id});
 const courses=await C.query('SELECT id,nombre,sigla,tipo FROM courses WHERE vigente=true ORDER BY nombre');
 const tier=await C.one('SELECT rate FROM affiliate_monthly_tiers WHERE affiliate_id=:id AND month=:month',{id:p.id,month:C.month()});
 const prev=C.month(new Date(C.month()+'-01T00:00:00-05:00').getTime()-86400000);
 const prior=C.int((await C.one('SELECT COALESCE(SUM(net_base_cents),0) AS revenue FROM affiliate_sales WHERE affiliate_id=:id AND month=:month',{id:p.id,month:prev})).revenue);
 const rate=tier?Number(tier.rate):cfg.directRates[prior>=C.cents(cfg.revenueGoals[1])?2:prior>=C.cents(cfg.revenueGoals[0])?1:0];
 const sponsor=p.sponsor_id?await C.one('SELECT code FROM affiliate_profiles WHERE id=:id',{id:p.sponsor_id}):null;
 res.json({profile:{...p,position:C.names[p.depth-1],sponsorCode:sponsor?.code||''},config:cfg,terms,metrics:{...m,recruitGoal:cfg.recruitGoals[p.depth-1],canRecruit:eligible,directRate:rate,balanceCents:C.int(balance.unassigned),earnedCents:C.int(balance.lifetime)},entries,sales,team,payouts,courses});
});
exports.users=wrap(async(req,res)=>{const q=String(req.query.q||'').trim();if(!q)return res.json([]);res.json(await C.query('SELECT id,"firstName","lastName",email,"cI",cellular FROM users WHERE email ILIKE :q OR "cI" ILIKE :q OR "firstName" ILIKE :q OR "lastName" ILIKE :q ORDER BY "firstName" LIMIT 25',{q:'%'+q.slice(0,100)+'%'}));});
exports.adminList=wrap(async(req,res)=>{
 const profiles=await C.query(`SELECT a.*,u.email,s.fiscal_name AS sponsor_name FROM affiliate_profiles a JOIN users u ON u.id=a.user_id LEFT JOIN affiliate_profiles s ON s.id=a.sponsor_id ORDER BY a.created_at DESC LIMIT 1000`);
 const payouts=await C.query('SELECT p.*,a.fiscal_name FROM affiliate_payouts p JOIN affiliate_profiles a ON a.id=p.affiliate_id ORDER BY p.created_at DESC LIMIT 1000');
 const totals=await C.query(`SELECT affiliate_id,COALESCE(SUM(amount_cents) FILTER(WHERE payout_id IS NULL),0) AS balance FROM affiliate_entries GROUP BY affiliate_id`);
 const stats=await C.query(`SELECT affiliate_id,COUNT(*) FILTER(WHERE payment_type='test_psicometrico' AND net_base_cents>0) AS tests,COALESCE(SUM(net_base_cents) FILTER(WHERE month=:month),0) AS revenue FROM affiliate_sales GROUP BY affiliate_id`,{month:C.month()});
 const sales=await C.query(`SELECT s.*,a.fiscal_name AS seller_name,co.nombre AS course_name,
 CONCAT_WS(' ',u."firstName",u."lastName") AS customer_name,
 COALESCE(detail.items,'[]'::jsonb) AS commissions
 FROM affiliate_sales s LEFT JOIN affiliate_profiles a ON a.id=s.affiliate_id
 LEFT JOIN courses co ON co.id=s.course_id JOIN pagos p ON p.id=s.payment_id JOIN inscripcions i ON i.id=p."inscripcionId" JOIN users u ON u.id=i."userId"
 LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('name',ap.fiscal_name,'level',c.level,'rate',c.rate,'original',c.original_cents,'reversed',c.reversed_cents) ORDER BY c.level) AS items
 FROM affiliate_commissions c JOIN affiliate_profiles ap ON ap.id=c.affiliate_id WHERE c.sale_id=s.id) detail ON true
 ORDER BY s.validated_at DESC LIMIT 200`);
 res.json({profiles:profiles.map(p=>({...p,position:C.names[p.depth-1],balanceCents:C.int(totals.find(x=>x.affiliate_id===p.id)?.balance),tests:C.int(stats.find(x=>x.affiliate_id===p.id)?.tests)})),payouts,sales,testMode:process.env.AFFILIATE_TEST_MODE==='true',canConfigure:require("../utils/sessionSecurity").isSuperAdmin(req.user),config:await C.settings()});
});
exports.review=wrap(async(req,res)=>res.json(await C.atomic(async t=>{
 const p=await C.one('SELECT * FROM affiliate_profiles WHERE id=:id FOR UPDATE',{id:req.params.id},t);if(!p)C.fail('Afiliado no encontrado.',404);
 const action=req.body.action,next={approve:'activo',reject:'rechazado',suspend:'suspendido',reactivate:'activo'}[action];if(!next)C.fail('Acción inválida.',400);
 if(action==='approve'){
  if(p.status!=='pendiente')C.fail('Solo se aprueban solicitudes pendientes.');
  const cfg=await C.settings(t);if(!p.accepted_at||p.terms_version!==cfg.termsVersion)C.fail('El usuario debe completar la solicitud y aceptar las condiciones vigentes.');
  if(p.sponsor_id){const sponsor=await C.one('SELECT * FROM affiliate_profiles WHERE id=:id',{id:p.sponsor_id},t);if(!await C.canRecruit(sponsor,t)||p.depth!==sponsor.depth+1)C.fail('El patrocinador ya no cumple los requisitos.');}
 }
 if(action==='reject'&&p.status!=='pendiente'||action==='suspend'&&p.status!=='activo'||action==='reactivate'&&p.status!=='suspendido')C.fail('Estado no compatible con la acción.');
 await C.exec('UPDATE affiliate_profiles SET status=:status,reviewed_by=:actor,reviewed_at=now(),review_note=:note,updated_at=now() WHERE id=:id',{id:p.id,status:next,actor:req.user.id,note:String(req.body.note||'').slice(0,1500)},t);
 await C.audit(req.user.id,'affiliate_'+action,p.id,{},t);return {message:'Estado actualizado.'};
})));
exports.config=wrap(async(req,res)=>{const cfg=req.body;C.validateConfig(cfg);await C.atomic(async t=>{await C.exec('UPDATE affiliate_settings SET config=CAST(:cfg AS jsonb),updated_at=now() WHERE id=1',{cfg:JSON.stringify(cfg)},t);await C.audit(req.user.id,'settings_updated',null,cfg,t);});res.json({message:'Configuración guardada. Las comisiones y categorías ya fijadas no se recalculan.'});});
exports.close=wrap(async(req,res)=>{const created=await F.closeMonth(req.body.month,req.user.id);res.json({created,skipped:created.skipped||[]});});
exports.invoice=wrap(async(req,res)=>res.json(await F.invoice(req.params.id,req.body,req.user.id)));
exports.payout=wrap(async(req,res)=>res.json(await F.payoutAction(req.params.id,req.params.action,req.body,req.user.id)));
exports.refundList=wrap(async(req,res)=>{
 const rows=await C.query(`SELECT p.id,p.curso,p."tipoPago",p."valorDepositado",p.iva,p.verificado,p."createdAt",u."firstName",u."lastName",u."cI",
 COALESCE(SUM(r.amount_cents) FILTER(WHERE r.status='realizada'),0) AS refunded_cents,
 COALESCE(SUM(r.amount_cents) FILTER(WHERE r.status IN ('solicitada','aprobada')),0) AS reserved_cents
 FROM pagos p JOIN inscripcions i ON i.id=p."inscripcionId" JOIN users u ON u.id=i."userId" LEFT JOIN payment_refunds r ON r.payment_id=p.id
 WHERE p.verificado=true AND (p.curso ILIKE :q OR u."cI" ILIKE :q OR u."firstName" ILIKE :q OR u."lastName" ILIKE :q)
 GROUP BY p.id,u.id ORDER BY p."createdAt" DESC LIMIT 100`,{q:'%'+String(req.query.q||'').slice(0,100)+'%'});
 const refunds=await C.query(`SELECT r.*,p.curso,u."firstName",u."lastName" FROM payment_refunds r JOIN pagos p ON p.id=r.payment_id JOIN inscripcions i ON i.id=p."inscripcionId" JOIN users u ON u.id=i."userId" ORDER BY r.created_at DESC LIMIT 500`);
 res.json({payments:rows,refunds});
});
exports.requestRefund=wrap(async(req,res)=>res.status(201).json(await F.requestRefund(req.params.id,req.body,req.user.id)));
exports.transitionRefund=wrap(async(req,res)=>res.json(await F.transitionRefund(req.params.id,req.params.action,req.body,req.user.id)));
exports.upload=wrap(async(req,res)=>{
 if(!req.file)C.fail('Adjunta un archivo PDF, XML, JPG o PNG.',400);
 try{
 const purpose=req.body.purpose;if(!['factura','devolucion','liquidacion','retencion'].includes(purpose))C.fail('Tipo de documento inválido.',400);
 if(purpose!=='factura'&&!C.adminUser(req.user))C.fail('Permiso administrativo requerido.',403);
 const header=fs.readFileSync(req.file.path).subarray(0,1000);
 const mime=req.file.mimetype,valid=mime==='application/pdf'?header.subarray(0,5).toString()==='%PDF-':mime==='image/png'?header.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?header[0]===255&&header[1]===216:['application/xml','text/xml'].includes(mime)?/<(?:\w+:)?(?:factura|autorizacion|comprobanteRetencion|comprobante)\b/.test(header.toString()):false;
 if(!valid)C.fail('Contenido del archivo no corresponde a un documento admitido.',400);
 const file=await C.one('INSERT INTO affiliate_files(owner_id,purpose,filename,original_name,mime) VALUES (:owner,:purpose,:filename,:name,:mime) RETURNING id',{owner:req.user.id,purpose,filename:req.file.filename,name:req.file.originalname.slice(0,220),mime});res.status(201).json(file);
 }catch(e){fs.unlinkSync(req.file.path);throw e;}
});
exports.file=wrap(async(req,res)=>{
 const file=await C.one('SELECT * FROM affiliate_files WHERE id=:id',{id:req.params.id});if(!file)C.fail('Archivo no encontrado.',404);
 let allowed=file.owner_id===req.user.id||C.adminUser(req.user);
 if(!allowed)allowed=!!await C.one('SELECT p.id FROM affiliate_payouts p JOIN affiliate_profiles a ON a.id=p.affiliate_id WHERE a.user_id=:user AND (p.proof_id=:file OR p.retention_proof_id=:file)',{user:req.user.id,file:file.id});
 if(!allowed)C.fail('Archivo no autorizado.',403);
 res.set('Cache-Control','private, no-store');res.type(file.mime);res.download(path.join(__dirname,'../../private_storage/affiliate_documents',file.filename),file.original_name);
});
