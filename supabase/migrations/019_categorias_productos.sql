-- =============================================
-- MIGRACIÓN 019: Catálogo de productos y categorías
-- =============================================

CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  orden INT DEFAULT 0,
  activo BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  ruta TEXT DEFAULT 'R1',
  orden INT DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  UNIQUE (categoria_id, nombre)
);

CREATE TABLE IF NOT EXISTS producto_atributos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  atributo_id UUID NOT NULL REFERENCES atributos(id) ON DELETE CASCADE,
  orden INT DEFAULT 0,
  requerido BOOLEAN DEFAULT false,
  UNIQUE (producto_id, atributo_id)
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_producto_atributos_producto ON producto_atributos(producto_id);
CREATE INDEX IF NOT EXISTS idx_producto_atributos_atributo ON producto_atributos(atributo_id);

ALTER TABLE detalle_pedidos
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS producto_id  UUID REFERENCES productos(id)  ON DELETE SET NULL;

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_atributos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categorias legibles por autenticados" ON categorias;
DROP POLICY IF EXISTS "Productos legibles por autenticados" ON productos;
DROP POLICY IF EXISTS "Producto atributos legibles por autenticados" ON producto_atributos;

CREATE POLICY "Categorias legibles por autenticados" ON categorias
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Productos legibles por autenticados" ON productos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Producto atributos legibles por autenticados" ON producto_atributos
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.categorias TO authenticated;
GRANT SELECT ON public.productos TO authenticated;
GRANT SELECT ON public.producto_atributos TO authenticated;

-- Escritura para el panel admin (server actions con service_role)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.productos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_atributos TO service_role;
