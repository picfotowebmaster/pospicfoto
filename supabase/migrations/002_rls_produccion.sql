-- =============================================
-- MIGRACIÓN 002: RLS para tablas de producción
-- =============================================

ALTER TABLE production_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_movimientos ENABLE ROW LEVEL SECURITY;

-- Áreas de producción: legibles por todos los autenticados
CREATE POLICY "Production areas legibles por autenticados" ON production_areas
  FOR SELECT TO authenticated USING (true);

-- Rutas de workflow: legibles por todos los autenticados
CREATE POLICY "Workflow routes legibles por autenticados" ON workflow_routes
  FOR SELECT TO authenticated USING (true);

-- Movimientos: insert y lectura por producción/admin
CREATE POLICY "Movimientos legibles por autenticados" ON pedido_movimientos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Movimientos insert por produccion/admin" ON pedido_movimientos
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('taller','corte','admin','superadmin','mostrador')));

-- Actualizar RLS en pedidos para permitir UPDATE de area_actual por producción
DROP POLICY IF EXISTS "Pedidos actualizables por produccion/admin" ON pedidos;
CREATE POLICY "Pedidos actualizables por produccion/admin" ON pedidos
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('taller','corte','admin','superadmin','mostrador')));

-- Habilitar realtime en pedido_movimientos
ALTER PUBLICATION supabase_realtime ADD TABLE pedido_movimientos;
