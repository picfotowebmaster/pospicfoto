-- =============================================
-- MIGRACIÓN 034: Categoría "Foto Cristal" + producto "Cristal Con Caja"
-- Regla: "exacto como la web".
--   Atributos: Grosor (3mm), Marco (10), Impresión Tamaño (8x10", 16x20", 20x24")
-- =============================================

-- 1. Categoría
INSERT INTO categorias (nombre, orden) VALUES ('Foto Cristal', 9)
ON CONFLICT (nombre) DO NOTHING;

-- 2. Valor de Grosor que usa este producto
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, '3mm' FROM atributos a WHERE a.nombre = 'Grosor'
ON CONFLICT (atributo_id, valor) DO NOTHING;

-- 3. Producto
INSERT INTO productos (categoria_id, nombre, ruta, orden)
SELECT c.id, 'Cristal Con Caja', 'R2', 0
FROM categorias c WHERE c.nombre = 'Foto Cristal'
ON CONFLICT (categoria_id, nombre) DO NOTHING;

-- 4. Atributos del producto
INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, mp.orden, true
FROM (VALUES
  ('Grosor', 0),
  ('Marco', 1),
  ('Impresión Tamaño', 2)
) AS mp(atributo, orden)
JOIN categorias c ON c.nombre = 'Foto Cristal'
JOIN productos p ON p.nombre = 'Cristal Con Caja' AND p.categoria_id = c.id
JOIN atributos a ON a.nombre = mp.atributo
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden, requerido = EXCLUDED.requerido;

-- 5. Valores por producto
WITH sets(set_name, valores) AS (
  VALUES
    ('GROSOR_3', ARRAY['3mm']),
    ('MARCO', ARRAY['Azul', 'Azul Cielo', 'Azul Metálico', 'Bizantino', 'Blanco', 'Hueso', 'Magnolia', 'Rojo', 'Rojo Metálico', 'Rosa']),
    ('IT_CRISTAL', ARRAY['8x10"', '16x20"', '20x24"'])
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM producto_atributos pa
JOIN productos p ON p.id = pa.producto_id
JOIN categorias c ON c.id = p.categoria_id AND c.nombre = 'Foto Cristal' AND p.nombre = 'Cristal Con Caja'
JOIN atributos a ON a.id = pa.atributo_id
JOIN (VALUES
  ('Grosor', 'GROSOR_3'),
  ('Marco', 'MARCO'),
  ('Impresión Tamaño', 'IT_CRISTAL')
) AS mpa(atributo, set_name) ON mpa.atributo = a.nombre
JOIN sets s ON s.set_name = mpa.set_name
CROSS JOIN LATERAL unnest(s.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE SET orden = EXCLUDED.orden;
