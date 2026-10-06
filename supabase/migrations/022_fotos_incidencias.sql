-- =============================================
-- MIGRACIÓN 022: Fotos en incidencias/comentarios (Storage)
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('pedido-fotos', 'pedido-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública (bucket público)
DROP POLICY IF EXISTS "Pedido fotos lectura publica" ON storage.objects;
CREATE POLICY "Pedido fotos lectura publica" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pedido-fotos');

-- Subida solo para usuarios autenticados, en carpeta por pedido
DROP POLICY IF EXISTS "Pedido fotos subida autenticados" ON storage.objects;
CREATE POLICY "Pedido fotos subida autenticados" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pedido-fotos'
    AND (storage.foldername(name))[1] IS NOT NULL
  );

-- Borrado por el autor o un admin
DROP POLICY IF EXISTS "Pedido fotos borrado autor o admin" ON storage.objects;
CREATE POLICY "Pedido fotos borrado autor o admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'pedido-fotos'
    AND (
      owner = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin','superadmin'))
    )
  );
