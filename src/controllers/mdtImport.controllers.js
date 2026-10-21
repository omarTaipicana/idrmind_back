const fs=require("fs");
const Course=require("../models/Course");
const {createJob,jobFor,publicJob}=require("../services/mdtImport.service");
const ROLES=(process.env.MDT_IMPORT_ROLES||"admin,administrador,secretaria,secretary,superadmin").split(",").map(s=>s.trim().toLowerCase());
function authorize(req,res,next){if(!require("../utils/sessionSecurity").isSuperAdmin(req.user) && !ROLES.includes(String(req.user?.role||"").toLowerCase()))return res.status(403).json({message:"Sin permiso para importar certificados"});next();}
async function start(req,res){
  const file=req.file;
  try {
    if(!file)return res.status(400).json({message:"Debe adjuntar un archivo ZIP en el campo zip"});
    const tipo=req.body.tipo || "cert_mdt";
    if(!["cert_mdt","cert_int"].includes(tipo))return res.status(400).json({message:"Seleccione Ministerio o Internacional"});
    const course=await Course.findByPk(req.body.courseId);
    if(!course||course.tipo==="test_psicotecnico")return res.status(400).json({message:"Seleccione un curso válido"});
    return res.status(202).json(createJob(course.id,file.path,req.user.id,tipo));
  } catch(e){return res.status(500).json({message:e.message});}
  finally {if(file && res.statusCode!==202) await fs.promises.unlink(file.path).catch(()=>{});}
}
function status(req,res){const job=jobFor(req.params.id);if(!job)return res.status(404).json({message:"Trabajo no encontrado o expirado"});if(job.requestedBy!==req.user.id && !require("../utils/sessionSecurity").isSuperAdmin(req.user) && !["admin","administrador","superadmin"].includes(String(req.user.role).toLowerCase()))return res.sendStatus(403);return res.json(publicJob(job));}
module.exports={authorize,start,status};
