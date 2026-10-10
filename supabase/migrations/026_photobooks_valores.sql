-- =============================================
-- MIGRACIÓN 026: Valores exactos por producto (Photo Books)
-- Regla: "exacto como la web".
-- Crea producto_atributo_valores y carga, por producto/atributo, la lista
-- de valores y su orden tal como aparecen en el selector de la tienda.
-- =============================================

-- 1. Tabla de valores por producto-atributo
CREATE TABLE IF NOT EXISTS producto_atributo_valores (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_atributo_id UUID NOT NULL REFERENCES producto_atributos(id) ON DELETE CASCADE,
  valor_id             UUID NOT NULL REFERENCES atributo_valores(id) ON DELETE CASCADE,
  orden                INT DEFAULT 0,
  UNIQUE (producto_atributo_id, valor_id)
);

CREATE INDEX IF NOT EXISTS idx_pav_producto_atributo ON producto_atributo_valores(producto_atributo_id);
CREATE INDEX IF NOT EXISTS idx_pav_valor ON producto_atributo_valores(valor_id);

ALTER TABLE producto_atributo_valores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PAV legibles por autenticados" ON producto_atributo_valores;
CREATE POLICY "PAV legibles por autenticados" ON producto_atributo_valores
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.producto_atributo_valores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_atributo_valores TO service_role;

-- 2. Valores de Book Tamaño que la web usa en algunos productos y no existían
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor
FROM atributos a
JOIN (VALUES ('8.5x11"'), ('11x8.5"')) AS v(valor) ON true
WHERE a.nombre = 'Book Tamaño'
ON CONFLICT (atributo_id, valor) DO NOTHING;

-- 3. Reasignar valores de Photo Books
DELETE FROM producto_atributo_valores pav
USING producto_atributos pa, productos p, categorias c
WHERE pav.producto_atributo_id = pa.id
  AND pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND c.nombre = 'Photo Books';

WITH map_producto_atributo(producto, atributo, set_name) AS (
  VALUES
    ('Color Book Pasta Dura', 'Book Tamaño', 'BT_STD'),
    ('Color Book Pasta Dura', 'Hojas y Páginas', 'HP_3'),
    ('Color Book Pasta Dura', 'Hoja Extra', 'HE_5'),
    ('Color Book Pasta Dura', 'Requiero Diseño', 'SN'),
    ('Color Book Pasta Dura', 'Corrección de Color', 'SN'),
    ('Color Book Pasta Dura', 'Pasta Color', 'PC_15'),

    ('Pasta Acolchada', 'Book Tamaño', 'BT_STD'),
    ('Pasta Acolchada', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Acolchada', 'Hoja Extra', 'HE_5'),
    ('Pasta Acolchada', 'Requiero Diseño', 'SN'),
    ('Pasta Acolchada', 'Corrección de Color', 'SN'),
    ('Pasta Acolchada', 'Color Vinipiel', 'VIN_A'),

    ('Pasta Acrílico de 2mm', 'Book Tamaño', 'BT_PLAIN'),
    ('Pasta Acrílico de 2mm', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Acrílico de 2mm', 'Hoja Extra', 'HE_5'),
    ('Pasta Acrílico de 2mm', 'Requiero Diseño', 'SN'),
    ('Pasta Acrílico de 2mm', 'Corrección de Color', 'SN'),
    ('Pasta Acrílico de 2mm', 'Color Vinipiel', 'VIN_A'),

    ('Pasta Foto Laminada con Vinipiel', 'Book Tamaño', 'BT_STD'),
    ('Pasta Foto Laminada con Vinipiel', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Foto Laminada con Vinipiel', 'Hoja Extra', 'HE_5'),
    ('Pasta Foto Laminada con Vinipiel', 'Requiero Diseño', 'SN'),
    ('Pasta Foto Laminada con Vinipiel', 'Corrección de Color', 'SN'),
    ('Pasta Foto Laminada con Vinipiel', 'Color Vinipiel', 'VIN_A'),

    ('Pasta Vinipiel con Relieve', 'Book Tamaño', 'BT_STD'),
    ('Pasta Vinipiel con Relieve', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Vinipiel con Relieve', 'Hoja Extra', 'HE_5'),
    ('Pasta Vinipiel con Relieve', 'Requiero Diseño', 'SN'),
    ('Pasta Vinipiel con Relieve', 'Corrección de Color', 'SN'),
    ('Pasta Vinipiel con Relieve', 'Color Vinipiel', 'VIN_B'),

    ('Pasta Vinipiel Foto-Ventana con Relieve', 'Book Tamaño', 'BT_STD'),
    ('Pasta Vinipiel Foto-Ventana con Relieve', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Vinipiel Foto-Ventana con Relieve', 'Hoja Extra', 'HE_5'),
    ('Pasta Vinipiel Foto-Ventana con Relieve', 'Requiero Diseño', 'SN'),
    ('Pasta Vinipiel Foto-Ventana con Relieve', 'Corrección de Color', 'SN'),
    ('Pasta Vinipiel Foto-Ventana con Relieve', 'Color Vinipiel', 'VIN_B'),

    ('Pasta Dura', 'Book Tamaño', 'BT_STD'),
    ('Pasta Dura', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Dura', 'Hoja Extra', 'HE_5'),
    ('Pasta Dura', 'Requiero Diseño', 'SN'),
    ('Pasta Dura', 'Corrección de Color', 'SN'),

    ('Pasta Dura con Caja Deslizable', 'Book Tamaño', 'BT_STD'),
    ('Pasta Dura con Caja Deslizable', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Dura con Caja Deslizable', 'Hoja Extra', 'HE_5'),
    ('Pasta Dura con Caja Deslizable', 'Requiero Diseño', 'SN'),
    ('Pasta Dura con Caja Deslizable', 'Corrección de Color', 'SN'),

    ('Pasta Sencilla', 'Book Tamaño', 'BT_PLAIN'),
    ('Pasta Sencilla', 'Hojas y Páginas', 'HP_1'),
    ('Pasta Sencilla', 'Requiero Diseño', 'SN'),
    ('Pasta Sencilla', 'Corrección de Color', 'SN')
),
sets(set_name, valores) AS (
  VALUES
    ('BT_STD', ARRAY['8x10"', '8.5x11" Horizontal', '11x8.5" Vertical', '10x10"', '12x12"', '11x14" Horizontal', '14x11" Vertical']),
    ('BT_PLAIN', ARRAY['8x10"', '8.5x11"', '11x8.5"', '10x10"', '12x12"', '11x14" Horizontal', '14x11" Vertical']),
    ('HP_3', ARRAY['10 Hojas 20 Páginas', '15 Hojas 30 Páginas', '20 Hojas 40 Páginas']),
    ('HP_1', ARRAY['10 Hojas 20 Páginas']),
    ('HE_5', ARRAY['Ninguna', '1 Hoja', '2 Hojas', '3 Hojas', '4 Hojas']),
    ('SN', ARRAY['No', 'Si']),
    ('PC_15', ARRAY['Amarillo', 'Azul Cielo', 'Azul Marino', 'Blanco', 'Chocolate', 'Crema', 'Gris', 'Lila', 'Negro', 'Pistache', 'Rojo', 'Rosa Pastel', 'Uva', 'Verde', 'Vino']),
    ('VIN_A', ARRAY['Acuático', 'Azul Rey', 'Banana', 'Ferrero', 'Fucsia', 'Ladrillo', 'Leche', 'Marrón', 'Negro Arroyo', 'Oxford', 'Palomitas', 'Peach', 'Pétalo', 'Pinot', 'Rojo Labial', 'Silken', 'Silver', 'Testa', 'Topo', 'Yellow', 'Azul Marino', 'Beige', 'Chocolate', 'Gris', 'Negro', 'Tabaco']),
    ('VIN_B', ARRAY['Acuático', 'Azul Rey', 'Banana', 'Ferrero', 'Fucsia', 'Ladrillo', 'Leche', 'Marrón', 'Oxford', 'Palomitas', 'Peach', 'Pétalo', 'Pinot', 'Rojo Labial', 'Silken', 'Silver', 'Testa', 'Topo', 'Yellow', 'Azul Marino', 'Beige', 'Chocolate', 'Gris', 'Negro', 'Tabaco'])
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM map_producto_atributo mpa
JOIN categorias c ON c.nombre = 'Photo Books'
JOIN productos p ON p.nombre = mpa.producto AND p.categoria_id = c.id
JOIN producto_atributos pa ON pa.producto_id = p.id
JOIN atributos a ON a.id = pa.atributo_id AND a.nombre = mpa.atributo
JOIN sets s ON s.set_name = mpa.set_name
CROSS JOIN LATERAL unnest(s.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE SET orden = EXCLUDED.orden;
