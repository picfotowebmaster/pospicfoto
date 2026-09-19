-- =============================================
-- MIGRACIÓN 011: Soporte multi-ruta (split de pedidos)
-- =============================================

-- Agrupa pedidos que vienen de una misma venta con productos de rutas distintas
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS factura_numero TEXT;

CREATE INDEX IF NOT EXISTS idx_pedidos_factura ON pedidos(factura_numero);
