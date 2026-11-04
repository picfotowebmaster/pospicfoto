-- =============================================
-- MIGRACIÓN 049: Datos fiscales del comprador
--   - Captura de RFC y datos de facturación desde mostrador.
--   - Catálogo de clientes fiscales para autocompletar.
-- =============================================

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS requiere_factura BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cliente_rfc TEXT,
  ADD COLUMN IF NOT EXISTS cliente_razon_social TEXT,
  ADD COLUMN IF NOT EXISTS cliente_regimen_fiscal TEXT,
  ADD COLUMN IF NOT EXISTS cliente_uso_cfdi TEXT,
  ADD COLUMN IF NOT EXISTS cliente_cp_fiscal TEXT;

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_rfc
  ON pedidos(cliente_rfc) WHERE cliente_rfc IS NOT NULL;

CREATE TABLE IF NOT EXISTS clientes_fiscales (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfc              TEXT NOT NULL UNIQUE,
  razon_social     TEXT NOT NULL,
  regimen_fiscal   TEXT,
  uso_cfdi         TEXT,
  cp_fiscal        TEXT,
  email            TEXT,
  telefono         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clientes_fiscales_telefono
  ON clientes_fiscales(telefono) WHERE telefono IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_fiscales_email
  ON clientes_fiscales(email) WHERE email IS NOT NULL;

DROP TRIGGER IF EXISTS set_updated_at_clientes_fiscales ON clientes_fiscales;
CREATE TRIGGER set_updated_at_clientes_fiscales
  BEFORE UPDATE ON clientes_fiscales
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

ALTER TABLE clientes_fiscales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clientes fiscales legibles por autenticados" ON clientes_fiscales;
CREATE POLICY "Clientes fiscales legibles por autenticados" ON clientes_fiscales
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Clientes fiscales insert por roles" ON clientes_fiscales;
CREATE POLICY "Clientes fiscales insert por roles" ON clientes_fiscales
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND rol IN ('mostrador', 'admin', 'superadmin', 'contador')
  ));

DROP POLICY IF EXISTS "Clientes fiscales update por roles" ON clientes_fiscales;
CREATE POLICY "Clientes fiscales update por roles" ON clientes_fiscales
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND rol IN ('mostrador', 'admin', 'superadmin', 'contador')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND rol IN ('mostrador', 'admin', 'superadmin', 'contador')
  ));

GRANT SELECT, INSERT, UPDATE ON public.clientes_fiscales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes_fiscales TO service_role;
