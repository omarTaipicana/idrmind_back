const User=require('../models/User');
const {isSuperAdmin}=require('../utils/sessionSecurity');
module.exports=async(req,res,next)=>{
 try{
  const actor=await User.findByPk(req.user.id),target=await User.findByPk(req.params.id);
  if(!actor||!target)return res.sendStatus(404);
  const superadmin=isSuperAdmin(actor),admin=superadmin||['administrador','admin','administrator'].includes(String(actor.role||'').toLowerCase());
  if(!admin&&actor.id!==target.id)return res.status(403).json({message:'Solo puedes editar tus propios datos.'});
  if(!superadmin&&req.body.role!==undefined&&req.body.role!==target.role)return res.status(403).json({message:'Solo Superadmin puede cambiar roles.'});
  if(!superadmin&&req.body.isVerified!==undefined&&[true,'true',1,'1'].includes(req.body.isVerified)!==!!target.isVerified)return res.status(403).json({message:'No puedes cambiar la verificación de la cuenta.'});
  if(!superadmin&&req.body.cI!==undefined&&String(req.body.cI)!==String(target.cI)&&(isSuperAdmin({cI:req.body.cI})||isSuperAdmin(target)))return res.status(403).json({message:'Documento reservado para administración.'});
  next();
 }catch(error){next(error);}
};
