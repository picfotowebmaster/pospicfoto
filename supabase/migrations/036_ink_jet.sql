-- =============================================
-- MIGRACIÓN 036: Ink Jet / Papeles y Materiales (exacto como la web)
--   - Divide "Pearlite Satin / Silky" en 2 y "Rollos de Tela Canvas" en 2.
--   - Agrega "Rollo de Papel Fotográfico Silky".
--   - 12 productos idénticos a la web.
-- =============================================

-- Atributos / valores nuevos
INSERT INTO atributos (nombre) VALUES ('Tipo de papel Ink Jet'), ('Papel Tamaño')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor FROM atributos a
JOIN (VALUES ('Glossy'), ('Satin/Lustre')) AS v(valor) ON true
WHERE a.nombre = 'Tipo de papel Ink Jet'
ON CONFLICT (atributo_id, valor) DO NOTHING;

INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor FROM atributos a
JOIN (VALUES ('4x6" (10x15cm)'), ('5x7" (12.7x17.7cm)'), ('6x8" (15.2x20.3cm)'), ('8.5x11" (21.5x28cm)')) AS v(valor) ON true
WHERE a.nombre = 'Papel Tamaño'
ON CONFLICT (atributo_id, valor) DO NOTHING;

-- Renombres (conservan el id/producto)
UPDATE productos SET nombre = 'Rollo de Papel Fotográfico Pearlite Satin 24"x30m (60.96cmx30m)', orden = 5
WHERE nombre = 'Rollo de Papel Fotográfico Pearlite Satin / Silky'
  AND categoria_id = (SELECT id FROM categorias WHERE nombre = 'Ink Jet / Papeles y Materiales');

UPDATE productos SET nombre = 'Rollo de Tela Canvas Poliéster Mate', orden = 11
WHERE nombre = 'Rollos de Tela Canvas'
  AND categoria_id = (SELECT id FROM categorias WHERE nombre = 'Ink Jet / Papeles y Materiales');

-- Altas
INSERT INTO productos (categoria_id, nombre, ruta, orden)
SELECT c.id, v.nombre, 'R1', v.orden FROM categorias c
JOIN (VALUES
  ('Rollo de Papel Fotográfico Pearlite Silky 24"x30m (60.96cmx30m)', 6),
  ('Rollo de Papel Fotográfico Silky 24"x30m (60.96cmx30m)', 9),
  ('Rollo de Tela Canvas Poli-Algodón Mate', 10)
) AS v(nombre, orden) ON true
WHERE c.nombre = 'Ink Jet / Papeles y Materiales'
ON CONFLICT (categoria_id, nombre) DO NOTHING;

-- Orden
UPDATE productos p SET orden = v.orden
FROM (VALUES
  ('Pack hojas Papel InkJet', 0), ('Papel Ink Mate', 1), ('Papel InkJet Mate', 2),
  ('Papel InkJet Metallic Glossy', 3), ('Rollo de Papel Fotográfico Glossy Ink Jet', 4),
  ('Rollo de Papel Fotográfico Pearlite Satin 24"x30m (60.96cmx30m)', 5),
  ('Rollo de Papel Fotográfico Pearlite Silky 24"x30m (60.96cmx30m)', 6),
  ('Rollo de Papel Fotográfico Perla Ink Jet', 7), ('Rollo de Papel Fotográfico Satín/Lustre Ink Jet', 8),
  ('Rollo de Papel Fotográfico Silky 24"x30m (60.96cmx30m)', 9),
  ('Rollo de Tela Canvas Poli-Algodón Mate', 10), ('Rollo de Tela Canvas Poliéster Mate', 11)
) AS v(nombre, orden)
WHERE p.nombre = v.nombre
  AND p.categoria_id = (SELECT id FROM categorias WHERE nombre = 'Ink Jet / Papeles y Materiales');

-- Remapeo de atributos
DELETE FROM producto_atributos
WHERE producto_id IN (
  SELECT p.id FROM productos p JOIN categorias c ON c.id = p.categoria_id
  WHERE c.nombre = 'Ink Jet / Papeles y Materiales'
);

WITH map_producto_atributo(producto, atributo, orden) AS (
  VALUES
    ('Pack hojas Papel InkJet', 'Tipo de papel Ink Jet', 0),
    ('Pack hojas Papel InkJet', 'Papel Tamaño', 1),
    ('Pack hojas Papel InkJet', 'Cantidad de Hojas', 2),
    ('Papel Ink Mate', 'Papel Tamaño', 0),
    ('Papel Ink Mate', 'Cantidad de Hojas', 1),
    ('Papel InkJet Metallic Glossy', 'Ancho de Rollo', 0),
    ('Rollo de Papel Fotográfico Glossy Ink Jet', 'Ancho de Rollo', 0),
    ('Rollo de Papel Fotográfico Perla Ink Jet', 'Ancho de Rollo', 0),
    ('Rollo de Papel Fotográfico Satín/Lustre Ink Jet', 'Ancho de Rollo', 0),
    ('Rollo de Tela Canvas Poli-Algodón Mate', 'Ancho de Rollo', 0),
    ('Rollo de Tela Canvas Poliéster Mate', 'Ancho de Rollo', 0)
)
INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, mpa.orden, true
FROM map_producto_atributo mpa
JOIN productos p ON p.nombre = mpa.producto
JOIN categorias c ON c.id = p.categoria_id AND c.nombre = 'Ink Jet / Papeles y Materiales'
JOIN atributos a ON a.nombre = mpa.atributo
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden, requerido = EXCLUDED.requerido;

-- Valores por producto
WITH sets(set_name, valores) AS (
  VALUES
    ('TPAPEL', ARRAY['Glossy','Satin/Lustre']),
    ('PAPEL_TAM', ARRAY['4x6" (10x15cm)','5x7" (12.7x17.7cm)','6x8" (15.2x20.3cm)','8.5x11" (21.5x28cm)']),
    ('CANT', ARRAY['100 Hojas','20 Hojas']),
    ('AR2', ARRAY['24"x30m (60.96cmx30m)','44"x30m (111.76cmx30m)']),
    ('AR3', ARRAY['17"x30m (43.18cmx30m)','24"x30m (60.96cmx30m)','44"x30m (111.76cmx30m)']),
    ('AR18', ARRAY['24"x18m (60.96cmx18m)','36"x18m (91.44cmx18m)','44"x18m (111.76cmx18m)']),
    ('AR30', ARRAY['24"x30m (60.96cmx30m)','36"x30m (91.44cmx30m)','44"x30m (111.76cmx30m)'])
),
map_pa(producto, atributo, set_name) AS (
  VALUES
    ('Pack hojas Papel InkJet', 'Tipo de papel Ink Jet', 'TPAPEL'),
    ('Pack hojas Papel InkJet', 'Papel Tamaño', 'PAPEL_TAM'),
    ('Pack hojas Papel InkJet', 'Cantidad de Hojas', 'CANT'),
    ('Papel Ink Mate', 'Papel Tamaño', 'PAPEL_TAM'),
    ('Papel Ink Mate', 'Cantidad de Hojas', 'CANT'),
    ('Papel InkJet Metallic Glossy', 'Ancho de Rollo', 'AR2'),
    ('Rollo de Papel Fotográfico Glossy Ink Jet', 'Ancho de Rollo', 'AR2'),
    ('Rollo de Papel Fotográfico Perla Ink Jet', 'Ancho de Rollo', 'AR2'),
    ('Rollo de Papel Fotográfico Satín/Lustre Ink Jet', 'Ancho de Rollo', 'AR3'),
    ('Rollo de Tela Canvas Poli-Algodón Mate', 'Ancho de Rollo', 'AR18'),
    ('Rollo de Tela Canvas Poliéster Mate', 'Ancho de Rollo', 'AR30')
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM map_pa mpa
JOIN productos p ON p.nombre = mpa.producto
JOIN categorias c ON c.id = p.categoria_id AND c.nombre = 'Ink Jet / Papeles y Materiales'
JOIN producto_atributos pa ON pa.producto_id = p.id
JOIN atributos a ON a.id = pa.atributo_id AND a.nombre = mpa.atributo
JOIN sets s ON s.set_name = mpa.set_name
CROSS JOIN LATERAL unnest(s.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE SET orden = EXCLUDED.orden;
