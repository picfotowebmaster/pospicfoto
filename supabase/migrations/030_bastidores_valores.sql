-- =============================================
-- MIGRACIÓN 030: Valores de "Foto Bastidor" + limpieza
-- Regla: "exacto como la web".
-- =============================================

DELETE FROM producto_atributo_valores pav
USING producto_atributos pa, productos p, categorias c
WHERE pav.producto_atributo_id = pa.id
  AND pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND c.nombre = 'Bastidores';

WITH sets(set_name, valores) AS (
  VALUES
    ('IT_FB', ARRAY['4x6"', '5x7"', '6x6"', '6x8"', '6x8.5"', '6x9"', '6x12"', '6x15"', '6x18"', '8x8"', '8x10"', '8x12"', '8x20"', '8.5x11"', '10x10"', '10x20"', '10x22"', '10x24"', '11x14"', '11x16"', '11x17"', '12x12"', '12x16"', '12x20"', '12x24"', '12x36"', '16x16"', '16x20"', '16x24"', '18.8x26.8"', '20x20"', '20x24"', '20x28"', '20x30"', '20x32"', '21.2x63.2"', '24x24"', '24x30"', '24x36"']),
    ('TEXTURA_FB', ARRAY['Manta Sueca']),
    ('SN', ARRAY['No', 'Si'])
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM producto_atributos pa
JOIN productos p ON p.id = pa.producto_id
JOIN categorias c ON c.id = p.categoria_id AND c.nombre = 'Bastidores' AND p.nombre = 'Foto Bastidor'
JOIN atributos a ON a.id = pa.atributo_id
JOIN (VALUES
  ('Impresión Tamaño', 'IT_FB'),
  ('Textura', 'TEXTURA_FB'),
  ('Corrección de Color', 'SN')
) AS mpa(atributo, set_name) ON mpa.atributo = a.nombre
JOIN sets s ON s.set_name = mpa.set_name
CROSS JOIN LATERAL unnest(s.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE SET orden = EXCLUDED.orden;

-- Atributos que quedaron sin uso
UPDATE atributos SET activo = false
WHERE nombre IN ('Tipo de Bastidor', 'Tipo de Corte');
