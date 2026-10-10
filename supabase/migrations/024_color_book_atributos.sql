-- =============================================
-- MIGRACIÓN 024: Atributos de "Color Book Pasta Dura" (Mostrador)
-- Alinea el flujo de "Agregar Producto" con la tienda web:
--   Book Tamaño -> Hojas y Páginas -> Hoja Extra
--   -> Requiero Diseño -> Corrección de Color -> Pasta Color
-- =============================================

-- 1. Atributos nuevos
INSERT INTO atributos (nombre) VALUES
  ('Requiero Diseño'),
  ('Corrección de Color')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Valores No / Si para los atributos nuevos
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, t.v
FROM atributos a
JOIN (VALUES ('No'), ('Si')) AS t(v) ON true
WHERE a.nombre IN ('Requiero Diseño', 'Corrección de Color')
ON CONFLICT (atributo_id, valor) DO NOTHING;

-- 3. Remapear los atributos de "Color Book Pasta Dura" (Photo Books)
DELETE FROM producto_atributos
WHERE producto_id = (
  SELECT p.id FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
  WHERE p.nombre = 'Color Book Pasta Dura'
    AND c.nombre = 'Photo Books'
  LIMIT 1
);

INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, v.orden, true
FROM productos p
JOIN categorias c ON c.id = p.categoria_id AND c.nombre = 'Photo Books'
JOIN (VALUES
  ('Book Tamaño', 0),
  ('Hojas y Páginas', 1),
  ('Hoja Extra', 2),
  ('Requiero Diseño', 3),
  ('Corrección de Color', 4),
  ('Pasta Color', 5)
) AS v(atributo, orden) ON true
JOIN atributos a ON a.nombre = v.atributo
WHERE p.nombre = 'Color Book Pasta Dura';
