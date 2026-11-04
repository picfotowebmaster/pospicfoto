-- =============================================
-- MIGRACIÓN 051: Cancelación de facturas globales
-- =============================================

ALTER TABLE facturas_globales
  ADD COLUMN IF NOT EXISTS cancelacion_motivo TEXT,
  ADD COLUMN IF NOT EXISTS cancelacion_fecha TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelacion_acuse TEXT,
  ADD COLUMN IF NOT EXISTS cancelacion_pendiente_desde TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_facturas_globales_estado
  ON facturas_globales(estado, created_at DESC);
