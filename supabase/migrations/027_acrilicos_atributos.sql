-- =============================================
-- MIGRACIÓN 027: Atributos de Acrílicos según la web
-- Regla: "exacto como la web".
--   - Renombra etiquetas para igualar la web:
--       "Color de Marco" -> "Color marco"
--       "Marco Espejo"   -> "Marco"
--   - Crea el atributo "Grosor".
--   - Remapea los 7 Acrílicos (quita Tamaño de Marco y Tipo de Bastidor).
-- =============================================

-- 1. Renombres de etiquetas (solo afectan a Acrílicos / atributo huérfano)
UPDATE atributos SET nombre = 'Color marco' WHERE nombre = 'Color de Marco';
UPDATE atributos SET nombre = 'Marco' WHERE nombre = 'Marco Espejo';

-- 2. Atributo "Grosor" + valores
INSERT INTO atributos (nombre) VALUES ('Grosor')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor
FROM atributos a
JOIN (VALUES ('2mm')) AS v(valor) ON true
WHERE a.nombre = 'Grosor'
ON CONFLICT (atributo_id, valor) DO NOTHING;

-- 3. Valores de "Color marco" que la web trae y no existían
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor
FROM atributos a
JOIN (VALUES ('Chocolate Cobrizo'), ('Oro Betas Rojas'), ('Plata Rayada')) AS v(valor) ON true
WHERE a.nombre = 'Color marco'
ON CONFLICT (atributo_id, valor) DO NOTHING;

-- 4. Remapear los Acrílicos
DELETE FROM producto_atributos
WHERE producto_id IN (
  SELECT p.id FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
  WHERE c.nombre = 'Acrílicos'
);

WITH map_productos(producto, atributo, orden) AS (
  VALUES
    ('Acrílico con Bastidor y Chapetones', 'Impresión Tamaño', 0),
    ('Acrílico con Bastidor y Chapetones', 'Grosor', 1),
    ('Acrílico con Bastidor y Chapetones', 'Filo de Bastidor', 2),

    ('Acrílico con Caja', 'Impresión Tamaño', 0),
    ('Acrílico con Caja', 'Grosor', 1),
    ('Acrílico con Caja', 'Marco', 2),

    ('Acrílico con Marco y Chapetones', 'Impresión Tamaño', 0),
    ('Acrílico con Marco y Chapetones', 'Grosor', 1),
    ('Acrílico con Marco y Chapetones', 'Color marco', 2),

    ('Acrílico Flotado', 'Impresión Tamaño', 0),
    ('Acrílico Flotado', 'Grosor', 1),

    ('Acrílico Flotado con Marco', 'Impresión Tamaño', 0),
    ('Acrílico Flotado con Marco', 'Color marco', 1),

    ('FlexiGlass Flotado', 'Impresión Tamaño', 0),
    ('FlexiGlass Flotado', 'Grosor', 1),
    ('FlexiGlass Flotado', 'Corrección de Color', 2),

    ('Portarretrato de Acrílico con Chapetones', 'Impresión Tamaño', 0),
    ('Portarretrato de Acrílico con Chapetones', 'Color marco', 1)
)
INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, mp.orden, true
FROM map_productos mp
JOIN categorias c ON c.nombre = 'Acrílicos'
JOIN productos p ON p.nombre = mp.producto AND p.categoria_id = c.id
JOIN atributos a ON a.nombre = mp.atributo
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden, requerido = EXCLUDED.requerido;
