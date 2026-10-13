-- =============================================
-- MIGRACIÓN 028: Valores exactos por producto (Mini Books)
-- Regla: "exacto como la web".
-- Usa la tabla producto_atributo_valores (creada en 026).
-- =============================================

-- 1. Valores de Mini Book Tamaño que la web usa y no existían
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor
FROM atributos a
JOIN (VALUES ('6x8.5"'), ('8.5x6"')) AS v(valor) ON true
WHERE a.nombre = 'Mini Book Tamaño'
ON CONFLICT (atributo_id, valor) DO NOTHING;

-- 2. Reasignar valores de Mini Books
DELETE FROM producto_atributo_valores pav
USING producto_atributos pa, productos p, categorias c
WHERE pav.producto_atributo_id = pa.id
  AND pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND c.nombre = 'Mini Books';

WITH map_producto_atributo(producto, atributo, set_name) AS (
  VALUES
    ('Pasta Acolchada', 'Mini Book Tamaño', 'MBT_STD'),
    ('Pasta Acolchada', 'Hojas y Páginas', 'HP_MB'),
    ('Pasta Acolchada', 'Hoja Extra', 'HE_5'),
    ('Pasta Acolchada', 'Requiero Diseño', 'SN'),
    ('Pasta Acolchada', 'Corrección de Color', 'SN'),
    ('Pasta Acolchada', 'Color Vinipiel', 'VIN_A'),

    ('Pasta de Acrílico de 2mm', 'Mini Book Tamaño', 'MBT_PLAIN'),
    ('Pasta de Acrílico de 2mm', 'Hojas y Páginas', 'HP_MB'),
    ('Pasta de Acrílico de 2mm', 'Hoja Extra', 'HE_5'),
    ('Pasta de Acrílico de 2mm', 'Requiero Diseño', 'SN'),
    ('Pasta de Acrílico de 2mm', 'Corrección de Color', 'SN'),
    ('Pasta de Acrílico de 2mm', 'Color Vinipiel', 'VIN_A'),

    ('Pasta Vinipiel', 'Mini Book Tamaño', 'MBT_STD'),
    ('Pasta Vinipiel', 'Hojas y Páginas', 'HP_MB'),
    ('Pasta Vinipiel', 'Hoja Extra', 'HE_5'),
    ('Pasta Vinipiel', 'Requiero Diseño', 'SN'),
    ('Pasta Vinipiel', 'Corrección de Color', 'SN'),
    ('Pasta Vinipiel', 'Color Vinipiel', 'VIN_A'),

    ('Pasta Dura', 'Mini Book Tamaño', 'MBT_STD'),
    ('Pasta Dura', 'Hojas y Páginas', 'HP_MB'),
    ('Pasta Dura', 'Hoja Extra', 'HE_5'),
    ('Pasta Dura', 'Requiero Diseño', 'SN'),
    ('Pasta Dura', 'Corrección de Color', 'SN'),

    ('Pasta Dura con Caja Deslizable', 'Mini Book Tamaño', 'MBT_STD'),
    ('Pasta Dura con Caja Deslizable', 'Hojas y Páginas', 'HP_MB'),
    ('Pasta Dura con Caja Deslizable', 'Hoja Extra', 'HE_5'),
    ('Pasta Dura con Caja Deslizable', 'Requiero Diseño', 'SN'),
    ('Pasta Dura con Caja Deslizable', 'Corrección de Color', 'SN'),

    ('Pasta Sencilla', 'Mini Book Tamaño', 'MBT_SEN'),
    ('Pasta Sencilla', 'Hojas y Páginas', 'HP_MB1'),
    ('Pasta Sencilla', 'Requiero Diseño', 'SN'),
    ('Pasta Sencilla', 'Corrección de Color', 'SN')
),
sets(set_name, valores) AS (
  VALUES
    ('MBT_STD', ARRAY['6x6"', '6x8.5" Horizontal', '8.5x6" Vertical', '7x5"', '8x8"']),
    ('MBT_PLAIN', ARRAY['6x6"', '7x5"', '6x8.5"', '8.5x6"', '8x8"']),
    ('MBT_SEN', ARRAY['6x6"', '7x5"', '6x8.5"', '8.5x6"', '8x8"', '8x10"', '8.5x11"']),
    ('HP_MB', ARRAY['10 Hojas 20 Páginas', '15 Hojas 30 Páginas']),
    ('HP_MB1', ARRAY['10 Hojas 20 Páginas']),
    ('HE_5', ARRAY['Ninguna', '1 Hoja', '2 Hojas', '3 Hojas', '4 Hojas']),
    ('SN', ARRAY['No', 'Si']),
    ('VIN_A', ARRAY['Acuático', 'Azul Rey', 'Banana', 'Ferrero', 'Fucsia', 'Ladrillo', 'Leche', 'Marrón', 'Negro Arroyo', 'Oxford', 'Palomitas', 'Peach', 'Pétalo', 'Pinot', 'Rojo Labial', 'Silken', 'Silver', 'Testa', 'Topo', 'Yellow', 'Azul Marino', 'Beige', 'Chocolate', 'Gris', 'Negro', 'Tabaco'])
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM map_producto_atributo mpa
JOIN categorias c ON c.nombre = 'Mini Books'
JOIN productos p ON p.nombre = mpa.producto AND p.categoria_id = c.id
JOIN producto_atributos pa ON pa.producto_id = p.id
JOIN atributos a ON a.id = pa.atributo_id AND a.nombre = mpa.atributo
JOIN sets s ON s.set_name = mpa.set_name
CROSS JOIN LATERAL unnest(s.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE SET orden = EXCLUDED.orden;
