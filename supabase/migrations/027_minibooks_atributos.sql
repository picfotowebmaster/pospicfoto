-- =============================================
-- MIGRACIÓN 027: Atributos de Mini Books según la web
-- Regla: "exacto como la web".
--   - Quita "Filo de Bastidor" y "Pasta Color" de todos los Mini Books.
--   - "Color Vinipiel" solo en Acolchada, Acrílico de 2mm y Vinipiel.
--   - Agrega "Hojas y Páginas", "Requiero Diseño" y "Corrección de Color".
--   - Pasta Sencilla no lleva "Hoja Extra" ni color.
-- =============================================

-- 1. Quitar el mapeo actual de todos los productos de Mini Books
DELETE FROM producto_atributos
WHERE producto_id IN (
  SELECT p.id FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
  WHERE c.nombre = 'Mini Books'
);

-- 2. Reinsertar según perfil
WITH map_productos(producto, perfil) AS (
  VALUES
    ('Pasta Acolchada', 'B'),
    ('Pasta de Acrílico de 2mm', 'B'),
    ('Pasta Vinipiel', 'B'),
    ('Pasta Dura', 'C'),
    ('Pasta Dura con Caja Deslizable', 'C'),
    ('Pasta Sencilla', 'D')
),
map_atributos(perfil, atributo, orden) AS (
  VALUES
    ('B', 'Mini Book Tamaño', 0),
    ('B', 'Hojas y Páginas', 1),
    ('B', 'Hoja Extra', 2),
    ('B', 'Requiero Diseño', 3),
    ('B', 'Corrección de Color', 4),
    ('B', 'Color Vinipiel', 5),
    ('C', 'Mini Book Tamaño', 0),
    ('C', 'Hojas y Páginas', 1),
    ('C', 'Hoja Extra', 2),
    ('C', 'Requiero Diseño', 3),
    ('C', 'Corrección de Color', 4),
    ('D', 'Mini Book Tamaño', 0),
    ('D', 'Hojas y Páginas', 1),
    ('D', 'Requiero Diseño', 2),
    ('D', 'Corrección de Color', 3)
)
INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, ma.orden, true
FROM map_productos mp
JOIN categorias c ON c.nombre = 'Mini Books'
JOIN productos p ON p.nombre = mp.producto AND p.categoria_id = c.id
JOIN map_atributos ma ON ma.perfil = mp.perfil
JOIN atributos a ON a.nombre = ma.atributo
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden, requerido = EXCLUDED.requerido;
