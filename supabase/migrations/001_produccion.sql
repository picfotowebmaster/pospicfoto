-- =============================================
-- MIGRACIÓN 001: Pipeline de Producción
-- =============================================

-- 1. Áreas de Producción (lookup table)
-- =============================================
CREATE TABLE production_areas (
  id     TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  color  TEXT DEFAULT 'bg-gray-500',
  orden  INT DEFAULT 0
);

INSERT INTO production_areas (id, nombre, color, orden) VALUES
  ('mostrador',  'Ventas / Mostrador',    'bg-yellow-500', 0),
  ('diseno',     'Diseño',                'bg-indigo-500', 1),
  ('impresion',  'Impresión',             'bg-blue-500',   2),
  ('laminado',   'Taller de Laminado',    'bg-teal-500',   3),
  ('montaje',    'Taller de Montaje',     'bg-emerald-500',4),
  ('books',      'Taller de Books',       'bg-violet-500', 4),
  ('bastidores', 'Taller de Bastidores',  'bg-rose-500',   4),
  ('marcos',     'Taller de Marcos',      'bg-amber-500',  1),
  ('listo',      'Listo para Entrega',    'bg-green-500',  99),
  ('entregado',  'Entregado',             'bg-gray-500',   100);

-- 2. Workflow Routes (DAG de transiciones)
-- =============================================
CREATE TABLE workflow_routes (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_area TEXT NOT NULL REFERENCES production_areas(id),
  to_area   TEXT NOT NULL REFERENCES production_areas(id),
  ruta      TEXT NOT NULL,
  multiple  BOOLEAN DEFAULT false,
  UNIQUE(from_area, to_area, ruta)
);

INSERT INTO workflow_routes (from_area, to_area, ruta, multiple) VALUES
  -- RUTA 1 (Flujo de Impresión)
  ('mostrador',  'diseno',     'R1', false),
  ('diseno',     'impresion',  'R1', false),
  ('impresion',  'laminado',   'R1', true),
  ('impresion',  'montaje',    'R1', true),
  ('impresion',  'books',      'R1', true),
  ('impresion',  'bastidores', 'R1', true),
  -- RUTA 2 (Flujo de Marcos)
  ('mostrador',  'marcos',     'R2', false),
  ('marcos',     'montaje',    'R2', false),
  -- RUTA 3 (Flujo Directo de Books)
  ('mostrador',  'books',      'R3', false),
  -- RUTA 4 (Flujo de Laminado)
  ('mostrador',  'laminado',   'R4', false),
  ('laminado',   'montaje',    'R4', false);

-- 3. Migrar tabla pedidos
-- =============================================
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS area_actual TEXT DEFAULT 'mostrador',
  ADD COLUMN IF NOT EXISTS ruta TEXT,
  ADD COLUMN IF NOT EXISTS area_destino TEXT;

-- 4. Bitácora de movimientos
-- =============================================
CREATE TABLE pedido_movimientos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id   UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  from_area   TEXT,
  to_area     TEXT NOT NULL,
  operador_id UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_movimientos_pedido ON pedido_movimientos(pedido_id);
