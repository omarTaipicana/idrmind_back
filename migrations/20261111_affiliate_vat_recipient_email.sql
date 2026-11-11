-- Añade claves sin reemplazar la configuración comercial ni cambiar la versión.
-- null indica que Superadmin todavía debe confirmar el porcentaje (0 si no aplica).
UPDATE affiliate_settings
SET config = '{"vatRate":null,"merchantEmail":""}'::jsonb || config
WHERE id = 1 AND (NOT (config ? 'vatRate') OR NOT (config ? 'merchantEmail'));
