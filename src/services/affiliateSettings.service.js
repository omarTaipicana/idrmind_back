const {isDeepStrictEqual}=require('node:util');

const defaults={vatRate:null,merchantEmail:''};
const fields=['directRates','uplineRates','revenueGoals','recruitGoals','minimumPayout','vatRate','merchantName','merchantRuc','merchantAddress','merchantEmail'];
const invalid=message=>{throw Object.assign(new Error(message),{status:400});};
const validVat=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100&&Math.abs(value*100-Math.round(value*100))<1e-8;

function splitVat(gross,rate){
 if(!validVat(rate))invalid('Configura el porcentaje de IVA en Administración → Afiliados → Configuración antes de validar pagos. Usa 0 si no aplica.');
 if(!Number.isSafeInteger(gross)||gross<=0)invalid('El pago debe ser mayor a cero.');
 const divisor=10000n+BigInt(Math.round(rate*100));
 const base=Number((BigInt(gross)*10000n+divisor/2n)/divisor);
 return {base,vat:gross-base};
}

function nextVersion(version){
 const s=String(version);
 if(/^\d{1,38}$/.test(s))return String(BigInt(s)+1n);
 if(/^auto-\d{1,34}$/.test(s))return 'auto-'+String(BigInt(s.slice(5))+1n);
 return 'auto-1';
}

function prepareSettings(current,body,validate){
 if(!body||typeof body!=='object'||Array.isArray(body))invalid('Configuración inválida.');
 const next={...defaults,...current};
 for(const key of fields)if(Object.hasOwn(body,key))next[key]=body[key];
 for(const [key,max] of [['merchantName',220],['merchantRuc',13],['merchantAddress',500],['merchantEmail',254]]){
  if(typeof next[key]!=='string'||next[key].trim().length>max)invalid('Revisa los datos del receptor de facturas.');
  next[key]=next[key].trim();
 }
 if(next.merchantRuc&&!/^\d{13}$/.test(next.merchantRuc))invalid('El RUC receptor debe tener 13 dígitos.');
 if(next.merchantEmail&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(next.merchantEmail))invalid('Ingresa un correo válido para el receptor de facturas.');
 if(!validVat(next.vatRate))splitVat(100,next.vatRate);
 validate(next);
 if(isDeepStrictEqual(next,{...defaults,...current}))return null;
 if(body.expectedVersion!==undefined&&body.expectedVersion!==current.termsVersion)
  throw Object.assign(new Error('La configuración cambió. Actualiza la pantalla antes de guardar.'),{status:409});
 return {...next,termsVersion:nextVersion(current.termsVersion)};
}
module.exports={defaults,splitVat,prepareSettings};
