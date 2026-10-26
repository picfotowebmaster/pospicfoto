-- =============================================
-- MIGRACIÓN 038: Catálogo de Photo Books alineado con la web
--   - Agrega los 3 productos que faltaban.
--   - Configura sus atributos y valores.
--   - Marca los atributos que determinan el precio.
--   - No carga precios: se importan desde /admin/precios.
-- =============================================

-- 1. Productos faltantes
INSERT INTO productos (categoria_id, nombre, ruta, orden, activo)
SELECT c.id, v.nombre, 'R3', v.orden, true
FROM categorias c
CROSS JOIN (
  VALUES
    ('Pasta Vinipiel Liso', 9),
    ('Pasta Vinipiel Foto-Ventana Liso', 10),
    ('Photo Book Pasta en Acrílico de 6mm', 11)
) AS v(nombre, orden)
WHERE c.nombre = 'Photo Books'
  AND NOT EXISTS (
    SELECT 1
    FROM productos p
    WHERE p.categoria_id = c.id
      AND p.nombre = v.nombre
  );

-- 2. Atributos por producto
WITH map_productos(producto, perfil) AS (
  VALUES
    ('Pasta Vinipiel Liso', 'B'),
    ('Pasta Vinipiel Foto-Ventana Liso', 'B'),
    ('Photo Book Pasta en Acrílico de 6mm', 'E')
),
map_atributos(perfil, atributo, orden, afecta_precio) AS (
  VALUES
    ('B', 'Book Tamaño', 0, true),
    ('B', 'Hojas y Páginas', 1, true),
    ('B', 'Hoja Extra', 2, true),
    ('B', 'Requiero Diseño', 3, true),
    ('B', 'Corrección de Color', 4, false),
    ('B', 'Color Vinipiel', 5, false),
    ('E', 'Book Tamaño', 0, true),
    ('E', 'Hojas y Páginas', 1, true),
    ('E', 'Hoja Extra', 2, true),
    ('E', 'Requiero Diseño', 3, true),
    ('E', 'Corrección de Color', 4, false),
    ('E', 'Color Vinipiel', 5, false)
)
INSERT INTO producto_atributos
  (producto_id, atributo_id, orden, requerido, afecta_precio)
SELECT p.id, a.id, ma.orden, true, ma.afecta_precio
FROM map_productos mp
JOIN categorias c ON c.nombre = 'Photo Books'
JOIN productos p ON p.nombre = mp.producto AND p.categoria_id = c.id
JOIN map_atributos ma ON ma.perfil = mp.perfil
JOIN atributos a ON a.nombre = ma.atributo
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden,
      requerido = EXCLUDED.requerido,
      afecta_precio = EXCLUDED.afecta_precio;

-- 3. Valores por producto-atributo
WITH map_producto_atributo(producto, atributo, set_name) AS (
  VALUES
    ('Pasta Vinipiel Liso', 'Book Tamaño', 'BT_STD'),
    ('Pasta Vinipiel Liso', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Vinipiel Liso', 'Hoja Extra', 'HE_5'),
    ('Pasta Vinipiel Liso', 'Requiero Diseño', 'SN'),
    ('Pasta Vinipiel Liso', 'Corrección de Color', 'SN'),
    ('Pasta Vinipiel Liso', 'Color Vinipiel', 'VIN_WEB'),

    ('Pasta Vinipiel Foto-Ventana Liso', 'Book Tamaño', 'BT_STD'),
    ('Pasta Vinipiel Foto-Ventana Liso', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Vinipiel Foto-Ventana Liso', 'Hoja Extra', 'HE_5'),
    ('Pasta Vinipiel Foto-Ventana Liso', 'Requiero Diseño', 'SN'),
    ('Pasta Vinipiel Foto-Ventana Liso', 'Corrección de Color', 'SN'),
    ('Pasta Vinipiel Foto-Ventana Liso', 'Color Vinipiel', 'VIN_WEB'),

    ('Photo Book Pasta en Acrílico de 6mm', 'Book Tamaño', 'BT_ACR6'),
    ('Photo Book Pasta en Acrílico de 6mm', 'Hojas y Páginas', 'HP_3'),
    ('Photo Book Pasta en Acrílico de 6mm', 'Hoja Extra', 'HE_5'),
    ('Photo Book Pasta en Acrílico de 6mm', 'Requiero Diseño', 'SN'),
    ('Photo Book Pasta en Acrílico de 6mm', 'Corrección de Color', 'SN'),
    ('Photo Book Pasta en Acrílico de 6mm', 'Color Vinipiel', 'VIN_NEGRO')
),
sets(set_name, valores) AS (
  VALUES
    ('BT_STD', ARRAY['8x10"', '8.5x11" Horizontal', '11x8.5" Vertical', '10x10"', '12x12"', '11x14" Horizontal', '14x11" Vertical']),
    ('BT_ACR6', ARRAY['10x10"', '12x12"', '14x11" Vertical']),
    ('HP_3', ARRAY['10 Hojas 20 Páginas', '15 Hojas 30 Páginas', '20 Hojas 40 Páginas']),
    ('HE_5', ARRAY['Ninguna', '1 Hoja', '2 Hojas', '3 Hojas', '4 Hojas']),
    ('SN', ARRAY['No', 'Si']),
    ('VIN_WEB', ARRAY['Acuático', 'Azul Marino', 'Azul Rey', 'Banana', 'Beige', 'Chocolate', 'Ferrero', 'Fucsia', 'Gris', 'Ladrillo', 'Leche', 'Marrón', 'Negro', 'Negro Arroyo', 'Oxford', 'Palomitas', 'Peach', 'Pétalo', 'Pinot', 'Rojo Labial', 'Silken', 'Silver', 'Tabaco', 'Testa', 'Topo', 'Yellow']),
    ('VIN_NEGRO', ARRAY['Negro'])
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
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE
  SET orden = EXCLUDED.orden;

-- 4. Atributos de precio para todos los Photo Books
UPDATE producto_atributos pa
SET afecta_precio = (
  a.nombre IN ('Book Tamaño', 'Hojas y Páginas', 'Hoja Extra', 'Requiero Diseño')
)
FROM productos p, categorias c, atributos a
WHERE pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND pa.atributo_id = a.id
  AND c.nombre = 'Photo Books';
