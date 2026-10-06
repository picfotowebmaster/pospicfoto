-- =============================================
-- MIGRACIÓN 020: Colaboración en producción
-- prioridad, asignación, notas, corrección con motivo
-- y comentarios/incidencias por pedido
-- =============================================

-- 1. Campos nuevos en pedidos
-- =============================================
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS prioridad TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS asignado_a UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_correccion TEXT,
  ADD COLUMN IF NOT EXISTS notas TEXT,
  ADD COLUMN IF NOT EXISTS orden_manual INT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_prioridad_check') THEN
    ALTER TABLE pedidos
      ADD CONSTRAINT pedidos_prioridad_check CHECK (prioridad IN ('normal', 'urgente'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pedidos_asignado ON pedidos(asignado_a);
CREATE INDEX IF NOT EXISTS idx_pedidos_prioridad ON pedidos(prioridad);

-- 2. Comentarios / incidencias por pedido
-- =============================================
CREATE TABLE IF NOT EXISTS pedido_comentarios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id  UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  autor_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tipo       TEXT NOT NULL DEFAULT 'comentario',
  texto      TEXT NOT NULL,
  foto_url   TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedido_comentarios_pedido ON pedido_comentarios(pedido_id);

ALTER TABLE pedido_comentarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comentarios legibles por autenticados" ON pedido_comentarios;
CREATE POLICY "Comentarios legibles por autenticados" ON pedido_comentarios
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Comentarios insert por produccion/admin" ON pedido_comentarios;
CREATE POLICY "Comentarios insert por produccion/admin" ON pedido_comentarios
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND rol IN ('diseno','impresion','laminado','montaje','books','bastidores','marcos','taller','corte','admin','superadmin','mostrador')
    )
  );

DROP POLICY IF EXISTS "Comentarios delete por autor o admin" ON pedido_comentarios;
CREATE POLICY "Comentarios delete por autor o admin" ON pedido_comentarios
  FOR DELETE TO authenticated
  USING (
    autor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('admin','superadmin'))
  );

GRANT SELECT, INSERT, DELETE ON public.pedido_comentarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedido_comentarios TO service_role;

-- 3. Realtime para comentarios
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pedido_comentarios'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pedido_comentarios;
  END IF;
END $$;
