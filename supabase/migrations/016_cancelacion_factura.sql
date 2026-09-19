-- =============================================
-- MIGRACIÓN 015: Cancelación de factura CFDI (FacturemosYa)
-- =============================================

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS factura_cancelacion_motivo TEXT,
  ADD COLUMN IF NOT EXISTS factura_cancelacion_fecha TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS factura_cancelacion_acuse TEXT;
