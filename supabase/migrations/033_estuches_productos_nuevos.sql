-- =============================================
-- MIGRACIÓN 033: Alta de 5 productos de "Estuches y Cajas" (faltantes vs la web)
--   - Estuche Personalizado DVD (simple)
--   - Estuche Personalizado para Memoria USB (simple)
--   - Estuche Vinipiel con Personalizado para CD/DVD/Blu-Ray
--   - Estuche Vinipiel con Ventana para Memoria USB
--   - Estuche Vinipiel para Memoria USB
-- Regla: "exacto como la web". Los 3 variables usan solo Color Vinipiel.
-- =============================================

INSERT INTO productos (categoria_id, nombre, ruta, orden)
SELECT c.id, v.nombre, 'R3', v.orden
FROM categorias c
JOIN (VALUES
  ('Estuche Personalizado DVD', 9),
  ('Estuche Personalizado para Memoria USB', 10),
  ('Estuche Vinipiel con Personalizado para CD/DVD/Blu-Ray', 11),
  ('Estuche Vinipiel con Ventana para Memoria USB', 12),
  ('Estuche Vinipiel para Memoria USB', 13)
) AS v(nombre, orden) ON true
WHERE c.nombre = 'Estuches y Cajas'
ON CONFLICT (categoria_id, nombre) DO NOTHING;

INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, 0, true
FROM categorias c
JOIN productos p ON p.categoria_id = c.id AND p.nombre IN (
  'Estuche Vinipiel con Personalizado para CD/DVD/Blu-Ray',
  'Estuche Vinipiel con Ventana para Memoria USB',
  'Estuche Vinipiel para Memoria USB'
)
JOIN atributos a ON a.nombre = 'Color Vinipiel'
WHERE c.nombre = 'Estuches y Cajas'
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden, requerido = EXCLUDED.requerido;

WITH set_cv(valores) AS (
  VALUES (ARRAY['Acuático', 'Azul Rey', 'Banana', 'Ferrero', 'Fucsia', 'Ladrillo', 'Leche', 'Marrón', 'Negro Arroyo', 'Oxford', 'Palomitas', 'Peach', 'Pétalo', 'Pinot', 'Rojo Labial', 'Silken', 'Silver', 'Testa', 'Topo', 'Yellow', 'Azul Marino', 'Beige', 'Chocolate', 'Gris', 'Negro', 'Tabaco'])
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM producto_atributos pa
JOIN productos p ON p.id = pa.producto_id
JOIN categorias c ON c.id = p.categoria_id AND c.nombre = 'Estuches y Cajas'
JOIN atributos a ON a.id = pa.atributo_id AND a.nombre = 'Color Vinipiel'
JOIN set_cv ON true
CROSS JOIN LATERAL unnest(set_cv.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
WHERE p.nombre IN (
  'Estuche Vinipiel con Personalizado para CD/DVD/Blu-Ray',
  'Estuche Vinipiel con Ventana para Memoria USB',
  'Estuche Vinipiel para Memoria USB'
)
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE SET orden = EXCLUDED.orden;
