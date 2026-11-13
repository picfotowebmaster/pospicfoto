-- =============================================
-- MIGRACIÓN 059: Enlaces públicos para compartir tickets
-- =============================================

CREATE TABLE IF NOT EXISTS enlaces_compartidos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id   UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_by  UUID REFERENCES auth.users(id),
  expires_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enlaces_compartidos_token
  ON enlaces_compartidos (token);

CREATE INDEX IF NOT EXISTS idx_enlaces_compartidos_pedido
  ON enlaces_compartidos (pedido_id, revoked_at, expires_at);

-- Solo se accede con service role; no se exponen políticas públicas.
ALTER TABLE enlaces_compartidos ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE enlaces_compartidos TO service_role;
