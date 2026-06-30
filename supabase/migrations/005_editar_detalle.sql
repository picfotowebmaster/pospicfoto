-- Permitir UPDATE y DELETE en detalle_pedidos (solo SELECT e INSERT existían)
GRANT UPDATE, DELETE ON public.detalle_pedidos TO authenticated;

-- RLS: UPDATE detalle_pedidos para admin, superadmin, mostrador
CREATE POLICY "Detalle pedidos actualizable por admin/mostrador" ON detalle_pedidos
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('mostrador','admin','superadmin')));

-- RLS: DELETE detalle_pedidos para admin, superadmin, mostrador
CREATE POLICY "Detalle pedidos eliminable por admin/mostrador" ON detalle_pedidos
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('mostrador','admin','superadmin')));
