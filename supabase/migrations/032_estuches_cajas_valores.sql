-- =============================================
-- MIGRACIÓN 032: Valores por producto (Estuches y Cajas)
-- Regla: "exacto como la web".
-- =============================================

DELETE FROM producto_atributo_valores pav
USING producto_atributos pa, productos p, categorias c
WHERE pav.producto_atributo_id = pa.id
  AND pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND c.nombre = 'Estuches y Cajas';

WITH map_producto_atributo(producto, atributo, set_name) AS (
  VALUES
    ('Caja para Book Acolchada', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para Book Acolchada', 'Color Vinipiel', 'CV_26'),
    ('Caja para Book con Bastidor Inglés de 2.5mm', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para Book con Bastidor Inglés de 2.5mm', 'Color Vinipiel', 'CV_26'),
    ('Caja para Book con Ventana de Acrílico', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para Book con Ventana de Acrílico', 'Color Vinipiel', 'CV_26'),
    ('Caja para PhotoBook Color Liso', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para PhotoBook Color Liso', 'Color Vinipiel', 'CV_26'),
    ('Caja para Book Foto Laminada', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para Book Foto Laminada', 'Color Vinipiel', 'CV_NEGRO'),
    ('Caja para Book Lisa', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para Book Lisa', 'Color Vinipiel', 'CV_NEGRO'),
    ('Caja para PhotoBook de Vinipiel con ranura USB', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para PhotoBook de Vinipiel con ranura USB', 'Color Vinipiel', 'CV_NEGRO'),
    ('Caja Personalizada para Book', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja Personalizada para Book', 'Color Vinipiel', 'CV_NEGRO'),
    ('Estuche para USB y DVD', 'Color Vinipiel', 'CV_26')
),
sets(set_name, valores) AS (
  VALUES
    ('CAJA_TAMANO', ARRAY['8x8"', '8x10"', '10x10"', '12x12"', '11x14"']),
    ('CV_NEGRO', ARRAY['Negro']),
    ('CV_26', ARRAY['Acuático', 'Azul Rey', 'Banana', 'Ferrero', 'Fucsia', 'Ladrillo', 'Leche', 'Marrón', 'Negro Arroyo', 'Oxford', 'Palomitas', 'Peach', 'Pétalo', 'Pinot', 'Rojo Labial', 'Silken', 'Silver', 'Testa', 'Topo', 'Yellow', 'Azul Marino', 'Beige', 'Chocolate', 'Gris', 'Negro', 'Tabaco'])
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM map_producto_atributo mpa
JOIN categorias c ON c.nombre = 'Estuches y Cajas'
JOIN productos p ON p.nombre = mpa.producto AND p.categoria_id = c.id
JOIN producto_atributos pa ON pa.producto_id = p.id
JOIN atributos a ON a.id = pa.atributo_id AND a.nombre = mpa.atributo
JOIN sets s ON s.set_name = mpa.set_name
CROSS JOIN LATERAL unnest(s.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE SET orden = EXCLUDED.orden;
