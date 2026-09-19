-- =============================================
-- MIGRACIÓN 013: Facturación CFDI (FacturemosYa)
-- =============================================

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS factura_uuid TEXT,
  ADD COLUMN IF NOT EXISTS factura_xml_url TEXT,
  ADD COLUMN IF NOT EXISTS factura_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS factura_estado TEXT,
  ADD COLUMN IF NOT EXISTS factura_error TEXT,
  ADD COLUMN IF NOT EXISTS factura_fecha TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pedidos_factura_uuid ON pedidos(factura_uuid);
