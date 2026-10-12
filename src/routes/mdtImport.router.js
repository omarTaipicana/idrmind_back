const express=require("express");
const verifyJWT=require("../utils/verifyJWT");
const upload=require("../utils/mdtUpload");
const ctrl=require("../controllers/mdtImport.controllers");
const router=express.Router();
router.post("/secretaria/certificados/mdt/importar",verifyJWT,ctrl.authorize,upload.single("zip"),ctrl.start);
router.get("/secretaria/certificados/mdt/importaciones/:id",verifyJWT,ctrl.authorize,ctrl.status);
module.exports=router;
