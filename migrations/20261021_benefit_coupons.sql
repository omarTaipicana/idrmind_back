-- Ejecutar manualmente, tras respaldo, en PostgreSQL. No altera tablas de pagos.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN CREATE TYPE enum_benefit_coupons_tipo AS ENUM ('test_gratis','curso_gratis','descuento','paquete_empresa','certificado_gratis'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_benefit_coupons_descuentoTipo AS ENUM ('porcentaje','fijo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS benefit_coupons (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), codigo VARCHAR(80) NOT NULL UNIQUE, nombre VARCHAR(180) NOT NULL,
 tipo enum_benefit_coupons_tipo NOT NULL, "objetivoId" UUID, "empresaId" UUID,
 "descuentoTipo" enum_benefit_coupons_descuentoTipo, "descuentoValor" NUMERIC(12,2),
 "maxUsos" INTEGER NOT NULL DEFAULT 1 CHECK ("maxUsos">0), usos INTEGER NOT NULL DEFAULT 0 CHECK (usos>=0),
 "vigenteDesde" TIMESTAMPTZ, "venceAt" TIMESTAMPTZ,
 "incluyeResultados" BOOLEAN NOT NULL DEFAULT FALSE, activo BOOLEAN NOT NULL DEFAULT TRUE,
 "creadoPor" UUID, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT benefit_coupons_uses_limit CHECK(usos<="maxUsos")
);
CREATE TABLE IF NOT EXISTS benefit_coupon_redemptions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "couponId" UUID NOT NULL REFERENCES benefit_coupons(id),
 "userId" UUID NOT NULL, "inscripcionId" UUID, "evaluationId" UUID,
 referencia VARCHAR(180) NOT NULL, "montoDescontado" NUMERIC(12,2) NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE("couponId","userId",referencia)
);
CREATE INDEX IF NOT EXISTS benefit_coupon_redemptions_coupon_idx ON benefit_coupon_redemptions("couponId");
