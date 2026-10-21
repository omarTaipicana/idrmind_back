const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const AdmZip = require("adm-zip");
const { Op } = require("sequelize");
const sequelize = require("../utils/connection");
const Course = require("../models/Course");
const User = require("../models/User");
const Inscripcion = require("../models/Inscripcion");
const Pagos = require("../models/Pagos");
const Certificado = require("../models/Certificado");
const {certificateAuthorization}=require("../utils/benefitCoupon.service");
const certificateEligibility=require("../utils/certificateEligibility");
const folderFor = tipo => tipo === "cert_int" ? "certificados_int" : "certificados_mdt";
const labelFor = tipo => tipo === "cert_int" ? "Internacional" : "Ministerio de Trabajo";
const sendEmail = require("../utils/sendEmail");

// Estados en memoria: adecuados para un solo proceso. Para PM2 cluster o reinicios,
// migrar a cola persistente antes de operar con varios workers.
const jobs = new Map();
const MAX_ENTRIES = 1500;
const MAX_UNCOMPRESSED = 300 * 1024 * 1024;
const ADMIN_EMAIL = () => process.env.IDRMIND_EMAIL || process.env.MDT_ADMIN_EMAIL;
// La URL pública debe apuntar al backend, nunca al dominio del frontend.
const apiOrigin = () => {
  const raw = (process.env.PUBLIC_API_URL || "http://localhost:8081").trim();
  try { const u = new URL(raw); if (!["http:", "https:"].includes(u.protocol)) throw Error(); return u.origin; }
  catch { throw new Error("PUBLIC_API_URL debe ser una URL HTTP(S) válida"); }
};
const certificateUrl = (sigla, cedula, tipo) => `${apiOrigin()}/uploads/${folderFor(tipo)}/${encodeURIComponent(sigla)}/${cedula}.pdf`;
const BRAND_LOGO = "https://res.cloudinary.com/dfq3tzlki/image/upload/v1760413741/1_qvykyo.png";
const mdtEmailHtml = ({ nombre, curso, url, tipo }) => `
  <div style="font-family:Arial,sans-serif;background-color:#f4f6f8;padding:20px;color:#333;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);">
      <div style="text-align:center;background-color:#102d5b;padding:25px;">
        <img src="${BRAND_LOGO}" alt="iDr.Mind" style="width:160px;max-width:100%;" />
      </div>
      <div style="padding:35px;text-align:center;">
        <h1 style="color:#1B326B;margin-bottom:10px;">¡Felicitaciones ${esc(nombre)}!</h1>
        <h2 style="font-weight:normal;margin-bottom:25px;">Tu certificado ${labelFor(tipo)} del curso:</h2>
        <h2 style="color:#1B326B;margin-bottom:25px;">«${esc(curso).toUpperCase()}»</h2>
        <p style="font-size:16px;line-height:1.6;margin-bottom:25px;">Tu certificado ${labelFor(tipo)} ya está disponible para su consulta y descarga en iDr.Mind.</p>
        <p style="text-align:center;margin-bottom:35px;">
          <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="background-color:#4D4D4D;color:#fff;padding:14px 30px;text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;display:inline-block;">📄 Descargar certificado ${labelFor(tipo)}</a>
        </p>
        <p style="font-size:16px;line-height:1.6;">También puedes consultarlo desde tu plataforma iDr.Mind, en Mis certificados.</p>
      </div>
      <div style="background-color:#f0f0f0;padding:25px;text-align:center;font-size:13px;color:#666;">
        <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
        <p>© ${new Date().getFullYear()} iDr.Mind. Todos los derechos reservados.</p>
      </div>
    </div>
  </div>`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const chosen = (v) => /^(true|1|si|sí|yes|x|mdt)$/i.test(String(v ?? "").trim());
function publicJob(j) { const { filePath, ...safe } = j; return safe; }
function jobFor(id) { return jobs.get(id); }
function setPhase(j, phase) { j.phase = phase; j.updatedAt = new Date().toISOString(); }
function validCedula(v) { return /^\d{10}$/.test(v); }
function scheduleCleanup() {
  if (jobs.size <= 100) return;
  const ordered = [...jobs.values()].filter(j => j.finishedAt).sort((a,b)=>a.finishedAt.localeCompare(b.finishedAt));
  for (const j of ordered.slice(0, Math.max(0,jobs.size-100))) jobs.delete(j.id);
}
function createJob(courseId, filePath, requestedBy, tipo = "cert_mdt") {
  const id = crypto.randomUUID();
  const j = { id, tipo, courseId, filePath, requestedBy, phase:"queued", total:0, processed:0, notified:0, toNotify:0, results:[], createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), finishedAt:null, adminEmailSent:false };
  jobs.set(id,j); scheduleCleanup();
  setImmediate(() => processJob(j).catch(e => { j.error=e.message;setPhase(j,"failed");j.finishedAt=new Date().toISOString(); }).finally(()=>fs.promises.unlink(filePath).catch(()=>{})));
  return publicJob(j);
}
async function processJob(j) {
  const course = await Course.findByPk(j.courseId);
  if (!course || course.tipo === "test_psicotecnico") throw new Error("Curso inexistente o no admite certificados de cursos");
  const sigla = String(course.sigla || "").trim();
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(sigla)) throw new Error("Sigla de curso no segura");
  const zip = new AdmZip(j.filePath);
  const entries = zip.getEntries().filter(e=>!e.isDirectory);
  if (entries.length > MAX_ENTRIES) throw new Error("ZIP con demasiados archivos");
  if (entries.reduce((s,e)=>s+(e.header?.size||0),0)>MAX_UNCOMPRESSED) throw new Error("ZIP descomprimido excede el límite");
  j.total=entries.length;
  const accepted=[];const seen=new Set();
  const base=path.join(__dirname,"../../uploads",folderFor(j.tipo),sigla);
  await fs.promises.mkdir(base,{recursive:true});
  setPhase(j,"processing");
  for (const entry of entries) {
    const name=path.posix.basename(entry.entryName.replace(/\\/g,"/"));
    const result={archivo:name,cedula:null,estado:"rechazado",motivo:null};
    try {
      if (!/\.pdf$/i.test(name)) throw new Error("Archivo no PDF");
      const match=name.match(/^(\d{10})/);
      if (!match || !validCedula(match[1])) throw new Error("El nombre debe comenzar con 10 dígitos de cédula");
      const cedula=match[1];result.cedula=cedula;
      if(seen.has(cedula)) {result.estado="duplicado";throw new Error("Cédula repetida en el ZIP");}
      seen.add(cedula);
      const user=await User.findOne({where:{cI:cedula}});
      if(!user) throw new Error("Usuario no encontrado");
      result.participante=`${user.firstName} ${user.lastName}`;
      const inscripciones=await Inscripcion.findAll({where:{userId:user.id,courseId:course.id}});
      if(!inscripciones.length) throw new Error("No matriculado en el curso seleccionado");
      let selected=null;
      let authorization=null;
      for(const ins of inscripciones) {
        const auth=await certificateAuthorization(ins.id,j.tipo);
        if(auth) {selected=ins;authorization=auth;break;}
      }
      if(!selected) throw new Error(`Sin pago validado o cupón completo para certificado ${labelFor(j.tipo)}. Los descuentos parciales requieren pago del saldo validado.`);
      await certificateEligibility(user,course);
      const target=path.join(base,`${cedula}.pdf`);
      const buffer=entry.getData();
      if(buffer.length<5 || buffer.subarray(0,5).toString()!=="%PDF-") throw new Error("Contenido PDF inválido");
      let written=false;
      try {
        await sequelize.transaction(async transaction=>{
          await Inscripcion.findByPk(selected.id,{transaction,lock:transaction.LOCK.UPDATE});
          authorization=await certificateAuthorization(selected.id,j.tipo,transaction);
          if(!authorization) throw new Error("La autorización de pago o cupón ya no es válida");
          const existing=await Certificado.findOne({where:{inscripcionId:selected.id,tipo:j.tipo},transaction});
          if(existing || fs.existsSync(target)) {result.estado="duplicado";throw new Error(`Certificado ${labelFor(j.tipo)} ya registrado o archivo existente`);}
          const handle=await fs.promises.open(target,"wx");written=true;
          try {await handle.writeFile(buffer);} finally {await handle.close();}
          await Certificado.create({curso:sigla,grupo:null,tipo:j.tipo,url:certificateUrl(sigla,cedula,j.tipo),entregado:"no",inscripcionId:selected.id,couponRedemptionId:authorization.couponRedemptionId||null},{transaction});
        });
      } catch(e) {if(written)await fs.promises.unlink(target).catch(()=>{});throw e;}
      result.autorizacion=authorization.metodo;
      result.cupon=authorization.codigo||null;
      result.estado="registrado";result.motivo=authorization.metodo==="cupon"?`Con cupón ${authorization.codigo}`:authorization.metodo==="pago_con_descuento"?`Pago del saldo validado; cupón ${authorization.codigo}`:"Pago validado";
      accepted.push({email:user.email,cedula,nombre:result.participante,url:certificateUrl(sigla,cedula,j.tipo)});
    } catch(e) {result.motivo=e.message;}
    j.results.push(result);j.processed++;j.updatedAt=new Date().toISOString();
  }
  j.toNotify=accepted.length;
  setPhase(j,"admin_notification");
  const summary={registrados:j.results.filter(x=>x.estado==="registrado").length,duplicados:j.results.filter(x=>x.estado==="duplicado").length,rechazados:j.results.filter(x=>x.estado==="rechazado").length};
  j.summary=summary;
  const admin=ADMIN_EMAIL();
  if(admin) {
    const rows=j.results.map(r=>`<tr><td>${esc(r.cedula)}</td><td>${esc(r.participante)}</td><td>${esc(r.archivo)}</td><td>${esc(r.estado)}</td><td>${esc(r.motivo)}</td></tr>`).join("");
    try {await sendEmail({to:admin,subject:`iDr.Mind | Importación ${labelFor(j.tipo)} ${sigla}: ${summary.registrados} nuevos, ${summary.duplicados} duplicados`,html:`<h2>Importación ${labelFor(j.tipo)} — ${esc(course.nombre)}</h2><p>Procesados: ${j.total}; registrados: ${summary.registrados}; duplicados: ${summary.duplicados}; rechazados: ${summary.rechazados}.</p><table border="1" cellpadding="5"><tr><th>Cédula</th><th>Participante</th><th>Archivo</th><th>Estado</th><th>Motivo</th></tr>${rows}</table>`});j.adminEmailSent=true;}catch(e){j.adminEmailError=e.message;}
  } else j.adminEmailError="Configure IDRMIND_EMAIL o MDT_ADMIN_EMAIL";
  // No notificar participantes hasta entregar correctamente el informe al administrador.
  if(!j.adminEmailSent) {setPhase(j,"admin_email_failed");j.finishedAt=new Date().toISOString();return;}
  setPhase(j,"notifying");
  j.notificationErrors=[];
  for(const p of accepted) {
    try {await sendEmail({to:p.email,subject:`Tu certificado ${labelFor(j.tipo)} de ${course.nombre} está disponible`,html:mdtEmailHtml({nombre:p.nombre,curso:course.nombre || sigla,url:p.url,tipo:j.tipo})});}
    catch(e){j.notificationErrors.push({cedula:p.cedula,error:e.message});}
    j.notified++;j.updatedAt=new Date().toISOString();
  }
  setPhase(j,"completed");j.finishedAt=new Date().toISOString();
}
module.exports={createJob,jobFor,publicJob};
