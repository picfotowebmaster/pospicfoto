-- =============================================
-- MIGRACIÓN 050: Factura global mensual
--   - Registro de facturas globales (público en general).
--   - Vínculo de pedidos incluidos en una factura global.
--   - Fecha de pago total para determinar el periodo.
-- =============================================

CREATE TABLE IF NOT EXISTS facturas_globales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo         TEXT NOT NULL,
  fecha_desde     DATE NOT NULL,
  fecha_hasta     DATE NOT NULL,
  folio           TEXT,
  serie           TEXT,
  uuid            TEXT,
  xml_url         TEXT,
  pdf_url         TEXT,
  estado          TEXT NOT NULL DEFAULT 'pendiente',
  error           TEXT,
  subtotal        NUMERIC(12,2),
  iva             NUMERIC(12,2),
  total           NUMERIC(12,2),
  pedidos_count   INT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facturas_globales_periodo
  ON facturas_globales(periodo, created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_facturas_globales ON facturas_globales;
CREATE TRIGGER set_updated_at_facturas_globales
  BEFORE UPDATE ON facturas_globales
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS factura_global_id UUID REFERENCES facturas_globales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS factura_global_incluida_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_pago_total TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pedidos_factura_global
  ON pedidos(factura_global_id) WHERE factura_global_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_global_pendientes
  ON pedidos(fecha_pago_total)
  WHERE factura_uuid IS NULL AND factura_global_id IS NULL;

UPDATE pedidos
SET fecha_pago_total = COALESCE(saldo_cobrado_en, created_at)
WHERE fecha_pago_total IS NULL
  AND estado <> 'cancelado'
  AND (saldo_cobrado = true OR total - anticipo <= 0.01);

ALTER TABLE facturas_globales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Facturas globales legibles por autenticados" ON facturas_globales;
CREATE POLICY "Facturas globales legibles por autenticados" ON facturas_globales
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Facturas globales insert por contabilidad" ON facturas_globales;
CREATE POLICY "Facturas globales insert por contabilidad" ON facturas_globales
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND rol IN ('contador', 'admin', 'superadmin')
  ));

DROP POLICY IF EXISTS "Facturas globales update por contabilidad" ON facturas_globales;
CREATE POLICY "Facturas globales update por contabilidad" ON facturas_globales
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND rol IN ('contador', 'admin', 'superadmin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND rol IN ('contador', 'admin', 'superadmin')
  ));

GRANT SELECT ON public.facturas_globales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas_globales TO service_role;
