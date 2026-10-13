-- =============================================
-- MIGRACIÓN 035: Impresión en Canvas, Rollos de Laminado,
--                Adhesivos (con altas) e Impresiones (categoría nueva)
-- Regla: "exacto como la web".
-- =============================================

-- ---------- Atributos / valores nuevos ----------
INSERT INTO atributos (nombre) VALUES ('Papel'), ('Margen Blanco')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor FROM atributos a
JOIN (VALUES ('Lustre'), ('Metálico')) AS v(valor) ON true
WHERE a.nombre = 'Papel'
ON CONFLICT (atributo_id, valor) DO NOTHING;

INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor FROM atributos a
JOIN (VALUES ('No'), ('Si')) AS v(valor) ON true
WHERE a.nombre = 'Margen Blanco'
ON CONFLICT (atributo_id, valor) DO NOTHING;

INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor FROM atributos a
JOIN (VALUES ('25"x30m (63.5cmx30m)'), ('50"x30m (127cmx30m)'), ('25"x36m (63.5cmx36m)')) AS v(valor) ON true
WHERE a.nombre = 'Ancho de Rollo'
ON CONFLICT (atributo_id, valor) DO NOTHING;

-- ---------- Categoría nueva ----------
INSERT INTO categorias (nombre, orden) VALUES ('Impresiones', 10)
ON CONFLICT (nombre) DO NOTHING;

-- ---------- Altas de Adhesivos ----------
INSERT INTO productos (categoria_id, nombre, ruta, orden)
SELECT c.id, v.nombre, 'R4', v.orden FROM categorias c
JOIN (VALUES
  ('Adhesivo doble cara DIMASA', 2),
  ('Adhesivo Doble Cara Premium', 3),
  ('Caja con 250 hojas de Easy Sheet PVC foami de 1mm', 4),
  ('Caja con 500 hojas de Easy Sheet PVC foami de 1mm', 5),
  ('hoja de Easy Sheet PVC foami de 1mm', 6),
  ('Paquete 100 Pliegos Adhesivo Doble Cara Premium 21 x 25" (53,5 x 63,5 cm)', 7),
  ('Pliego Adhesivo Doble Cara Premium 21 x 25"(53,5 x 63,5cm)', 8)
) AS v(nombre, orden) ON true
WHERE c.nombre = 'Adhesivos'
ON CONFLICT (categoria_id, nombre) DO NOTHING;

-- ---------- Altas de Impresiones ----------
INSERT INTO productos (categoria_id, nombre, ruta, orden)
SELECT c.id, v.nombre, 'R1', v.orden FROM categorias c
JOIN (VALUES
  ('Impresión Fotográfica Digital', 0),
  ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA', 1),
  ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA CRISTAL', 2),
  ('IMPRESIÓN PAPEL METALICO CON TEXTURA', 3),
  ('IMPRESIÓN PAPEL METALICO CON TEXTURA CRISTAL', 4)
) AS v(nombre, orden) ON true
WHERE c.nombre = 'Impresiones'
ON CONFLICT (categoria_id, nombre) DO NOTHING;

-- ---------- Remapeo de atributos ----------
DELETE FROM producto_atributos
WHERE producto_id IN (
  SELECT p.id FROM productos p JOIN categorias c ON c.id = p.categoria_id
  WHERE c.nombre IN ('Impresión en Canvas', 'Rollos de Laminado Fotográfico', 'Adhesivos', 'Impresiones')
);

WITH map_producto_atributo(producto, atributo, orden) AS (
  VALUES
    ('Impresión en Canvas Polyester Mate', 'Impresión Tamaño', 0),
    ('Rollo de Laminado Fotográfico', 'Ancho de Rollo', 0),
    ('Rollo de Laminado Fotográfico', 'Textura', 1),
    ('Rollo de Laminado Cristal', 'Ancho de Rollo', 0),
    ('Rollo de Adhesivo Doble Cara', 'Ancho de Rollo', 0),
    ('Rollo de Adhesivo Doble Cara Óptico', 'Ancho de Rollo', 0),
    ('Adhesivo doble cara DIMASA', 'Largo de Rollo', 0),
    ('Adhesivo Doble Cara Premium', 'Largo de Rollo', 0),
    ('Caja con 250 hojas de Easy Sheet PVC foami de 1mm', 'Tamaño Easy Sheet', 0),
    ('Caja con 500 hojas de Easy Sheet PVC foami de 1mm', 'Tamaño Easy Sheet', 0),
    ('hoja de Easy Sheet PVC foami de 1mm', 'Tamaño Easy Sheet', 0),
    ('Impresión Fotográfica Digital', 'Impresión Tamaño', 0),
    ('Impresión Fotográfica Digital', 'Papel', 1),
    ('Impresión Fotográfica Digital', 'Margen Blanco', 2),
    ('Impresión Fotográfica Digital', 'Corrección de Color', 3),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA', 'Impresión Tamaño', 0),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA', 'Tipo de Impresión', 1),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA', 'Corrección de Color', 2),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA', 'Textura', 3),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA CRISTAL', 'Impresión Tamaño', 0),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA CRISTAL', 'Tipo de Impresión', 1),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA CRISTAL', 'Corrección de Color', 2),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA', 'Impresión Tamaño', 0),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA', 'Tipo de Impresión', 1),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA', 'Corrección de Color', 2),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA', 'Textura', 3),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA CRISTAL', 'Impresión Tamaño', 0),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA CRISTAL', 'Tipo de Impresión', 1),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA CRISTAL', 'Corrección de Color', 2)
)
INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, mpa.orden, true
FROM map_producto_atributo mpa
JOIN productos p ON p.nombre = mpa.producto
JOIN categorias c ON c.id = p.categoria_id
  AND c.nombre IN ('Impresión en Canvas', 'Rollos de Laminado Fotográfico', 'Adhesivos', 'Impresiones')
JOIN atributos a ON a.nombre = mpa.atributo
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden, requerido = EXCLUDED.requerido;

-- ---------- Valores por producto ----------
WITH sets(set_name, valores) AS (
  VALUES
    ('IT_CANVAS', ARRAY['8x10"','8x12"','8x20"','8.5x11"','10x10"','10x20"','10x22"','10x24"','11x14"','11x16"','11x17"','12x12"','12x16"','12x20"','12x24"','12x36"','16x16"','16x20"','16x24"','18.8x26.8"','20x20"','20x24"','20x28"','20x30"','20x32"','21.2x63.2"','24x24"','24x30"','24x36"','30x30"','30x40"']),
    ('TEXT_LAM', ARRAY['3D','Brillante','Canvas','Escarcha','Espuma Brillante','Granizo','Lino Fino','Manta Sueca','Mate','Nieve','Piel','Piel Brillante','Seda','Super Arena']),
    ('AR2450', ARRAY['25"x41m (63.5cmx41m)','50"x41m (127cmx41m)']),
    ('AR2530', ARRAY['25"x30m (63.5cmx30m)','50"x30m (127cmx30m)']),
    ('AROPT', ARRAY['25"x36m (63.5cmx36m)','36"x36m (91.44cmx36m)','42"x36m (106.68cmx36m)','50"x36m (127cmx36m)']),
    ('LRDIM', ARRAY['20"x50m (51cmx50m)','40"x50m (102cmx50m)']),
    ('LRPRE', ARRAY['25"x41m (63.5cmx41m)','50"x41m (127cmx41m)']),
    ('ES250', ARRAY['11x14" (28x35cm)','12x12" (30x30cm)','12x18" (30x46cm)','12x24" (30x60cm)']),
    ('ES500', ARRAY['10x10" (25x25cm)']),
    ('ESHOJA', ARRAY['10x10" (25x25cm)','11x14" (28x35cm)','12x12" (30x30cm)','12x18" (30x46cm)','12x24" (30x60cm)']),
    ('IT_DIGITAL', ARRAY['3.5x5"','4x6"','5x7"','6x6"','6x8"','6x8.5"','6x9"','6x12"','6x15"','8x8"','8x10"','8x12"','8x20"','8.5x11"','10x10"','10x20"','10x22"','10x24"','11x14"','11x16"','11x17"','12x12"','12x16"','12x20"','12x24"','12x36"','16x16"','16x20"','16x24"','18.8x26.8"','20x20"','20x24"','20x28"','20x30"','20x32"','21.2x63.2"','24x24"','24x30"','24x36"','30x30"','30x40"']),
    ('IT_LUSTRE', ARRAY['4x6"','5x7"','6x6"','6x8"','6x8.5"','6x9"','6x12"','6x15"','8x8"','8x10"','8x12"','8x20"','8.5x11"','10x10"','10x20"','10x22"','10x24"','11x14"','11x16"','11x17"','12x12"','12x16"','12x20"','12x24"','12x36"','16x16"','16x20"','16x24"','18.8x26.8"','20x20"','20x24"','20x28"','20x30"','20x32"','21.2x63.2"','24x24"','24x30"','24x36"','30x30"','30x40"']),
    ('IT_METAL', ARRAY['8x10"','8x12"','8x20"','8.5x11"','10x10"','10x20"','10x22"','10x24"','11x14"','11x16"','11x17"','12x12"','12x16"','12x20"','12x24"','12x36"','16x16"','16x20"','16x24"','18.8x26.8"','20x20"','20x24"','20x28"','20x30"','20x32"','21.2x63.2"','24x24"','24x30"','24x36"','30x30"','30x40"']),
    ('IT_METAL_CRISTAL', ARRAY['8x8"','8x10"','8x12"','8x20"','8.5x11"','10x10"','10x20"','10x22"','10x24"','11x14"','11x16"','11x17"','12x12"','12x16"','12x20"','12x24"','12x36"','16x16"','16x20"','16x24"','18.8x26.8"','20x20"','20x24"','20x28"','20x30"','20x32"','21.2x63.2"','24x24"','24x30"','24x36"','30x30"','30x40"']),
    ('TIPO_IMP', ARRAY['Impresión con Textura y Macocel','Impresión con Textura y Adhesivo','Impresión con Textura']),
    ('CORR', ARRAY['No','Si']),
    ('TEXT_IMP', ARRAY['3D','Brillante','Canvas','Escarcha','Espuma Brillante','Granizo','Lino Fino','Manta Sueca','Mate','Nieve','Piel','Seda','Super Arena'])
),
map_pa(producto, atributo, set_name) AS (
  VALUES
    ('Impresión en Canvas Polyester Mate', 'Impresión Tamaño', 'IT_CANVAS'),
    ('Rollo de Laminado Fotográfico', 'Ancho de Rollo', 'AR2450'),
    ('Rollo de Laminado Fotográfico', 'Textura', 'TEXT_LAM'),
    ('Rollo de Laminado Cristal', 'Ancho de Rollo', 'AR2530'),
    ('Rollo de Adhesivo Doble Cara', 'Ancho de Rollo', 'AR2450'),
    ('Rollo de Adhesivo Doble Cara Óptico', 'Ancho de Rollo', 'AROPT'),
    ('Adhesivo doble cara DIMASA', 'Largo de Rollo', 'LRDIM'),
    ('Adhesivo Doble Cara Premium', 'Largo de Rollo', 'LRPRE'),
    ('Caja con 250 hojas de Easy Sheet PVC foami de 1mm', 'Tamaño Easy Sheet', 'ES250'),
    ('Caja con 500 hojas de Easy Sheet PVC foami de 1mm', 'Tamaño Easy Sheet', 'ES500'),
    ('hoja de Easy Sheet PVC foami de 1mm', 'Tamaño Easy Sheet', 'ESHOJA'),
    ('Impresión Fotográfica Digital', 'Impresión Tamaño', 'IT_DIGITAL'),
    ('Impresión Fotográfica Digital', 'Papel', 'PAPEL'),
    ('Impresión Fotográfica Digital', 'Margen Blanco', 'SN'),
    ('Impresión Fotográfica Digital', 'Corrección de Color', 'CORR'),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA', 'Impresión Tamaño', 'IT_LUSTRE'),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA', 'Tipo de Impresión', 'TIPO_IMP'),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA', 'Corrección de Color', 'CORR'),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA', 'Textura', 'TEXT_IMP'),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA CRISTAL', 'Impresión Tamaño', 'IT_LUSTRE'),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA CRISTAL', 'Tipo de Impresión', 'TIPO_IMP'),
    ('IMPRESIÓN PAPEL LUSTRE CON TEXTURA CRISTAL', 'Corrección de Color', 'CORR'),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA', 'Impresión Tamaño', 'IT_METAL'),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA', 'Tipo de Impresión', 'TIPO_IMP'),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA', 'Corrección de Color', 'CORR'),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA', 'Textura', 'TEXT_IMP'),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA CRISTAL', 'Impresión Tamaño', 'IT_METAL_CRISTAL'),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA CRISTAL', 'Tipo de Impresión', 'TIPO_IMP'),
    ('IMPRESIÓN PAPEL METALICO CON TEXTURA CRISTAL', 'Corrección de Color', 'CORR')
),
sets2(set_name, valores) AS (
  VALUES
    ('PAPEL', ARRAY['Lustre','Metálico']),
    ('SN', ARRAY['No','Si'])
),
all_sets AS (
  SELECT set_name, valores FROM sets
  UNION ALL SELECT set_name, valores FROM sets2
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM map_pa mpa
JOIN productos p ON p.nombre = mpa.producto
JOIN categorias c ON c.id = p.categoria_id
  AND c.nombre IN ('Impresión en Canvas', 'Rollos de Laminado Fotográfico', 'Adhesivos', 'Impresiones')
JOIN producto_atributos pa ON pa.producto_id = p.id
JOIN atributos a ON a.id = pa.atributo_id AND a.nombre = mpa.atributo
JOIN all_sets s ON s.set_name = mpa.set_name
CROSS JOIN LATERAL unnest(s.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE SET orden = EXCLUDED.orden;
