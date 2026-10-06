-- =============================================
-- MIGRACIÓN 021: Registro de cobro de saldo en entrega
-- =============================================

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS saldo_cobrado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS saldo_metodo_pago TEXT,
  ADD COLUMN IF NOT EXISTS saldo_cobrado_en TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pedidos_saldo_cobrado ON pedidos(saldo_cobrado);
