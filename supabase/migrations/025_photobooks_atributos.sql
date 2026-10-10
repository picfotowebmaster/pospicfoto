-- =============================================
-- MIGRACIÓN 025: Atributos de Photo Books según la web
-- Regla: "exacto como la web".
--   - Quita "Filo de Bastidor" de todos los Photo Books.
--   - "Pasta Color" solo en Color Book Pasta Dura.
--   - "Color Vinipiel" solo en los productos Vinipiel/Acolchada/Acrílico.
--   - Agrega "Hojas y Páginas", "Requiero Diseño", "Corrección de Color".
--   - Pasta Sencilla no lleva "Hoja Extra" ni color.
-- =============================================

-- 1. Quitar el mapeo actual de todos los productos de Photo Books
DELETE FROM producto_atributos
WHERE producto_id IN (
  SELECT p.id FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
  WHERE c.nombre = 'Photo Books'
);

-- 2. Reinsertar según perfil
WITH map_productos(producto, perfil) AS (
  VALUES
    ('Color Book Pasta Dura', 'A'),
    ('Pasta Acolchada', 'B'),
    ('Pasta Acrílico de 2mm', 'B'),
    ('Pasta Foto Laminada con Vinipiel', 'B'),
    ('Pasta Vinipiel con Relieve', 'B'),
    ('Pasta Vinipiel Foto-Ventana con Relieve', 'B'),
    ('Pasta Dura', 'C'),
    ('Pasta Dura con Caja Deslizable', 'C'),
    ('Pasta Sencilla', 'D')
),
map_atributos(perfil, atributo, orden) AS (
  VALUES
    ('A', 'Book Tamaño', 0),
    ('A', 'Hojas y Páginas', 1),
    ('A', 'Hoja Extra', 2),
    ('A', 'Requiero Diseño', 3),
    ('A', 'Corrección de Color', 4),
    ('A', 'Pasta Color', 5),
    ('B', 'Book Tamaño', 0),
    ('B', 'Hojas y Páginas', 1),
    ('B', 'Hoja Extra', 2),
    ('B', 'Requiero Diseño', 3),
    ('B', 'Corrección de Color', 4),
    ('B', 'Color Vinipiel', 5),
    ('C', 'Book Tamaño', 0),
    ('C', 'Hojas y Páginas', 1),
    ('C', 'Hoja Extra', 2),
    ('C', 'Requiero Diseño', 3),
    ('C', 'Corrección de Color', 4),
    ('D', 'Book Tamaño', 0),
    ('D', 'Hojas y Páginas', 1),
    ('D', 'Requiero Diseño', 2),
    ('D', 'Corrección de Color', 3)
)
INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, ma.orden, true
FROM map_productos mp
JOIN categorias c ON c.nombre = 'Photo Books'
JOIN productos p ON p.nombre = mp.producto AND p.categoria_id = c.id
JOIN map_atributos ma ON ma.perfil = mp.perfil
JOIN atributos a ON a.nombre = ma.atributo
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden, requerido = EXCLUDED.requerido;
