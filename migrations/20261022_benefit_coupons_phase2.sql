-- Nueva migración: no reemplazar la migración de fase 1.
ALTER TABLE benefit_coupons
 ADD COLUMN IF NOT EXISTS servicio VARCHAR(30) NOT NULL DEFAULT 'resultados',
 ADD COLUMN IF NOT EXISTS "certificadosPermitidos" JSONB NOT NULL DEFAULT '["cert_emp","cert_mdt","cert_int"]',
 ADD COLUMN IF NOT EXISTS "beneficiarios" JSONB NOT NULL DEFAULT '[]',
 ADD COLUMN IF NOT EXISTS "maxPorPersona" INTEGER NOT NULL DEFAULT 1 CHECK ("maxPorPersona" > 0);
-- Los nombres históricos permanecen por compatibilidad; ahora cubren servicios de pago.
UPDATE benefit_coupons SET servicio='certificados' WHERE tipo IN ('curso_gratis','certificado_gratis');
ALTER TABLE benefit_coupon_redemptions
 ADD COLUMN IF NOT EXISTS servicio VARCHAR(30),
 ADD COLUMN IF NOT EXISTS seleccion JSONB NOT NULL DEFAULT '[]',
 ADD COLUMN IF NOT EXISTS "precioOriginal" NUMERIC(12,2),
 ADD COLUMN IF NOT EXISTS "saldoPendiente" NUMERIC(12,2),
 ADD COLUMN IF NOT EXISTS cubierto BOOLEAN NOT NULL DEFAULT FALSE,
 ADD COLUMN IF NOT EXISTS "couponSnapshot" JSONB;
-- Un único beneficio por destino/selección, incluso con códigos diferentes.
CREATE UNIQUE INDEX IF NOT EXISTS benefit_redemption_target_phase2_unique
 ON benefit_coupon_redemptions (referencia) WHERE servicio IS NOT NULL;
CREATE INDEX IF NOT EXISTS benefit_redemption_evaluation_idx ON benefit_coupon_redemptions ("evaluationId");
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS "couponRedemptionId" UUID REFERENCES benefit_coupon_redemptions(id);
CREATE UNIQUE INDEX IF NOT EXISTS pagos_coupon_redemption_unique ON pagos ("couponRedemptionId") WHERE "couponRedemptionId" IS NOT NULL;

ALTER TABLE certificados ADD COLUMN IF NOT EXISTS "couponRedemptionId" UUID REFERENCES benefit_coupon_redemptions(id);
