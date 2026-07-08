-- =============================================
-- 8. SUCURSALES Y MARCAS + NUMERO DE PEDIDO
-- =============================================

-- Tablas de catálogo
CREATE TABLE sucursales (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  TEXT NOT NULL,
  codigo  TEXT NOT NULL UNIQUE
);

CREATE TABLE marcas (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  TEXT NOT NULL,
  codigo  TEXT NOT NULL UNIQUE
);

-- Seed
INSERT INTO sucursales (nombre, codigo) VALUES ('Palma', 'PAL');
INSERT INTO sucursales (nombre, codigo) VALUES ('Cuba', 'CUB');
INSERT INTO marcas (nombre, codigo) VALUES ('Picfoto', 'PIC');
INSERT INTO marcas (nombre, codigo) VALUES ('Framex', 'FRX');

-- Secuencia global para número de pedido
CREATE SEQUENCE IF NOT EXISTS pedido_global_seq START 1;

-- Función generadora de número de pedido
CREATE OR REPLACE FUNCTION generar_numero_pedido(marca_codigo TEXT, sucursal_codigo TEXT)
RETURNS TEXT AS $$
  SELECT marca_codigo || '-' || sucursal_codigo || '-' || LPAD(nextval('pedido_global_seq')::TEXT, 5, '0');
$$ LANGUAGE SQL;

-- Nueva columna en profiles: sucursal del usuario
ALTER TABLE profiles ADD COLUMN sucursal_id UUID REFERENCES sucursales(id);

-- Nuevas columnas en pedidos
ALTER TABLE pedidos ADD COLUMN numero_pedido TEXT UNIQUE;
ALTER TABLE pedidos ADD COLUMN sucursal_id UUID REFERENCES sucursales(id);
ALTER TABLE pedidos ADD COLUMN marca_id UUID REFERENCES marcas(id);

-- Backfill de pedidos existentes (asignar Picfoto + Palma por defecto)
DO $$
DECLARE
  pal_id UUID; pic_id UUID; p RECORD; seq INT := 0;
BEGIN
  SELECT id INTO pal_id FROM sucursales WHERE codigo = 'PAL';
  SELECT id INTO pic_id FROM marcas WHERE codigo = 'PIC';
  FOR p IN SELECT id FROM pedidos WHERE numero_pedido IS NULL ORDER BY created_at LOOP
    seq := seq + 1;
    UPDATE pedidos SET
      sucursal_id = pal_id, marca_id = pic_id,
      numero_pedido = 'PIC-PAL-' || LPAD(seq::TEXT, 5, '0')
    WHERE id = p.id;
  END LOOP;
  PERFORM setval('pedido_global_seq', seq);
END $$;

-- Index para búsqueda por número de pedido
CREATE INDEX idx_pedidos_numero ON pedidos (numero_pedido);

-- RLS para nuevas tablas
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sucursales legibles por autenticados" ON sucursales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Marcas legibles por autenticados" ON marcas
  FOR SELECT TO authenticated USING (true);
