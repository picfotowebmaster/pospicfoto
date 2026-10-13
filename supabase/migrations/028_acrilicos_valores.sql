-- =============================================
-- MIGRACIÓN 028: Valores exactos por producto (Acrílicos)
-- Regla: "exacto como la web".
-- Usa la tabla producto_atributo_valores.
-- =============================================

DELETE FROM producto_atributo_valores pav
USING producto_atributos pa, productos p, categorias c
WHERE pav.producto_atributo_id = pa.id
  AND pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND c.nombre = 'Acrílicos';

WITH map_producto_atributo(producto, atributo, set_name) AS (
  VALUES
    ('Acrílico con Bastidor y Chapetones', 'Impresión Tamaño', 'IT_CB'),
    ('Acrílico con Bastidor y Chapetones', 'Grosor', 'GROSOR'),
    ('Acrílico con Bastidor y Chapetones', 'Filo de Bastidor', 'FILO'),
    ('Acrílico con Caja', 'Impresión Tamaño', 'IT_40'),
    ('Acrílico con Caja', 'Grosor', 'GROSOR'),
    ('Acrílico con Caja', 'Marco', 'MARCO'),
    ('Acrílico con Marco y Chapetones', 'Impresión Tamaño', 'IT_MARCO'),
    ('Acrílico con Marco y Chapetones', 'Grosor', 'GROSOR'),
    ('Acrílico con Marco y Chapetones', 'Color marco', 'COLOR_MARCO'),
    ('Acrílico Flotado', 'Impresión Tamaño', 'IT_40'),
    ('Acrílico Flotado', 'Grosor', 'GROSOR'),
    ('Acrílico Flotado con Marco', 'Impresión Tamaño', 'IT_FLOTMARCO'),
    ('Acrílico Flotado con Marco', 'Color marco', 'COLOR_MARCO'),
    ('FlexiGlass Flotado', 'Impresión Tamaño', 'IT_40'),
    ('FlexiGlass Flotado', 'Grosor', 'GROSOR'),
    ('FlexiGlass Flotado', 'Corrección de Color', 'SN'),
    ('Portarretrato de Acrílico con Chapetones', 'Impresión Tamaño', 'IT_PORTA'),
    ('Portarretrato de Acrílico con Chapetones', 'Color marco', 'COLOR_MARCO')
),
sets(set_name, valores) AS (
  VALUES
    ('IT_CB', ARRAY['6x6"', '6x8"', '6x8.5"', '6x9"', '6x12"', '6x15"', '8x8"', '8x10"', '8x12"', '8x20"', '8.5x11"', '10x10"', '10x20"', '10x22"', '10x24"', '11x14"', '11x16"', '11x17"', '12x12"', '12x16"', '12x20"', '12x24"', '12x36"', '16x16"', '16x20"', '16x24"', '18.8x26.8"', '20x20"', '20x24"', '20x28"', '20x30"', '20x32"', '21.2x63.2"', '24x24"', '24x30"', '24x36"', '30x30"', '30x40"']),
    ('IT_40', ARRAY['4x6"', '5x7"', '6x6"', '6x8"', '6x8.5"', '6x9"', '6x12"', '6x15"', '8x8"', '8x10"', '8x12"', '8x20"', '8.5x11"', '10x10"', '10x20"', '10x22"', '10x24"', '11x14"', '11x16"', '11x17"', '12x12"', '12x16"', '12x20"', '12x24"', '12x36"', '16x16"', '16x20"', '16x24"', '18.8x26.8"', '20x20"', '20x24"', '20x28"', '20x30"', '20x32"', '21.2x63.2"', '24x24"', '24x30"', '24x36"', '30x30"', '30x40"']),
    ('IT_MARCO', ARRAY['8x12"', '8x20"', '8.5x11"', '10x10"', '10x20"', '10x22"', '10x24"', '11x14"', '11x16"', '11x17"', '12x12"', '12x16"', '12x20"', '12x24"', '12x36"', '16x16"', '16x20"', '16x24"', '18.8x26.8"', '20x20"', '20x24"', '20x28"', '20x30"', '20x32"', '21.2x63.2"', '24x24"', '24x30"', '24x36"', '30x30"', '30x40"']),
    ('IT_FLOTMARCO', ARRAY['8x10"', '8x12"', '8x20"', '8.5x11"', '10x10"', '10x20"', '10x22"', '10x24"', '11x14"', '11x16"', '11x17"', '12x12"', '12x16"', '12x20"', '12x24"', '12x36"', '16x16"', '16x20"', '16x24"', '18.8x26.8"', '20x20"', '20x24"', '20x28"', '20x30"', '20x32"', '21.2x63.2"', '24x24"', '24x30"', '24x36"', '30x30"', '30x40"']),
    ('IT_PORTA', ARRAY['5x7"', '6x8"', '8x10"']),
    ('GROSOR', ARRAY['2mm']),
    ('FILO', ARRAY['Amarillo', 'Azul Cielo', 'Azul Marino', 'Blanco', 'Chocolate', 'Ladrillo', 'Lila', 'Naranja', 'Negro', 'Olivo', 'Rosa', 'Rosa Pastel', 'Uva', 'Vino']),
    ('MARCO', ARRAY['Azul', 'Azul Cielo', 'Azul Metálico', 'Bizantino', 'Blanco', 'Hueso', 'Magnolia', 'Rojo', 'Rojo Metálico', 'Rosa']),
    ('COLOR_MARCO', ARRAY['Chocolate Cobrizo', 'Titanio', 'Magnolia', 'Marrón', 'Negro', 'Nogal', 'Oro', 'Oro Betas Rojas', 'Plata Espejo', 'Plata Mate', 'Plata Rayada', 'Vino']),
    ('SN', ARRAY['No', 'Si'])
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM map_producto_atributo mpa
JOIN categorias c ON c.nombre = 'Acrílicos'
JOIN productos p ON p.nombre = mpa.producto AND p.categoria_id = c.id
JOIN producto_atributos pa ON pa.producto_id = p.id
JOIN atributos a ON a.id = pa.atributo_id AND a.nombre = mpa.atributo
JOIN sets s ON s.set_name = mpa.set_name
CROSS JOIN LATERAL unnest(s.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE SET orden = EXCLUDED.orden;
