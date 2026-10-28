const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { QueryTypes } = require('sequelize');
const db = require('../utils/connection');
const { isSuperAdmin } = require('../utils/sessionSecurity');
const fail = (message,status=409) => {throw Object.assign(new Error(message),{status});};
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));
function cents(value){const n=Number(value);if(!Number.isFinite(n)||n<0||Math.round(n*100)>1e12)fail('Importe inválido.',400);return Math.round(n*100);}
const int = value => Number(value||0);
const month = (date=new Date()) => new Date(new Date(date).getTime()-5*3600000).toISOString().slice(0,7);
const names = ['Director comercial','Líder comercial','Asesor comercial','Promotor comercial'];
const adminUser = user => isSuperAdmin(user)||['administrador','admin','administrator'].includes(String(user?.role||'').toLowerCase());
const query = (sql,replacements={},transaction) => db.query(sql,{replacements,type:QueryTypes.SELECT,transaction});
const one = async(sql,r={},t) => (await query(sql,r,t))[0]||null;
const exec = (sql,r={},transaction) => db.query(sql,{replacements:r,transaction});
const lock = t => exec("SELECT pg_advisory_xact_lock(hashtext('idrmind-affiliates-finance'))",{},t);
const atomic = work => db.transaction(async t=>{await lock(t);return work(t);});
const settings = async t => (await one('SELECT config FROM affiliate_settings WHERE id=1',{},t)).config;
const audit = (actor,action,id,details={},t) => exec('INSERT INTO affiliate_audit(actor_id,action,subject_id,details) VALUES (:actor,:action,:id,CAST(:details AS jsonb))',{actor:actor||null,action,id:id||null,details:JSON.stringify(details)},t);
async function profile(userId,t){return one('SELECT * FROM affiliate_profiles WHERE user_id=:id',{id:userId},t);}
async function metrics(id,t){
 const row=await one(`SELECT COUNT(*) FILTER (WHERE payment_type='test_psicometrico' AND net_base_cents>0) AS tests,
 COALESCE(SUM(net_base_cents) FILTER (WHERE month=:month),0) AS revenue FROM affiliate_sales WHERE affiliate_id=:id`,{id,month:month()},t);
 return {tests:int(row.tests),revenueCents:int(row.revenue)};
}
async function canRecruit(p,t){if(!p||p.status!=='activo'||p.depth>=4)return false;const cfg=await settings(t);return (await metrics(p.id,t)).tests>=cfg.recruitGoals[p.depth-1];}
async function chain(p,t){const result=[],seen=new Set();let next=p;while(next&&result.length<4){if(seen.has(next.id))fail('Cadena de afiliación inválida.');seen.add(next.id);result.push({id:next.id,userId:next.user_id,depth:next.depth});next=next.sponsor_id?await one('SELECT * FROM affiliate_profiles WHERE id=:id',{id:next.sponsor_id},t):null;}return result;}
async function referral(code){const p=await one("SELECT id,code FROM affiliate_profiles WHERE code=:code AND status='activo'",{code:String(code||'').trim().toUpperCase()});if(!p)fail('Enlace de afiliado no disponible.',404);return {token:jwt.sign({purpose:'affiliate_referral',affiliateId:p.id},process.env.TOKEN_SECRET,{expiresIn:'30d'}),expiresAt:new Date(Date.now()+30*86400000).toISOString(),code:p.code};}
async function bindReferral(inscripcionId,token,transaction){
 if(!token)return false;
 let payload;try{payload=jwt.verify(token,process.env.TOKEN_SECRET);}catch{return false;}
 if(payload.purpose!=='affiliate_referral')return false;
 const work=async t=>{
  const ins=await one('SELECT id,"userId" FROM inscripcions WHERE id=:id FOR UPDATE',{id:inscripcionId},t);if(!ins)return false;
  if(await one('SELECT inscripcion_id FROM affiliate_attributions WHERE inscripcion_id=:id',{id:ins.id},t))return false;
  if(await one('SELECT id FROM pagos WHERE "inscripcionId"=:id LIMIT 1',{id:ins.id},t))return false;
  const p=await one("SELECT * FROM affiliate_profiles WHERE id=:id AND status='activo'",{id:payload.affiliateId},t);if(!p)return false;
  const list=await chain(p,t);if(list.some(item=>item.userId===ins.userId))return false;
  await exec('INSERT INTO affiliate_attributions(inscripcion_id,affiliate_id,chain) VALUES (:id,:affiliate,CAST(:chain AS jsonb)) ON CONFLICT DO NOTHING',{id:ins.id,affiliate:p.id,chain:JSON.stringify(list)},t);return true;
 };
 return transaction?work(transaction):db.transaction(work);
}
function validateConfig(cfg){
 for(const [key,len] of [['directRates',3],['uplineRates',3],['revenueGoals',2],['recruitGoals',4]])if(!Array.isArray(cfg[key])||cfg[key].length!==len||cfg[key].some(v=>!Number.isFinite(v)||v<0))fail('Configuración inválida: '+key,400);
 if(cfg.directRates.some(v=>v>100)||cfg.uplineRates.some(v=>v>100)||Math.max(...cfg.directRates)+cfg.uplineRates.reduce((a,b)=>a+b,0)>100)fail('Las comisiones no pueden superar el 100%.',400);
 if(cfg.directRates[0]>cfg.directRates[1]||cfg.directRates[1]>cfg.directRates[2]||cfg.revenueGoals[0]>=cfg.revenueGoals[1]||cfg.recruitGoals.some(v=>!Number.isInteger(v))||cfg.recruitGoals[3]!==0)fail('Revisa categorías y metas.',400);
 if(!Number.isFinite(cfg.minimumPayout)||cfg.minimumPayout<0||!String(cfg.termsVersion||'').trim())fail('Mínimo o versión de condiciones inválidos.',400);
}
module.exports={db,query,one,exec,atomic,lock,settings,audit,profile,metrics,canRecruit,chain,referral,bindReferral,cents,int,month,names,adminUser,uuid,fail,validateConfig,randomCode:()=>crypto.randomBytes(6).toString('hex').toUpperCase()};
