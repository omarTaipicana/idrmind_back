ALTER TABLE affiliate_profiles DROP CONSTRAINT affiliate_profiles_status_check;
ALTER TABLE affiliate_profiles ADD CONSTRAINT affiliate_profiles_status_check
  CHECK (status IN ('pendiente','activo','rechazado','suspendido','archivado'));

CREATE INDEX affiliate_audit_archive_idx ON affiliate_audit (created_at DESC)
  WHERE action = 'affiliate_archive';
