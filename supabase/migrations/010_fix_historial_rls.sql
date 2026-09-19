-- =============================================
-- MIGRACIÓN 010: FIX RLS productos_historial
-- =============================================
-- Las políticas anteriores permitían INSERT y UPDATE a cualquier autenticado.
-- Se restringen por rol: solo mostrador/admin pueden insertar, taller/admin actualizar.

DROP POLICY IF EXISTS "Historial insertable por autenticados" ON productos_historial;
DROP POLICY IF EXISTS "Historial actualizable por autenticados" ON productos_historial;

CREATE POLICY "Historial insertable por mostrador/admin" ON productos_historial
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('mostrador','admin','superadmin')));

CREATE POLICY "Historial actualizable por taller/admin" ON productos_historial
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('taller','admin','superadmin')));
