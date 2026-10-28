-- Complementaria: no modificar las migraciones de cupones ya ejecutadas.
CREATE TABLE affiliate_settings (
 id INTEGER PRIMARY KEY CHECK(id=1), config JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO affiliate_settings VALUES (1,'{"directRates":[20,22,25],"revenueGoals":[1000,2500],"uplineRates":[5,3,2],"recruitGoals":[30,20,15,0],"minimumPayout":20,"termsVersion":"1","merchantName":"","merchantRuc":"","merchantAddress":""}',now());
CREATE TABLE affiliate_profiles (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
 sponsor_id UUID REFERENCES affiliate_profiles(id) ON DELETE RESTRICT, depth INTEGER NOT NULL CHECK(depth BETWEEN 1 AND 4),
 code VARCHAR(32) NOT NULL UNIQUE, status VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente','activo','rechazado','suspendido')),
 fiscal_name VARCHAR(220) NOT NULL, document VARCHAR(30) NOT NULL UNIQUE, phone VARCHAR(30) NOT NULL,
 ruc VARCHAR(13), fiscal_address TEXT, bank JSONB NOT NULL DEFAULT '{}', terms_version VARCHAR(40), accepted_at TIMESTAMPTZ,
 reviewed_by UUID REFERENCES users(id), reviewed_at TIMESTAMPTZ, review_note TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK(sponsor_id IS NULL OR sponsor_id<>id)
);
CREATE INDEX affiliate_profiles_sponsor_idx ON affiliate_profiles(sponsor_id);
CREATE TABLE affiliate_attributions (
 inscripcion_id UUID PRIMARY KEY REFERENCES inscripcions(id) ON DELETE RESTRICT,
 affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id), chain JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE affiliate_monthly_tiers (
 affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id), month VARCHAR(7) NOT NULL,
 rate NUMERIC(6,3) NOT NULL, source_revenue BIGINT NOT NULL, PRIMARY KEY(affiliate_id,month)
);
CREATE TABLE affiliate_sales (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), payment_id UUID NOT NULL UNIQUE REFERENCES pagos(id) ON DELETE RESTRICT,
 affiliate_id UUID REFERENCES affiliate_profiles(id), course_id UUID, payment_type VARCHAR(40) NOT NULL,
 gross_cents BIGINT NOT NULL CHECK(gross_cents>0), base_cents BIGINT NOT NULL CHECK(base_cents>=0),
 net_base_cents BIGINT NOT NULL CHECK(net_base_cents>=0), refunded_cents BIGINT NOT NULL DEFAULT 0,
 validated_at TIMESTAMPTZ NOT NULL DEFAULT now(), month VARCHAR(7) NOT NULL, config_snapshot JSONB NOT NULL, chain JSONB NOT NULL
);
CREATE INDEX affiliate_sales_metrics_idx ON affiliate_sales(affiliate_id,month);
CREATE TABLE affiliate_commissions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sale_id UUID NOT NULL REFERENCES affiliate_sales(id),
 affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id), level INTEGER NOT NULL CHECK(level BETWEEN 0 AND 3),
 rate NUMERIC(6,3) NOT NULL, original_cents BIGINT NOT NULL CHECK(original_cents>=0), reversed_cents BIGINT NOT NULL DEFAULT 0,
 UNIQUE(sale_id,affiliate_id), CHECK(reversed_cents BETWEEN 0 AND original_cents)
);
CREATE TABLE affiliate_files (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES users(id), purpose VARCHAR(20) NOT NULL CHECK(purpose IN ('factura','devolucion','liquidacion','retencion')),
 filename VARCHAR(180) NOT NULL, original_name VARCHAR(220) NOT NULL, mime VARCHAR(80) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE payment_refunds (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), payment_id UUID NOT NULL REFERENCES pagos(id) ON DELETE RESTRICT,
 amount_cents BIGINT NOT NULL CHECK(amount_cents>0), reason TEXT NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'solicitada' CHECK(status IN ('solicitada','aprobada','rechazada','realizada')),
 requested_by UUID NOT NULL REFERENCES users(id), reviewed_by UUID REFERENCES users(id), completed_by UUID REFERENCES users(id),
 proof_id UUID REFERENCES affiliate_files(id), reference VARCHAR(180), refunded_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 idempotency_key UUID NOT NULL UNIQUE
);
CREATE INDEX payment_refunds_payment_idx ON payment_refunds(payment_id);
CREATE TABLE affiliate_payouts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id), month VARCHAR(7) NOT NULL,
 commission_cents BIGINT NOT NULL CHECK(commission_cents>0), bank_snapshot JSONB NOT NULL, fiscal_snapshot JSONB NOT NULL,
 status VARCHAR(25) NOT NULL DEFAULT 'pendiente_factura' CHECK(status IN ('pendiente_factura','factura_recibida','aprobada','pagada','cancelada')),
 invoice_id UUID REFERENCES affiliate_files(id), invoice_key VARCHAR(49) UNIQUE, invoice_number VARCHAR(30), invoice_vat_cents BIGINT NOT NULL DEFAULT 0,
 retention_income_cents BIGINT NOT NULL DEFAULT 0, retention_vat_cents BIGINT NOT NULL DEFAULT 0,
 retention_proof_id UUID REFERENCES affiliate_files(id),
 proof_id UUID REFERENCES affiliate_files(id), transfer_reference VARCHAR(180), reviewed_by UUID REFERENCES users(id), paid_by UUID REFERENCES users(id), paid_at TIMESTAMPTZ,
 note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX affiliate_payouts_period_unique ON affiliate_payouts(affiliate_id,month) WHERE status<>'cancelada';
CREATE TABLE affiliate_entries (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id),
 sale_id UUID NOT NULL REFERENCES affiliate_sales(id), commission_id UUID NOT NULL REFERENCES affiliate_commissions(id),
 refund_id UUID REFERENCES payment_refunds(id), amount_cents BIGINT NOT NULL, entry_key VARCHAR(180) NOT NULL UNIQUE,
 payout_id UUID REFERENCES affiliate_payouts(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX affiliate_entries_balance_idx ON affiliate_entries(affiliate_id,payout_id);
CREATE TABLE affiliate_audit (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID REFERENCES users(id), action VARCHAR(80) NOT NULL,
 subject_id UUID, details JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE affiliate_invoice_keys (invoice_key VARCHAR(49) PRIMARY KEY, payout_id UUID NOT NULL REFERENCES affiliate_payouts(id));
