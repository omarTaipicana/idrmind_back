const { Op } = require('sequelize');
const Empresa = require('../models/Empresa');
const Course = require('../models/Course');
const Test = require('../models/PsychometricTest');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = message => { throw Object.assign(new Error(message),{status:400}); };
const companyOption = row => ({id:row.id,label:row.nombreComercial||row.razonSocial,detail:[row.razonSocial!==row.nombreComercial?row.razonSocial:'',row.ruc].filter(Boolean).join(' · ')});
const courseOption = (row,id=row.id) => ({id,label:row.nombre,detail:[row.tipo==='test_psicotecnico'?'Test psicométrico':'Curso',row.sigla].filter(Boolean).join(' · ')});
async function resolveTarget(id,transaction) {
 if (!uuid.test(String(id))) fail('Selecciona un curso o test de las sugerencias.');
 let course=await Course.findByPk(id,{transaction});
 if (course) return course;
 const test=await Test.findByPk(id,{transaction});
 return test ? Course.findByPk(test.courseId,{transaction}) : null;
}
async function validateTargets(payload,transaction) {
 if (payload.empresaId) {
  if(!uuid.test(String(payload.empresaId)) || !await Empresa.findByPk(payload.empresaId,{transaction})) fail('La empresa seleccionada no existe. Elige una sugerencia o deja el campo vacío.');
 }
 if (payload.objetivoId) {
  const course=await resolveTarget(payload.objetivoId,transaction);
  if(!course) fail('El curso o test seleccionado no existe. Elige una sugerencia o deja el campo vacío.');
  if((course.tipo==='test_psicotecnico') !== (payload.servicio==='resultados')) fail('El curso o test seleccionado no corresponde al servicio del cupón.');
 }
}
async function options(query={}) {
 if(!['empresa','objetivo'].includes(query.kind)) fail('Buscador inválido.');
 if(query.kind==='objetivo'&&!['resultados','certificados'].includes(query.servicio)) fail('Selecciona el servicio del cupón.');
 if(query.id){
  if(!uuid.test(String(query.id))) fail('Selección inválida.');
  if(query.kind==='empresa') {const row=await Empresa.findByPk(query.id);return row?[companyOption(row)]:[];}
  const row=await resolveTarget(query.id);
  return row?[courseOption(row,query.id)]:[];
 }
 const text=String(query.q||'').trim().slice(0,150);
 if(!text) return [];
 const search={ [Op.iLike]:`%${text}%` };
 if(query.kind==='empresa') {
  const rows=await Empresa.findAll({where:{[Op.or]:[{nombreComercial:search},{razonSocial:search},{ruc:search}]},attributes:['id','razonSocial','nombreComercial','ruc'],order:[['razonSocial','ASC']],limit:25});
  return rows.map(companyOption);
 }
 const rows=await Course.findAll({where:{tipo:query.servicio==='resultados'?'test_psicotecnico':'curso',[Op.or]:[{nombre:search},{sigla:search}]},attributes:['id','nombre','sigla','tipo'],order:[['nombre','ASC']],limit:25});
 return rows.map(row=>courseOption(row));
}
module.exports={options,validateTargets};
