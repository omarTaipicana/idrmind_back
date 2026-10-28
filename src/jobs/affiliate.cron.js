const cron=require('node-cron');
const C=require('../services/affiliateCore.service');
const F=require('../services/affiliateFinance.service');
module.exports=function startAffiliateCron(){
 if(process.env.AFFILIATE_AUTO_CLOSE==='false')return;
 const closePrevious=async()=>{
  const current=C.month(),date=new Date(current+'-01T00:00:00-05:00');date.setUTCDate(date.getUTCDate()-1);
  try{await F.closeMonth(C.month(date),null);}catch(error){console.error('No se pudo preparar el corte de afiliados:',error.message);}
 };
 // Prepara borradores; jamás transfiere dinero ni aprueba facturas automáticamente.
 closePrevious();
 cron.schedule('10 1 1 * *',closePrevious,{timezone:'America/Guayaquil'});
};
