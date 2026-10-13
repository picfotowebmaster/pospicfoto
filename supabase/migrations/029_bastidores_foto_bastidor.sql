-- =============================================
-- MIGRACIÓN 029: Atributos de "Foto Bastidor" (Bastidores) según la web
-- Regla: "exacto como la web".
--   - Quita "Tipo de Bastidor" y "Tipo de Corte".
--   - Usa "Impresión Tamaño", "Textura" y "Corrección de Color".
-- =============================================

DELETE FROM producto_atributos
WHERE producto_id IN (
  SELECT p.id FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
  WHERE c.nombre = 'Bastidores'
);

INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, mp.orden, true
FROM (VALUES
  ('Impresión Tamaño', 0),
  ('Textura', 1),
  ('Corrección de Color', 2)
) AS mp(atributo, orden)
JOIN categorias c ON c.nombre = 'Bastidores'
JOIN productos p ON p.nombre = 'Foto Bastidor' AND p.categoria_id = c.id
JOIN atributos a ON a.nombre = mp.atributo
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden, requerido = EXCLUDED.requerido;
