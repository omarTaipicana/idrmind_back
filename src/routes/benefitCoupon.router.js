const router=require("express").Router();
const verifyJWT=require("../utils/verifyJWT");
const c=require("../controllers/benefitCoupon.controllers");
const application=require("../controllers/couponApplication.controllers");
const requireAdmin=require("../utils/requirePsychometricAdmin");
// Límite por IP; memoria acotada. El canje también se protege con bloqueos PostgreSQL.
const attempts=new Map();
function rateLimit(req,res,next){
 const key=req.user?.id || (req.params.token ? require("crypto").createHash("sha256").update(req.params.token).digest("hex") : req.ip); const now=Date.now(); let item=attempts.get(key);
 if(!item||item.until<=now){item={count:0,until:now+60000};attempts.set(key,item);}
 if(attempts.size>10000)for(const [k,v] of attempts){if(v.until<=now)attempts.delete(k);}
 if(attempts.size>10000)attempts.delete(attempts.keys().next().value);
 if(++item.count>30)return res.status(429).json({message:"Demasiados intentos. Espera un minuto."});
 next();
}
router.post("/benefit-coupons/check",verifyJWT,rateLimit,application.check);
router.post("/benefit-coupons/redeem",verifyJWT,rateLimit,application.redeem);
router.post("/benefit-coupons/status",verifyJWT,application.status);
router.get("/benefit-coupons/register",verifyJWT,requireAdmin,application.register);
router.get("/benefit-coupons/applications",verifyJWT,requireAdmin,application.adminHistory);
router.post("/benefit-coupons/applications/:id/certificate",verifyJWT,application.issueCertificate);
router.post("/psychometric/payment/:token/coupon/check",rateLimit,application.check);
router.post("/psychometric/payment/:token/coupon/redeem",rateLimit,application.redeem);
router.post("/psychometric/payment/:token/coupon/status",rateLimit,application.status);
router.get("/benefit-coupons/options",verifyJWT,c.admin,c.options);
router.get("/benefit-coupons",verifyJWT,c.admin,c.list);
router.post("/benefit-coupons",verifyJWT,c.admin,c.create);
router.put("/benefit-coupons/:id",verifyJWT,c.admin,c.update);
router.get("/benefit-coupons/:id/redemptions",verifyJWT,c.admin,c.history);
module.exports=router;
