-- =============================================
-- MIGRACIÓN 067: Eliminación de usuarios
-- Permite borrar usuarios de auth sin romper las
-- referencias históricas en pedidos y movimientos.
-- =============================================

ALTER TABLE pedidos
  DROP CONSTRAINT IF EXISTS pedidos_cajero_id_fkey,
  ADD CONSTRAINT pedidos_cajero_id_fkey
    FOREIGN KEY (cajero_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE pedidos
  DROP CONSTRAINT IF EXISTS pedidos_cancelado_por_fkey,
  ADD CONSTRAINT pedidos_cancelado_por_fkey
    FOREIGN KEY (cancelado_por) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE pedidos
  DROP CONSTRAINT IF EXISTS pedidos_reembolso_realizado_por_fkey,
  ADD CONSTRAINT pedidos_reembolso_realizado_por_fkey
    FOREIGN KEY (reembolso_realizado_por) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE pedido_movimientos
  DROP CONSTRAINT IF EXISTS pedido_movimientos_operador_id_fkey,
  ADD CONSTRAINT pedido_movimientos_operador_id_fkey
    FOREIGN KEY (operador_id) REFERENCES profiles(id) ON DELETE SET NULL;
