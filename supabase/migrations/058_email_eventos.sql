-- =============================================
-- MIGRACIÓN 058: Registro de envíos y eventos de correo (Resend)
-- =============================================

-- Envíos aceptados por Resend (se guarda el id para cruzar eventos).
CREATE TABLE IF NOT EXISTS email_envios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id   TEXT UNIQUE NOT NULL,
  tipo              TEXT NOT NULL DEFAULT 'otro',
  referencia_id     TEXT,
  destinatario      TEXT NOT NULL,
  asunto            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_envios_referencia
  ON email_envios (tipo, referencia_id);

-- Eventos recibidos por webhook (sent, delivered, delivery_delayed, bounced, etc.).
CREATE TABLE IF NOT EXISTS email_eventos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          TEXT UNIQUE NOT NULL,
  resend_email_id   TEXT,
  tipo              TEXT NOT NULL,
  destinatario      TEXT,
  payload           JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_eventos_email
  ON email_eventos (resend_email_id);

CREATE INDEX IF NOT EXISTS idx_email_eventos_tipo
  ON email_eventos (tipo);

-- Solo se accede con service role (createAdminClient); sin políticas públicas.
ALTER TABLE email_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_eventos ENABLE ROW LEVEL SECURITY;
