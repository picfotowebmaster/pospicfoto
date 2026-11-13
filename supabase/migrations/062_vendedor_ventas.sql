-- =============================================
-- MIGRACIÓN 062: Vendedor y cobrador del saldo
-- =============================================

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS saldo_cobrado_por UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_cajero_fecha
  ON pedidos(cajero_id, fecha_recepcion DESC)
  WHERE cajero_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_saldo_cobrado_por
  ON pedidos(saldo_cobrado_por)
  WHERE saldo_cobrado_por IS NOT NULL;
