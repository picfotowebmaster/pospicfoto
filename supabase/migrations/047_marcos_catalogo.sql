-- =============================================
-- MIGRACIÓN 047: Catálogo de Marcos
--   - Crea la categoría Marcos y 4 molduras.
--   - Crea el atributo Tamaño de Marco.
--   - El precio depende solo del tamaño; el color no afecta.
--   - Los precios se importan desde /admin/precios.
-- =============================================

-- 1. Categoría
INSERT INTO categorias (nombre, orden, activo)
SELECT 'Marcos', 11, true
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Marcos');

-- 2. Atributo Tamaño de Marco
INSERT INTO atributos (nombre, activo)
SELECT 'Tamaño de Marco', true
WHERE NOT EXISTS (SELECT 1 FROM atributos WHERE nombre = 'Tamaño de Marco');

-- 3. Valores de Tamaño de Marco
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor
FROM atributos a
CROSS JOIN (VALUES
  ('8x10"'),
  ('8.5x11"'),
  ('11x14"'),
  ('11x16"'),
  ('16x20"'),
  ('16x24"'),
  ('20x24"'),
  ('20x30"'),
  ('24x30"'),
  ('24x36"'),
  ('30x40"')
) AS v(valor)
WHERE a.nombre = 'Tamaño de Marco'
  AND NOT EXISTS (
    SELECT 1 FROM atributo_valores av
    WHERE av.atributo_id = a.id AND av.valor = v.valor
  );

-- 4. Productos
INSERT INTO productos (categoria_id, nombre, ruta, orden, activo)
SELECT c.id, v.nombre, 'R2', v.orden, true
FROM categorias c
CROSS JOIN (VALUES
  ('Moldura 004', 0),
  ('Moldura 011', 1),
  ('Moldura 020', 2),
  ('Moldura 033', 3)
) AS v(nombre, orden)
WHERE c.nombre = 'Marcos'
  AND NOT EXISTS (
    SELECT 1 FROM productos p
    WHERE p.categoria_id = c.id AND p.nombre = v.nombre
  );

-- 5. Atributos por producto
WITH map_productos(producto, atributo, orden, afecta_precio) AS (
  VALUES
    ('Moldura 004', 'Tamaño de Marco', 0, true),
    ('Moldura 004', 'Color marco', 1, false),
    ('Moldura 011', 'Tamaño de Marco', 0, true),
    ('Moldura 011', 'Color marco', 1, false),
    ('Moldura 020', 'Tamaño de Marco', 0, true),
    ('Moldura 020', 'Color marco', 1, false),
    ('Moldura 033', 'Tamaño de Marco', 0, true),
    ('Moldura 033', 'Color marco', 1, false)
)
INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido, afecta_precio)
SELECT p.id, a.id, m.orden, true, m.afecta_precio
FROM map_productos m
JOIN categorias c ON c.nombre = 'Marcos'
JOIN productos p ON p.nombre = m.producto AND p.categoria_id = c.id
JOIN atributos a ON a.nombre = m.atributo
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden,
      requerido = true,
      afecta_precio = EXCLUDED.afecta_precio;

-- 6. Valores por producto
WITH map_producto_atributo(producto, atributo, set_name) AS (
  VALUES
    ('Moldura 004', 'Tamaño de Marco', 'SIZES_MARCO'),
    ('Moldura 004', 'Color marco', 'COLOR_004'),
    ('Moldura 011', 'Tamaño de Marco', 'SIZES_MARCO'),
    ('Moldura 011', 'Color marco', 'COLOR_011'),
    ('Moldura 020', 'Tamaño de Marco', 'SIZES_MARCO'),
    ('Moldura 020', 'Color marco', 'COLOR_020'),
    ('Moldura 033', 'Tamaño de Marco', 'SIZES_MARCO'),
    ('Moldura 033', 'Color marco', 'COLOR_033')
),
sets(set_name, valores) AS (
  VALUES
    ('SIZES_MARCO', ARRAY['8x10"', '8.5x11"', '11x14"', '11x16"', '16x20"', '16x24"', '20x24"', '20x30"', '24x30"', '24x36"', '30x40"']),
    ('COLOR_004', ARRAY['Azul Aluminio', 'Azul Holograma', 'Azul Metálico', 'Azul Rey', 'Blanco Mate', 'Blanco Vintage', 'Chocolate', 'Chocolate Cobrizado', 'Chocolate Obscuro', 'Espejo', 'Fucsia', 'Magnolia', 'Marrón', 'Negro', 'Negro Rayado', 'Nogal', 'Oro', 'Oro Negro', 'Oro Vetas Rojas', 'Plata Aluminio', 'Plata Brillante', 'Plata Mate', 'Plata Vetas Oro', 'Rosa Holograma', 'Rosa Pastel Mate', 'Titanio', 'Vino', 'Vino Esfumado']),
    ('COLOR_011', ARRAY['Azul Aluminio', 'Azul Cielo', 'Azul Metálico', 'Azul Holograma', 'Blanco', 'Caoba Filo Oro', 'Caoba Filo Plata', 'Chocolate', 'Chocolate Cobrizado', 'Chocolate Cobrizado Filo Oro', 'Chocolate Cobrizado Filo Plata', 'Chocolate Filo Oro', 'Chocolate Filo Plata', 'Chocolate Obscuro', 'Chocolate Obscuro Filo Oro', 'Chocolate Obscuro Filo Plata', 'Magnolia', 'Marrón', 'Negro', 'Negro Filo Oro', 'Negro Filo Plata', 'Negro Rayado', 'Nogal', 'Oro', 'Oro Metálico', 'Oro Vetas Rojas', 'Plata Brillante', 'Plata Espejo', 'Plata Mate', 'Plata Vetas Oro', 'Rojo Metálico', 'Rosa Holograma', 'Rosa Mexicano', 'Rosa Pastel', 'Titanio', 'Turquesa Metálico', 'Uva', 'Vino', 'Vino Esfumado', 'Walnut Filo Oro', 'Walnut Filo Plata']),
    ('COLOR_020', ARRAY['Blanco Brillante', 'Chocolate', 'Chocolate Cobrizado', 'Chocolate Obscuro', 'Magnolia', 'Marrón', 'Negra', 'Negra Rayada', 'Nogal', 'Oro', 'Oro Metálico', 'Oro Vetas Rojas', 'Plata Brillante', 'Plata Espejo', 'Plata Mate', 'Plata Vetas Oro', 'Titanio', 'Vino', 'Vino Esfumado']),
    ('COLOR_033', ARRAY['Chocolate Cobrizo Perla Oro', 'Chocolate Cobrizo Perla Plata', 'Chocolate Obscuro Perla Oro', 'Chocolate Obscuro Perla Plata', 'Chocolate Perla Oro', 'Chocolate Perla Plata', 'Magnolia Perla Oro', 'Magnolia Perla Plata', 'Marrón Perla Oro', 'Marrón Perla Plata', 'Negro Perla Oro', 'Negro Perla Plata', 'Nogal Perla Oro', 'Nogal Perla Plata', 'Vino Esfumado Perla Oro', 'Vino Esfumado Perla Plata', 'Vino Perla Oro', 'Vino Perla Plata'])
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM map_producto_atributo mpa
JOIN categorias c ON c.nombre = 'Marcos'
JOIN productos p ON p.nombre = mpa.producto AND p.categoria_id = c.id
JOIN producto_atributos pa ON pa.producto_id = p.id
JOIN atributos a ON a.id = pa.atributo_id AND a.nombre = mpa.atributo
JOIN sets s ON s.set_name = mpa.set_name
CROSS JOIN LATERAL unnest(s.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE
  SET orden = EXCLUDED.orden;
