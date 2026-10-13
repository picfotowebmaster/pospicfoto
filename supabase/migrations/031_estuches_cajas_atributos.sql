-- =============================================
-- MIGRACIÓN 031: Atributos de Estuches y Cajas según la web
-- Regla: "exacto como la web".
--   - Quita "Book Tamaño" y "Pasta Color".
--   - Usa "Caja Tamaño" + "Color Vinipiel" (y solo Color Vinipiel en el estuche).
-- =============================================

DELETE FROM producto_atributos
WHERE producto_id IN (
  SELECT p.id FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
  WHERE c.nombre = 'Estuches y Cajas'
);

-- Productos con Caja Tamaño + Color Vinipiel
INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, mp.orden, true
FROM (VALUES
  ('Caja Tamaño', 0),
  ('Color Vinipiel', 1)
) AS mp(atributo, orden)
JOIN categorias c ON c.nombre = 'Estuches y Cajas'
JOIN productos p ON p.nombre IN (
  'Caja para Book Acolchada',
  'Caja para Book con Bastidor Inglés de 2.5mm',
  'Caja para Book con Ventana de Acrílico',
  'Caja para PhotoBook Color Liso',
  'Caja para Book Foto Laminada',
  'Caja para Book Lisa',
  'Caja para PhotoBook de Vinipiel con ranura USB',
  'Caja Personalizada para Book'
) AND p.categoria_id = c.id
JOIN atributos a ON a.nombre = mp.atributo
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden, requerido = EXCLUDED.requerido;

-- Estuche: solo Color Vinipiel
INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, 0, true
FROM categorias c
JOIN productos p ON p.nombre = 'Estuche para USB y DVD' AND p.categoria_id = c.id
JOIN atributos a ON a.nombre = 'Color Vinipiel'
WHERE c.nombre = 'Estuches y Cajas'
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden, requerido = EXCLUDED.requerido;
