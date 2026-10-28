-- =============================================
-- MIGRACIÓN 048: Descuentos por producto/categoría
--   - Promociones automáticas con rango de fechas.
--   - Porcentaje o monto fijo.
--   - Un solo destino por promoción.
--   - Snapshot del descuento en detalle_pedidos.
-- =============================================

CREATE TABLE IF NOT EXISTS descuentos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,
  tipo         TEXT NOT NULL CHECK (tipo IN ('porcentaje', 'monto_fijo')),
  valor        NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  alcance      TEXT NOT NULL CHECK (alcance IN ('producto', 'categoria')),
  producto_id  UUID REFERENCES productos(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  activo       BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fecha_fin >= fecha_inicio),
  CHECK (
    (alcance = 'producto' AND producto_id IS NOT NULL AND categoria_id IS NULL) OR
    (alcance = 'categoria' AND categoria_id IS NOT NULL AND producto_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_descuentos_vigencia
  ON descuentos(activo, fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_descuentos_producto
  ON descuentos(producto_id) WHERE producto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_descuentos_categoria
  ON descuentos(categoria_id) WHERE categoria_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_updated_at_descuentos ON descuentos;
CREATE TRIGGER set_updated_at_descuentos
  BEFORE UPDATE ON descuentos
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

ALTER TABLE descuentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Descuentos legibles por autenticados" ON descuentos;
CREATE POLICY "Descuentos legibles por autenticados" ON descuentos
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.descuentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.descuentos TO service_role;

-- Snapshot del descuento aplicado en cada línea
ALTER TABLE detalle_pedidos
  ADD COLUMN IF NOT EXISTS descuento_id UUID REFERENCES descuentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS descuento_nombre TEXT,
  ADD COLUMN IF NOT EXISTS descuento_tipo TEXT,
  ADD COLUMN IF NOT EXISTS descuento_valor NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS descuento_monto NUMERIC(10,2);
