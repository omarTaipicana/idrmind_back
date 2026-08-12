const {
  getAll,
  getDashboardPagos,
  validatePago,
  create,
  getOne,
  remove,
  update,
  certificado,

  getPsychometricPaymentAccess,
  createPsychometricPayment,

  generatePsychometricResult,
} = require(
  "../controllers/pagos.controllers"
);

const express = require("express");

const upload = require(
  "../utils/multer"
);

const verifyJWT = require(
  "../utils/verifyJWT"
);

const pagosRouter =
  express.Router();

/* =========================================
   PAGOS GENERALES
========================================= */

pagosRouter
  .route("/pagos")
  .get(getAll)
  .post(
    upload.upload.single(
      "imagePago"
    ),
    upload.generateFileUrl,
    create
  );

/* =========================================
   DASHBOARD DE PAGOS
========================================= */

pagosRouter
  .route("/pagos_dashboard")
  .get(getDashboardPagos);

/* =========================================
   VALIDAR PAGO POR CÉDULA / CURSO
========================================= */

pagosRouter
  .route("/pagovalidate")
  .post(validatePago);

/* =========================================
   PAGO PSICOMÉTRICO POR TOKEN
   PÚBLICO - NO REQUIERE LOGIN
========================================= */

/*
 * Obtener datos de la evaluación,
 * usuario, curso y estado del pago.
 */
pagosRouter
  .route(
    "/psychometric/payment/:token"
  )
  .get(
    getPsychometricPaymentAccess
  );

/*
 * Registrar comprobante del pago
 * psicométrico.
 *
 * El frontend solamente envía:
 * - imagePago
 * - valorDepositado
 * - entidad (opcional)
 * - idDeposito (opcional)
 * - observacion (opcional)
 *
 * inscripcionId y evaluationId
 * se obtienen desde el token.
 */
pagosRouter
  .route(
    "/psychometric/payment/:token"
  )
  .post(
    upload.upload.single(
      "imagePago"
    ),
    upload.generateFileUrl,
    createPsychometricPayment
  );

/* =========================================
   CRUD DE PAGOS
========================================= */

pagosRouter
  .route("/pagos/:id")
  .get(getOne)
  .delete(remove)
  .put(
    verifyJWT,
    update
  );

/* =========================================
   CERTIFICADO
========================================= */

pagosRouter
  .route(
    "/pagos/:id/certificado"
  )
  .post(
    verifyJWT,
    certificado
  );

/* =========================================
 GENERAR RESULTADO PSICOMÉTRICO
 ADMINISTRATIVO
========================================= */

pagosRouter
  .route(
    "/pagos/:id/resultado-psicometrico"
  )
  .post(
    verifyJWT,
    generatePsychometricResult
  );

module.exports =
  pagosRouter;