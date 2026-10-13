-- =============================================
-- ATRIBUTOS
-- =============================================
INSERT INTO atributos (nombre) VALUES
  ('Ancho de Rollo'),
  ('Book Tamaño'),
  ('Caja Tamaño'),
  ('Cantidad de Hojas'),
  ('Color de Marco'),
  ('Color Vinipiel'),
  ('Filo de Bastidor'),
  ('Hoja Extra'),
  ('Hojas y Páginas'),
  ('Impresión Bastidor'),
  ('Impresión Tamaño'),
  ('Largo de Rollo'),
  ('Marco Espejo'),
  ('Mini Book Tamaño'),
  ('Pasta Color'),
  ('Tamaño Bastidor con Relieve'),
  ('Tamaño de Marco'),
  ('Tamaño Easy Sheet'),
  ('Tamaño Fotos'),
  ('Tamaños Foto Serie'),
  ('Textura'),
  ('Tipo de Bastidor'),
  ('Tipo de Corte'),
  ('Tipo de Impresión'),
  ('Requiero Diseño'),
  ('Corrección de Color');

-- =============================================
-- Ancho de Rollo
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('17"x30m (43.18cmx30m)'),
  ('24"x18m (60.96cmx18m)'),
  ('24"x30m (60.96cmx30m)'),
  ('25"x41m (63.5cmx41m)'),
  ('36"x18m (91.44cmx18m)'),
  ('36"x30m (91.44cmx30m)'),
  ('36"x36m (91.44cmx36m)'),
  ('42"x36m (106.68cmx36m)'),
  ('44"x18m (111.76cmx18m)'),
  ('44"x30m (111.76cmx30m)'),
  ('50"x36m (127cmx36m)'),
  ('50"x41m (127cmx41m)')
) AS t(v) WHERE a.nombre = 'Ancho de Rollo';

-- =============================================
-- Book Tamaño
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('6x8.5" Horizontal'),
  ('8.5x6" Vertical'),
  ('8x8"'),
  ('8x10"'),
  ('8.5x11" Horizontal'),
  ('11x8.5" Vertical'),
  ('10x10"'),
  ('12x12"'),
  ('11x14" Horizontal'),
  ('14x11" Vertical')
) AS t(v) WHERE a.nombre = 'Book Tamaño';

-- =============================================
-- Caja Tamaño
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('8x8"'),
  ('8x10"'),
  ('10x10"'),
  ('12x12"'),
  ('11x14"')
) AS t(v) WHERE a.nombre = 'Caja Tamaño';

-- =============================================
-- Cantidad de Hojas
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('200 Hojas'),
  ('100 Hojas'),
  ('20 Hojas')
) AS t(v) WHERE a.nombre = 'Cantidad de Hojas';

-- =============================================
-- Color de Marco
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Azul Aluminio'),
  ('Azul Cielo'),
  ('Azul Holograma'),
  ('Azul Rey'),
  ('Blanco'),
  ('Blanco Brillante'),
  ('Blanco Mate'),
  ('Blanco Vintage'),
  ('Caoba Filo Oro'),
  ('Caoba Filo Plata'),
  ('Chocolate Obscuro Filo Plata'),
  ('Chocolate'),
  ('Chocolate Cobrizado'),
  ('Chocolate Cobrizado Filo Oro'),
  ('Chocolate Cobrizado Filo Plata'),
  ('Chocolate Cobrizo Perla Oro'),
  ('Chocolate Cobrizo Perla Plata'),
  ('Chocolate Filo Oro'),
  ('Chocolate Filo Plata'),
  ('Chocolate Obscuro'),
  ('Chocolate Obscuro Filo Oro'),
  ('Chocolate Obscuro Perla Oro'),
  ('Chocolate Obscuro Perla Plata'),
  ('Chocolate Perla Oro'),
  ('Chocolate Perla Plata'),
  ('Espejo'),
  ('Fucsia'),
  ('Magnolia'),
  ('Magnolia Perla Oro'),
  ('Magnolia Perla Plata'),
  ('Negra'),
  ('Negra Rayada'),
  ('Negro'),
  ('Negro Filo Oro'),
  ('Negro Filo Plata'),
  ('Negro Perla Oro'),
  ('Negro Perla Plata'),
  ('Negro Rayado'),
  ('Nogal'),
  ('Nogal Filo Oro'),
  ('Nogal Filo Plata'),
  ('Nogal Perla Oro'),
  ('Nogal Perla Plata'),
  ('Oro'),
  ('Oro Negro'),
  ('Oro Vetas Rojas'),
  ('Plata Vetas Oro'),
  ('Plata Aluminio'),
  ('Plata Brillante'),
  ('Plata Espejo'),
  ('Plata Mate'),
  ('Rojo'),
  ('Rosa Holograma'),
  ('Rosa Mexicano'),
  ('Rosa Pastel'),
  ('Rosa Pastel Mate'),
  ('Titanio'),
  ('Uva'),
  ('Vino'),
  ('Vino Esfumado'),
  ('Vino Esfumado Perla Oro'),
  ('Vino Esfumado Perla Plata'),
  ('Vino Filo Oro'),
  ('Vino Filo Plata'),
  ('Vino Perla Oro'),
  ('Vino Perla Plata'),
  ('Walnut Filo Oro'),
  ('Walnut Filo Plata'),
  ('Azul Metálico'),
  ('Marrón'),
  ('Marrón Perla Plata'),
  ('Oro Metálico'),
  ('Rojo Metálico'),
  ('Turquesa Metálico'),
  ('Marrón Perla Oro')
) AS t(v) WHERE a.nombre = 'Color de Marco';

-- =============================================
-- Color Vinipiel
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Acuático'),
  ('Azul Rey'),
  ('Banana'),
  ('Ferrero'),
  ('Fucsia'),
  ('Ladrillo'),
  ('Leche'),
  ('Marrón'),
  ('Negro Arroyo'),
  ('Oxford'),
  ('Palomitas'),
  ('Peach'),
  ('Pétalo'),
  ('Pinot'),
  ('Rojo Labial'),
  ('Silken'),
  ('Silver'),
  ('Testa'),
  ('Topo'),
  ('Yellow'),
  ('Azul Marino'),
  ('Beige'),
  ('Chocolate'),
  ('Gris'),
  ('Negro'),
  ('Tabaco')
) AS t(v) WHERE a.nombre = 'Color Vinipiel';

-- =============================================
-- Filo de Bastidor
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Amarillo'),
  ('Azul Cielo'),
  ('Azul Marino'),
  ('Blanco'),
  ('Chocolate'),
  ('Ladrillo'),
  ('Lila'),
  ('Naranja'),
  ('Negro'),
  ('Olivo'),
  ('Rosa'),
  ('Rosa Pastel'),
  ('Uva'),
  ('Vino')
) AS t(v) WHERE a.nombre = 'Filo de Bastidor';

-- =============================================
-- Hoja Extra
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Ninguna'),
  ('1 Hoja'),
  ('2 Hojas'),
  ('3 Hojas'),
  ('4 Hojas')
) AS t(v) WHERE a.nombre = 'Hoja Extra';

-- =============================================
-- Hojas y Páginas
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('10 Hojas 20 Páginas'),
  ('15 Hojas 30 Páginas'),
  ('20 Hojas 40 Páginas')
) AS t(v) WHERE a.nombre = 'Hojas y Páginas';

-- =============================================
-- Impresión Bastidor
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('6x12" (3x4"/6x8")'),
  ('6x14" (3x4"/6x10")'),
  ('6x16" (3x4"/6x12")'),
  ('8x16" (4x6"/8x10")'),
  ('8x18" (4x6"/8x12")'),
  ('8x20" (4x6"/8x14")'),
  ('8x21" (4x6"/8x15")'),
  ('8x26" (4x6"/8x20")'),
  ('10x18" (5x7"/10x12")'),
  ('10x20" (8x10"/10x12")'),
  ('10x21" (5x7"/10x15")'),
  ('10x23" (8x10"/10x15")'),
  ('10x26" (5x7"/10x20")'),
  ('10x28" (8x10"/10x20")'),
  ('12x23" (6x8"/12x15")'),
  ('12x25" (10x12"/12x15")'),
  ('12x26" (6x8"/12x18")'),
  ('12x28" (6x8"/12x20")'),
  ('12x30" (6x8"/12x22")'),
  ('12x34" (6x8"/12x24")'),
  ('12x36" (6x8"/12x28")')
) AS t(v) WHERE a.nombre = 'Impresión Bastidor';

-- =============================================
-- Impresión Tamaño
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('5x5"'),
  ('3.5x5"'),
  ('4x6"'),
  ('5x7"'),
  ('6x6"'),
  ('6x8"'),
  ('6x8.5"'),
  ('6x9"'),
  ('6x12"'),
  ('6x14"'),
  ('6x15"'),
  ('6x16"'),
  ('6x18"'),
  ('8x8"'),
  ('8x10"'),
  ('8x12"'),
  ('8x16"'),
  ('8x18"'),
  ('8x20"'),
  ('8x21"'),
  ('8x24"'),
  ('8x26"'),
  ('8.5x11"'),
  ('10x10"'),
  ('10x18"'),
  ('10x20"'),
  ('10x21"'),
  ('10x22"'),
  ('10x23"'),
  ('10x24"'),
  ('10x26"'),
  ('10x28"'),
  ('10x30"'),
  ('11x14"'),
  ('11x16"'),
  ('11x17"'),
  ('12x12"'),
  ('12x16"'),
  ('12x20"'),
  ('12x23"'),
  ('12x24"'),
  ('12x25"'),
  ('12x26"'),
  ('12x28"'),
  ('12x30"'),
  ('12x34"'),
  ('12x36"'),
  ('16x16"'),
  ('16x20"'),
  ('16x24"'),
  ('18.8x26.8"'),
  ('20x20"'),
  ('20x24"'),
  ('20x28"'),
  ('20x30"'),
  ('20x32"'),
  ('20x50"'),
  ('21.2x63.2"'),
  ('24x24"'),
  ('24x30"'),
  ('24x36"'),
  ('30x30"'),
  ('30x40"'),
  ('40x55"')
) AS t(v) WHERE a.nombre = 'Impresión Tamaño';

-- =============================================
-- Largo de Rollo
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('20"x50m (51cmx50m)'),
  ('25"x41m (63.5cmx41m)'),
  ('40"x50m (102cmx50m)'),
  ('50"x41m (127cmx41m)')
) AS t(v) WHERE a.nombre = 'Largo de Rollo';

-- =============================================
-- Marco Espejo
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Azul'),
  ('Azul Cielo'),
  ('Azul Metálico'),
  ('Bizantino'),
  ('Blanco'),
  ('Hueso'),
  ('Magnolia'),
  ('Rojo'),
  ('Rojo Metálico'),
  ('Rosa')
) AS t(v) WHERE a.nombre = 'Marco Espejo';

-- =============================================
-- Mini Book Tamaño
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('6x6"'),
  ('6x8.5" Horizontal'),
  ('8.5x6" Vertical'),
  ('7x5"'),
  ('8x8"'),
  ('8x10"'),
  ('8.5x11"')
) AS t(v) WHERE a.nombre = 'Mini Book Tamaño';

-- =============================================
-- Pasta Color
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Amarillo'),
  ('Azul Cielo'),
  ('Azul Marino'),
  ('Blanco'),
  ('Chocolate'),
  ('Crema'),
  ('Gris'),
  ('Lila'),
  ('Negro'),
  ('Pistache'),
  ('Rojo'),
  ('Rosa Pastel'),
  ('Uva'),
  ('Verde'),
  ('Vino')
) AS t(v) WHERE a.nombre = 'Pasta Color';

-- =============================================
-- Tamaño Bastidor con Relieve
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('3x4"/6x8"'),
  ('3x4"/6x10"'),
  ('3x4"/6x12"'),
  ('4x6"/8x10"'),
  ('4x6"/8x12"'),
  ('4x6"/8x14"'),
  ('4x6"/8x15"'),
  ('4x6"/8x20"'),
  ('5x7"/10x12"'),
  ('5x7"/10x15"'),
  ('5x7"/10x20"'),
  ('6x8"/12x15"'),
  ('6x8"/12x18"'),
  ('6x8"/12x20"'),
  ('6x8"/12x22"'),
  ('6x8"/12x24"'),
  ('6x8"/12x28"')
) AS t(v) WHERE a.nombre = 'Tamaño Bastidor con Relieve';

-- =============================================
-- Tamaño de Marco
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('11x14"'),
  ('11x16"'),
  ('16x20"'),
  ('16x24"'),
  ('20x24"'),
  ('20x30"'),
  ('24x30"'),
  ('24x36"'),
  ('30x40"'),
  ('8.5x11"'),
  ('8x10"')
) AS t(v) WHERE a.nombre = 'Tamaño de Marco';

-- =============================================
-- Tamaño Easy Sheet
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('10x10" (25x25cm)'),
  ('11x14" (28x35cm)'),
  ('12x12" (30x30cm)'),
  ('12x18" (30x46cm)'),
  ('12x24" (30x60cm)')
) AS t(v) WHERE a.nombre = 'Tamaño Easy Sheet';

-- =============================================
-- Tamaño Fotos
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('4x6"/6x8"'),
  ('4x6"/6x10"'),
  ('4x6"/6x12"'),
  ('6x8"/8x10"'),
  ('6x8"/8x12"'),
  ('6x8"/8x14"'),
  ('6x8"/8x15"'),
  ('6x8"/8x20"'),
  ('8x10"/10x12"'),
  ('8x10"/10x15"'),
  ('8x10"/10x20"'),
  ('8x12"/12x18"'),
  ('8x12"/12x22"'),
  ('8x12"/12x28"'),
  ('10x12"/12x15"'),
  ('10x12"/12x18"'),
  ('10x12"/12x24"')
) AS t(v) WHERE a.nombre = 'Tamaño Fotos';

-- =============================================
-- Tamaños Foto Serie
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('4) 5x5"'),
  ('4) 5x7"'),
  ('4) 6x6"'),
  ('4) 6x8"'),
  ('4) 8x8"'),
  ('4) 8x10"'),
  ('4) 10x10"'),
  ('4) 12x12"')
) AS t(v) WHERE a.nombre = 'Tamaños Foto Serie';

-- =============================================
-- Textura
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('3D'),
  ('Arena Fina'),
  ('Brillante'),
  ('Canvas'),
  ('Cristal'),
  ('Escarcha'),
  ('Espuma Brillante'),
  ('Granizo'),
  ('Lino Fino'),
  ('Manta Sueca'),
  ('Mate'),
  ('Nieve'),
  ('Piel'),
  ('Piel Brillante'),
  ('Seda'),
  ('Super Arena')
) AS t(v) WHERE a.nombre = 'Textura';

-- =============================================
-- Tipo de Bastidor
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Lustre con Textura'),
  ('Lustre con Textura Cristal'),
  ('Metálico con Textura'),
  ('Metálico con Textura Cristal')
) AS t(v) WHERE a.nombre = 'Tipo de Bastidor';

-- =============================================
-- Tipo de Corte
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Corte 45'),
  ('Corte Recto')
) AS t(v) WHERE a.nombre = 'Tipo de Corte';

-- =============================================
-- Tipo de Impresión
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Solo Textura'),
  ('Solo Impresión'),
  ('Impresión con Textura y Macocel'),
  ('Impresión con Textura y Adhesivo'),
  ('Impresión con Macocel con Adhesivo'),
  ('Impresión con Textura'),
  ('Impresión con Adhesivo')
) AS t(v) WHERE a.nombre = 'Tipo de Impresión';

-- =============================================
-- Requiero Diseño
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('No'),
  ('Si')
) AS t(v) WHERE a.nombre = 'Requiero Diseño';

-- =============================================
-- Corrección de Color
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('No'),
  ('Si')
) AS t(v) WHERE a.nombre = 'Corrección de Color';

-- =============================================
-- CATEGORÍAS
-- =============================================
INSERT INTO categorias (nombre, orden) VALUES
  ('Photo Books', 0),
  ('Mini Books', 1),
  ('Acrílicos', 2),
  ('Estuches y Cajas', 3),
  ('Ink Jet / Papeles y Materiales', 4),
  ('Impresión en Canvas', 5),
  ('Bastidores', 6),
  ('Rollos de Laminado Fotográfico', 7),
  ('Adhesivos', 8)
ON CONFLICT (nombre) DO NOTHING;

-- =============================================
-- PRODUCTOS
-- =============================================
INSERT INTO productos (categoria_id, nombre, ruta, orden)
SELECT c.id, v.nombre, v.ruta, v.orden FROM (VALUES
  ('Acrílicos', 'Acrílico con Bastidor y Chapetones', 'R2', 0),
  ('Estuches y Cajas', 'Caja para Book Acolchada', 'R3', 0),
  ('Photo Books', 'Color Book Pasta Dura', 'R3', 0),
  ('Bastidores', 'Foto Bastidor', 'R1', 0),
  ('Impresión en Canvas', 'Impresión en Canvas Polyester Mate', 'R1', 0),
  ('Ink Jet / Papeles y Materiales', 'Pack hojas Papel InkJet', 'R1', 0),
  ('Mini Books', 'Pasta Acolchada', 'R3', 0),
  ('Adhesivos', 'Rollo de Adhesivo Doble Cara', 'R4', 0),
  ('Rollos de Laminado Fotográfico', 'Rollo de Laminado Cristal', 'R4', 0),
  ('Acrílicos', 'Acrílico con Caja', 'R2', 1),
  ('Estuches y Cajas', 'Caja para Book con Bastidor Inglés de 2.5mm', 'R3', 1),
  ('Ink Jet / Papeles y Materiales', 'Papel Ink Mate', 'R1', 1),
  ('Photo Books', 'Pasta Acolchada', 'R3', 1),
  ('Mini Books', 'Pasta de Acrílico de 2mm', 'R3', 1),
  ('Adhesivos', 'Rollo de Adhesivo Doble Cara Óptico', 'R4', 1),
  ('Rollos de Laminado Fotográfico', 'Rollo de Laminado Fotográfico', 'R4', 1),
  ('Acrílicos', 'Acrílico con Marco y Chapetones', 'R2', 2),
  ('Estuches y Cajas', 'Caja para Book con Ventana de Acrílico', 'R3', 2),
  ('Ink Jet / Papeles y Materiales', 'Papel InkJet Mate', 'R1', 2),
  ('Photo Books', 'Pasta Acrílico de 2mm', 'R3', 2),
  ('Mini Books', 'Pasta Dura', 'R3', 2),
  ('Acrílicos', 'Acrílico Flotado', 'R2', 3),
  ('Estuches y Cajas', 'Caja para Book Foto Laminada', 'R3', 3),
  ('Ink Jet / Papeles y Materiales', 'Papel InkJet Metallic Glossy', 'R1', 3),
  ('Photo Books', 'Pasta Dura', 'R3', 3),
  ('Mini Books', 'Pasta Dura con Caja Deslizable', 'R3', 3),
  ('Acrílicos', 'Acrílico Flotado con Marco', 'R2', 4),
  ('Estuches y Cajas', 'Caja para Book Lisa', 'R3', 4),
  ('Photo Books', 'Pasta Dura con Caja Deslizable', 'R3', 4),
  ('Mini Books', 'Pasta Sencilla', 'R3', 4),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Glossy Ink Jet', 'R1', 4),
  ('Estuches y Cajas', 'Caja para PhotoBook Color Liso', 'R3', 5),
  ('Acrílicos', 'FlexiGlass Flotado', 'R2', 5),
  ('Photo Books', 'Pasta Foto Laminada con Vinipiel', 'R3', 5),
  ('Mini Books', 'Pasta Vinipiel', 'R3', 5),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Pearlite Satin / Silky', 'R1', 5),
  ('Estuches y Cajas', 'Caja para PhotoBook de Vinipiel con ranura USB', 'R3', 6),
  ('Photo Books', 'Pasta Sencilla', 'R3', 6),
  ('Acrílicos', 'Portarretrato de Acrílico con Chapetones', 'R2', 6),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Perla Ink Jet', 'R1', 6),
  ('Estuches y Cajas', 'Caja Personalizada para Book', 'R3', 7),
  ('Photo Books', 'Pasta Vinipiel con Relieve', 'R3', 7),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Satín/Lustre Ink Jet', 'R1', 7),
  ('Estuches y Cajas', 'Estuche para USB y DVD', 'R3', 8),
  ('Photo Books', 'Pasta Vinipiel Foto-Ventana con Relieve', 'R3', 8),
  ('Ink Jet / Papeles y Materiales', 'Rollos de Tela Canvas', 'R1', 8)
) AS v(categoria, nombre, ruta, orden)
JOIN categorias c ON c.nombre = v.categoria
ON CONFLICT (categoria_id, nombre) DO NOTHING;

-- =============================================
-- PRODUCTO → ATRIBUTOS
-- =============================================
INSERT INTO producto_atributos (producto_id, atributo_id, orden)
SELECT p.id, a.id, v.orden FROM (VALUES
  ('Acrílicos', 'Acrílico con Bastidor y Chapetones', 'Tamaño de Marco', 0),
  ('Estuches y Cajas', 'Caja para Book con Bastidor Inglés de 2.5mm', 'Book Tamaño', 0),
  ('Bastidores', 'Foto Bastidor', 'Tipo de Bastidor', 0),
  ('Estuches y Cajas', 'Caja para Book con Ventana de Acrílico', 'Book Tamaño', 0),
  ('Photo Books', 'Color Book Pasta Dura', 'Book Tamaño', 0),
  ('Estuches y Cajas', 'Caja para Book Foto Laminada', 'Book Tamaño', 0),
  ('Photo Books', 'Pasta Foto Laminada con Vinipiel', 'Book Tamaño', 0),
  ('Estuches y Cajas', 'Caja para Book Lisa', 'Book Tamaño', 0),
  ('Estuches y Cajas', 'Caja para PhotoBook Color Liso', 'Book Tamaño', 0),
  ('Estuches y Cajas', 'Caja para PhotoBook de Vinipiel con ranura USB', 'Book Tamaño', 0),
  ('Estuches y Cajas', 'Caja Personalizada para Book', 'Book Tamaño', 0),
  ('Impresión en Canvas', 'Impresión en Canvas Polyester Mate', 'Ancho de Rollo', 0),
  ('Estuches y Cajas', 'Estuche para USB y DVD', 'Book Tamaño', 0),
  ('Photo Books', 'Pasta Sencilla', 'Book Tamaño', 0),
  ('Ink Jet / Papeles y Materiales', 'Pack hojas Papel InkJet', 'Ancho de Rollo', 0),
  ('Ink Jet / Papeles y Materiales', 'Papel Ink Mate', 'Ancho de Rollo', 0),
  ('Ink Jet / Papeles y Materiales', 'Papel InkJet Mate', 'Ancho de Rollo', 0),
  ('Ink Jet / Papeles y Materiales', 'Rollos de Tela Canvas', 'Ancho de Rollo', 0),
  ('Photo Books', 'Pasta Vinipiel con Relieve', 'Book Tamaño', 0),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Satín/Lustre Ink Jet', 'Ancho de Rollo', 0),
  ('Photo Books', 'Pasta Vinipiel Foto-Ventana con Relieve', 'Book Tamaño', 0),
  ('Adhesivos', 'Rollo de Adhesivo Doble Cara', 'Ancho de Rollo', 0),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Perla Ink Jet', 'Ancho de Rollo', 0),
  ('Mini Books', 'Pasta Acolchada', 'Mini Book Tamaño', 0),
  ('Photo Books', 'Pasta Acrílico de 2mm', 'Book Tamaño', 0),
  ('Mini Books', 'Pasta de Acrílico de 2mm', 'Mini Book Tamaño', 0),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Pearlite Satin / Silky', 'Ancho de Rollo', 0),
  ('Mini Books', 'Pasta Dura', 'Mini Book Tamaño', 0),
  ('Mini Books', 'Pasta Dura con Caja Deslizable', 'Mini Book Tamaño', 0),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Glossy Ink Jet', 'Ancho de Rollo', 0),
  ('Mini Books', 'Pasta Sencilla', 'Mini Book Tamaño', 0),
  ('Rollos de Laminado Fotográfico', 'Rollo de Laminado Fotográfico', 'Ancho de Rollo', 0),
  ('Mini Books', 'Pasta Vinipiel', 'Mini Book Tamaño', 0),
  ('Photo Books', 'Pasta Dura', 'Book Tamaño', 0),
  ('Ink Jet / Papeles y Materiales', 'Papel InkJet Metallic Glossy', 'Ancho de Rollo', 0),
  ('Acrílicos', 'Acrílico con Caja', 'Tamaño de Marco', 0),
  ('Adhesivos', 'Rollo de Adhesivo Doble Cara Óptico', 'Ancho de Rollo', 0),
  ('Acrílicos', 'Acrílico con Marco y Chapetones', 'Tamaño de Marco', 0),
  ('Acrílicos', 'Acrílico Flotado', 'Tamaño de Marco', 0),
  ('Rollos de Laminado Fotográfico', 'Rollo de Laminado Cristal', 'Ancho de Rollo', 0),
  ('Acrílicos', 'Acrílico Flotado con Marco', 'Tamaño de Marco', 0),
  ('Photo Books', 'Pasta Dura con Caja Deslizable', 'Book Tamaño', 0),
  ('Acrílicos', 'FlexiGlass Flotado', 'Tamaño de Marco', 0),
  ('Acrílicos', 'Portarretrato de Acrílico con Chapetones', 'Tamaño de Marco', 0),
  ('Photo Books', 'Pasta Acolchada', 'Book Tamaño', 0),
  ('Estuches y Cajas', 'Caja para Book Acolchada', 'Book Tamaño', 0),
  ('Mini Books', 'Pasta Acolchada', 'Pasta Color', 1),
  ('Acrílicos', 'Acrílico con Bastidor y Chapetones', 'Tipo de Bastidor', 1),
  ('Estuches y Cajas', 'Caja para Book con Bastidor Inglés de 2.5mm', 'Pasta Color', 1),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Pearlite Satin / Silky', 'Largo de Rollo', 1),
  ('Photo Books', 'Pasta Dura', 'Pasta Color', 1),
  ('Estuches y Cajas', 'Caja para Book con Ventana de Acrílico', 'Pasta Color', 1),
  ('Mini Books', 'Pasta de Acrílico de 2mm', 'Pasta Color', 1),
  ('Photo Books', 'Pasta Acrílico de 2mm', 'Pasta Color', 1),
  ('Estuches y Cajas', 'Caja para Book Foto Laminada', 'Pasta Color', 1),
  ('Photo Books', 'Pasta Dura con Caja Deslizable', 'Pasta Color', 1),
  ('Acrílicos', 'Acrílico con Caja', 'Tipo de Bastidor', 1),
  ('Estuches y Cajas', 'Caja para Book Lisa', 'Pasta Color', 1),
  ('Photo Books', 'Pasta Foto Laminada con Vinipiel', 'Pasta Color', 1),
  ('Mini Books', 'Pasta Dura', 'Pasta Color', 1),
  ('Estuches y Cajas', 'Caja para PhotoBook Color Liso', 'Pasta Color', 1),
  ('Photo Books', 'Pasta Acolchada', 'Pasta Color', 1),
  ('Adhesivos', 'Rollo de Adhesivo Doble Cara Óptico', 'Largo de Rollo', 1),
  ('Estuches y Cajas', 'Caja para PhotoBook de Vinipiel con ranura USB', 'Pasta Color', 1),
  ('Impresión en Canvas', 'Impresión en Canvas Polyester Mate', 'Largo de Rollo', 1),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Glossy Ink Jet', 'Largo de Rollo', 1),
  ('Estuches y Cajas', 'Caja Personalizada para Book', 'Pasta Color', 1),
  ('Acrílicos', 'Acrílico Flotado con Marco', 'Tipo de Bastidor', 1),
  ('Mini Books', 'Pasta Dura con Caja Deslizable', 'Pasta Color', 1),
  ('Estuches y Cajas', 'Estuche para USB y DVD', 'Pasta Color', 1),
  ('Rollos de Laminado Fotográfico', 'Rollo de Laminado Fotográfico', 'Largo de Rollo', 1),
  ('Estuches y Cajas', 'Caja para Book Acolchada', 'Pasta Color', 1),
  ('Ink Jet / Papeles y Materiales', 'Pack hojas Papel InkJet', 'Largo de Rollo', 1),
  ('Photo Books', 'Pasta Sencilla', 'Pasta Color', 1),
  ('Acrílicos', 'Acrílico con Marco y Chapetones', 'Tipo de Bastidor', 1),
  ('Ink Jet / Papeles y Materiales', 'Papel Ink Mate', 'Largo de Rollo', 1),
  ('Photo Books', 'Color Book Pasta Dura', 'Pasta Color', 5),
  ('Mini Books', 'Pasta Sencilla', 'Pasta Color', 1),
  ('Ink Jet / Papeles y Materiales', 'Papel InkJet Mate', 'Largo de Rollo', 1),
  ('Ink Jet / Papeles y Materiales', 'Rollos de Tela Canvas', 'Largo de Rollo', 1),
  ('Rollos de Laminado Fotográfico', 'Rollo de Laminado Cristal', 'Largo de Rollo', 1),
  ('Ink Jet / Papeles y Materiales', 'Papel InkJet Metallic Glossy', 'Largo de Rollo', 1),
  ('Photo Books', 'Pasta Vinipiel con Relieve', 'Pasta Color', 1),
  ('Adhesivos', 'Rollo de Adhesivo Doble Cara', 'Largo de Rollo', 1),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Satín/Lustre Ink Jet', 'Largo de Rollo', 1),
  ('Acrílicos', 'Portarretrato de Acrílico con Chapetones', 'Tipo de Bastidor', 1),
  ('Mini Books', 'Pasta Vinipiel', 'Pasta Color', 1),
  ('Photo Books', 'Pasta Vinipiel Foto-Ventana con Relieve', 'Pasta Color', 1),
  ('Acrílicos', 'Acrílico Flotado', 'Tipo de Bastidor', 1),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Perla Ink Jet', 'Largo de Rollo', 1),
  ('Acrílicos', 'FlexiGlass Flotado', 'Tipo de Bastidor', 1),
  ('Bastidores', 'Foto Bastidor', 'Tipo de Corte', 1),
  ('Estuches y Cajas', 'Caja para Book con Ventana de Acrílico', 'Color Vinipiel', 2),
  ('Photo Books', 'Color Book Pasta Dura', 'Hojas y Páginas', 1),
  ('Photo Books', 'Pasta Acolchada', 'Color Vinipiel', 2),
  ('Photo Books', 'Pasta Acrílico de 2mm', 'Color Vinipiel', 2),
  ('Photo Books', 'Pasta Dura', 'Color Vinipiel', 2),
  ('Photo Books', 'Pasta Dura con Caja Deslizable', 'Color Vinipiel', 2),
  ('Photo Books', 'Pasta Foto Laminada con Vinipiel', 'Color Vinipiel', 2),
  ('Photo Books', 'Pasta Sencilla', 'Color Vinipiel', 2),
  ('Photo Books', 'Pasta Vinipiel con Relieve', 'Color Vinipiel', 2),
  ('Photo Books', 'Pasta Vinipiel Foto-Ventana con Relieve', 'Color Vinipiel', 2),
  ('Mini Books', 'Pasta Acolchada', 'Color Vinipiel', 2),
  ('Mini Books', 'Pasta de Acrílico de 2mm', 'Color Vinipiel', 2),
  ('Mini Books', 'Pasta Dura', 'Color Vinipiel', 2),
  ('Mini Books', 'Pasta Dura con Caja Deslizable', 'Color Vinipiel', 2),
  ('Mini Books', 'Pasta Sencilla', 'Color Vinipiel', 2),
  ('Mini Books', 'Pasta Vinipiel', 'Color Vinipiel', 2),
  ('Acrílicos', 'Acrílico con Bastidor y Chapetones', 'Color de Marco', 2),
  ('Acrílicos', 'Acrílico con Caja', 'Color de Marco', 2),
  ('Acrílicos', 'Acrílico con Marco y Chapetones', 'Color de Marco', 2),
  ('Acrílicos', 'Acrílico Flotado', 'Color de Marco', 2),
  ('Acrílicos', 'Acrílico Flotado con Marco', 'Color de Marco', 2),
  ('Acrílicos', 'FlexiGlass Flotado', 'Color de Marco', 2),
  ('Acrílicos', 'Portarretrato de Acrílico con Chapetones', 'Color de Marco', 2),
  ('Estuches y Cajas', 'Caja para Book Acolchada', 'Color Vinipiel', 2),
  ('Estuches y Cajas', 'Caja para Book con Bastidor Inglés de 2.5mm', 'Color Vinipiel', 2),
  ('Estuches y Cajas', 'Caja para Book Foto Laminada', 'Color Vinipiel', 2),
  ('Estuches y Cajas', 'Caja para Book Lisa', 'Color Vinipiel', 2),
  ('Estuches y Cajas', 'Caja para PhotoBook Color Liso', 'Color Vinipiel', 2),
  ('Estuches y Cajas', 'Caja para PhotoBook de Vinipiel con ranura USB', 'Color Vinipiel', 2),
  ('Estuches y Cajas', 'Caja Personalizada para Book', 'Color Vinipiel', 2),
  ('Estuches y Cajas', 'Estuche para USB y DVD', 'Color Vinipiel', 2),
  ('Ink Jet / Papeles y Materiales', 'Pack hojas Papel InkJet', 'Tipo de Impresión', 2),
  ('Ink Jet / Papeles y Materiales', 'Papel Ink Mate', 'Tipo de Impresión', 2),
  ('Ink Jet / Papeles y Materiales', 'Papel InkJet Mate', 'Tipo de Impresión', 2),
  ('Ink Jet / Papeles y Materiales', 'Papel InkJet Metallic Glossy', 'Tipo de Impresión', 2),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Glossy Ink Jet', 'Tipo de Impresión', 2),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Pearlite Satin / Silky', 'Tipo de Impresión', 2),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Perla Ink Jet', 'Tipo de Impresión', 2),
  ('Ink Jet / Papeles y Materiales', 'Rollo de Papel Fotográfico Satín/Lustre Ink Jet', 'Tipo de Impresión', 2),
  ('Ink Jet / Papeles y Materiales', 'Rollos de Tela Canvas', 'Tipo de Impresión', 2),
  ('Impresión en Canvas', 'Impresión en Canvas Polyester Mate', 'Tamaño Bastidor con Relieve', 2),
  ('Rollos de Laminado Fotográfico', 'Rollo de Laminado Cristal', 'Textura', 2),
  ('Rollos de Laminado Fotográfico', 'Rollo de Laminado Fotográfico', 'Textura', 2),
  ('Mini Books', 'Pasta Vinipiel', 'Filo de Bastidor', 3),
  ('Mini Books', 'Pasta Sencilla', 'Filo de Bastidor', 3),
  ('Photo Books', 'Pasta Dura', 'Filo de Bastidor', 3),
  ('Mini Books', 'Pasta Dura con Caja Deslizable', 'Filo de Bastidor', 3),
  ('Mini Books', 'Pasta Dura', 'Filo de Bastidor', 3),
  ('Photo Books', 'Pasta Sencilla', 'Filo de Bastidor', 3),
  ('Mini Books', 'Pasta de Acrílico de 2mm', 'Filo de Bastidor', 3),
  ('Mini Books', 'Pasta Acolchada', 'Filo de Bastidor', 3),
  ('Photo Books', 'Pasta Vinipiel Foto-Ventana con Relieve', 'Filo de Bastidor', 3),
  ('Photo Books', 'Pasta Vinipiel con Relieve', 'Filo de Bastidor', 3),
  ('Photo Books', 'Pasta Foto Laminada con Vinipiel', 'Filo de Bastidor', 3),
  ('Photo Books', 'Pasta Acolchada', 'Filo de Bastidor', 3),
  ('Photo Books', 'Color Book Pasta Dura', 'Requiero Diseño', 3),
  ('Photo Books', 'Color Book Pasta Dura', 'Corrección de Color', 4),
  ('Photo Books', 'Pasta Dura con Caja Deslizable', 'Filo de Bastidor', 3),
  ('Photo Books', 'Pasta Acrílico de 2mm', 'Filo de Bastidor', 3),
  ('Photo Books', 'Pasta Acrílico de 2mm', 'Hoja Extra', 4),
  ('Photo Books', 'Pasta Vinipiel con Relieve', 'Hoja Extra', 4),
  ('Photo Books', 'Pasta Sencilla', 'Hoja Extra', 4),
  ('Photo Books', 'Pasta Acolchada', 'Hoja Extra', 4),
  ('Photo Books', 'Pasta Foto Laminada con Vinipiel', 'Hoja Extra', 4),
  ('Photo Books', 'Pasta Dura con Caja Deslizable', 'Hoja Extra', 4),
  ('Photo Books', 'Pasta Dura', 'Hoja Extra', 4),
  ('Photo Books', 'Color Book Pasta Dura', 'Hoja Extra', 2),
  ('Photo Books', 'Pasta Vinipiel Foto-Ventana con Relieve', 'Hoja Extra', 4)
) AS v(categoria, producto, atributo, orden)
JOIN categorias c ON c.nombre = v.categoria
JOIN productos p ON p.categoria_id = c.id AND p.nombre = v.producto
JOIN atributos a ON a.nombre = v.atributo
ON CONFLICT (producto_id, atributo_id) DO NOTHING;

-- =============================================
-- PHOTO BOOKS: ajuste "exacto como la web" (atributos)
-- =============================================
DELETE FROM producto_atributos
WHERE producto_id IN (
  SELECT p.id FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
  WHERE c.nombre = 'Photo Books'
);

WITH map_productos(producto, perfil) AS (
  VALUES
    ('Color Book Pasta Dura', 'A'),
    ('Pasta Acolchada', 'B'),
    ('Pasta Acrílico de 2mm', 'B'),
    ('Pasta Foto Laminada con Vinipiel', 'B'),
    ('Pasta Vinipiel con Relieve', 'B'),
    ('Pasta Vinipiel Foto-Ventana con Relieve', 'B'),
    ('Pasta Dura', 'C'),
    ('Pasta Dura con Caja Deslizable', 'C'),
    ('Pasta Sencilla', 'D')
),
map_atributos(perfil, atributo, orden) AS (
  VALUES
    ('A', 'Book Tamaño', 0), ('A', 'Hojas y Páginas', 1), ('A', 'Hoja Extra', 2),
    ('A', 'Requiero Diseño', 3), ('A', 'Corrección de Color', 4), ('A', 'Pasta Color', 5),
    ('B', 'Book Tamaño', 0), ('B', 'Hojas y Páginas', 1), ('B', 'Hoja Extra', 2),
    ('B', 'Requiero Diseño', 3), ('B', 'Corrección de Color', 4), ('B', 'Color Vinipiel', 5),
    ('C', 'Book Tamaño', 0), ('C', 'Hojas y Páginas', 1), ('C', 'Hoja Extra', 2),
    ('C', 'Requiero Diseño', 3), ('C', 'Corrección de Color', 4),
    ('D', 'Book Tamaño', 0), ('D', 'Hojas y Páginas', 1),
    ('D', 'Requiero Diseño', 2), ('D', 'Corrección de Color', 3)
)
INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, ma.orden, true
FROM map_productos mp
JOIN categorias c ON c.nombre = 'Photo Books'
JOIN productos p ON p.nombre = mp.producto AND p.categoria_id = c.id
JOIN map_atributos ma ON ma.perfil = mp.perfil
JOIN atributos a ON a.nombre = ma.atributo
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden, requerido = EXCLUDED.requerido;

-- =============================================
-- PHOTO BOOKS: ajuste "exacto como la web" (valores por producto)
-- =============================================
CREATE TABLE IF NOT EXISTS producto_atributo_valores (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_atributo_id UUID NOT NULL REFERENCES producto_atributos(id) ON DELETE CASCADE,
  valor_id             UUID NOT NULL REFERENCES atributo_valores(id) ON DELETE CASCADE,
  orden                INT DEFAULT 0,
  UNIQUE (producto_atributo_id, valor_id)
);

INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor
FROM atributos a
JOIN (VALUES ('8.5x11"'), ('11x8.5"')) AS v(valor) ON true
WHERE a.nombre = 'Book Tamaño'
ON CONFLICT (atributo_id, valor) DO NOTHING;

DELETE FROM producto_atributo_valores pav
USING producto_atributos pa, productos p, categorias c
WHERE pav.producto_atributo_id = pa.id
  AND pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND c.nombre = 'Photo Books';

WITH map_producto_atributo(producto, atributo, set_name) AS (
  VALUES
    ('Color Book Pasta Dura', 'Book Tamaño', 'BT_STD'),
    ('Color Book Pasta Dura', 'Hojas y Páginas', 'HP_3'),
    ('Color Book Pasta Dura', 'Hoja Extra', 'HE_5'),
    ('Color Book Pasta Dura', 'Requiero Diseño', 'SN'),
    ('Color Book Pasta Dura', 'Corrección de Color', 'SN'),
    ('Color Book Pasta Dura', 'Pasta Color', 'PC_15'),
    ('Pasta Acolchada', 'Book Tamaño', 'BT_STD'),
    ('Pasta Acolchada', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Acolchada', 'Hoja Extra', 'HE_5'),
    ('Pasta Acolchada', 'Requiero Diseño', 'SN'),
    ('Pasta Acolchada', 'Corrección de Color', 'SN'),
    ('Pasta Acolchada', 'Color Vinipiel', 'VIN_A'),
    ('Pasta Acrílico de 2mm', 'Book Tamaño', 'BT_PLAIN'),
    ('Pasta Acrílico de 2mm', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Acrílico de 2mm', 'Hoja Extra', 'HE_5'),
    ('Pasta Acrílico de 2mm', 'Requiero Diseño', 'SN'),
    ('Pasta Acrílico de 2mm', 'Corrección de Color', 'SN'),
    ('Pasta Acrílico de 2mm', 'Color Vinipiel', 'VIN_A'),
    ('Pasta Foto Laminada con Vinipiel', 'Book Tamaño', 'BT_STD'),
    ('Pasta Foto Laminada con Vinipiel', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Foto Laminada con Vinipiel', 'Hoja Extra', 'HE_5'),
    ('Pasta Foto Laminada con Vinipiel', 'Requiero Diseño', 'SN'),
    ('Pasta Foto Laminada con Vinipiel', 'Corrección de Color', 'SN'),
    ('Pasta Foto Laminada con Vinipiel', 'Color Vinipiel', 'VIN_A'),
    ('Pasta Vinipiel con Relieve', 'Book Tamaño', 'BT_STD'),
    ('Pasta Vinipiel con Relieve', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Vinipiel con Relieve', 'Hoja Extra', 'HE_5'),
    ('Pasta Vinipiel con Relieve', 'Requiero Diseño', 'SN'),
    ('Pasta Vinipiel con Relieve', 'Corrección de Color', 'SN'),
    ('Pasta Vinipiel con Relieve', 'Color Vinipiel', 'VIN_B'),
    ('Pasta Vinipiel Foto-Ventana con Relieve', 'Book Tamaño', 'BT_STD'),
    ('Pasta Vinipiel Foto-Ventana con Relieve', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Vinipiel Foto-Ventana con Relieve', 'Hoja Extra', 'HE_5'),
    ('Pasta Vinipiel Foto-Ventana con Relieve', 'Requiero Diseño', 'SN'),
    ('Pasta Vinipiel Foto-Ventana con Relieve', 'Corrección de Color', 'SN'),
    ('Pasta Vinipiel Foto-Ventana con Relieve', 'Color Vinipiel', 'VIN_B'),
    ('Pasta Dura', 'Book Tamaño', 'BT_STD'),
    ('Pasta Dura', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Dura', 'Hoja Extra', 'HE_5'),
    ('Pasta Dura', 'Requiero Diseño', 'SN'),
    ('Pasta Dura', 'Corrección de Color', 'SN'),
    ('Pasta Dura con Caja Deslizable', 'Book Tamaño', 'BT_STD'),
    ('Pasta Dura con Caja Deslizable', 'Hojas y Páginas', 'HP_3'),
    ('Pasta Dura con Caja Deslizable', 'Hoja Extra', 'HE_5'),
    ('Pasta Dura con Caja Deslizable', 'Requiero Diseño', 'SN'),
    ('Pasta Dura con Caja Deslizable', 'Corrección de Color', 'SN'),
    ('Pasta Sencilla', 'Book Tamaño', 'BT_PLAIN'),
    ('Pasta Sencilla', 'Hojas y Páginas', 'HP_1'),
    ('Pasta Sencilla', 'Requiero Diseño', 'SN'),
    ('Pasta Sencilla', 'Corrección de Color', 'SN')
),
sets(set_name, valores) AS (
  VALUES
    ('BT_STD', ARRAY['8x10"', '8.5x11" Horizontal', '11x8.5" Vertical', '10x10"', '12x12"', '11x14" Horizontal', '14x11" Vertical']),
    ('BT_PLAIN', ARRAY['8x10"', '8.5x11"', '11x8.5"', '10x10"', '12x12"', '11x14" Horizontal', '14x11" Vertical']),
    ('HP_3', ARRAY['10 Hojas 20 Páginas', '15 Hojas 30 Páginas', '20 Hojas 40 Páginas']),
    ('HP_1', ARRAY['10 Hojas 20 Páginas']),
    ('HE_5', ARRAY['Ninguna', '1 Hoja', '2 Hojas', '3 Hojas', '4 Hojas']),
    ('SN', ARRAY['No', 'Si']),
    ('PC_15', ARRAY['Amarillo', 'Azul Cielo', 'Azul Marino', 'Blanco', 'Chocolate', 'Crema', 'Gris', 'Lila', 'Negro', 'Pistache', 'Rojo', 'Rosa Pastel', 'Uva', 'Verde', 'Vino']),
    ('VIN_A', ARRAY['Acuático', 'Azul Rey', 'Banana', 'Ferrero', 'Fucsia', 'Ladrillo', 'Leche', 'Marrón', 'Negro Arroyo', 'Oxford', 'Palomitas', 'Peach', 'Pétalo', 'Pinot', 'Rojo Labial', 'Silken', 'Silver', 'Testa', 'Topo', 'Yellow', 'Azul Marino', 'Beige', 'Chocolate', 'Gris', 'Negro', 'Tabaco']),
    ('VIN_B', ARRAY['Acuático', 'Azul Rey', 'Banana', 'Ferrero', 'Fucsia', 'Ladrillo', 'Leche', 'Marrón', 'Oxford', 'Palomitas', 'Peach', 'Pétalo', 'Pinot', 'Rojo Labial', 'Silken', 'Silver', 'Testa', 'Topo', 'Yellow', 'Azul Marino', 'Beige', 'Chocolate', 'Gris', 'Negro', 'Tabaco'])
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM map_producto_atributo mpa
JOIN categorias c ON c.nombre = 'Photo Books'
JOIN productos p ON p.nombre = mpa.producto AND p.categoria_id = c.id
JOIN producto_atributos pa ON pa.producto_id = p.id
JOIN atributos a ON a.id = pa.atributo_id AND a.nombre = mpa.atributo
JOIN sets s ON s.set_name = mpa.set_name
CROSS JOIN LATERAL unnest(s.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE SET orden = EXCLUDED.orden;

-- =============================================
-- MINI BOOKS: ajuste "exacto como la web" (atributos)
-- =============================================
DELETE FROM producto_atributos
WHERE producto_id IN (
  SELECT p.id FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
  WHERE c.nombre = 'Mini Books'
);

WITH map_productos(producto, perfil) AS (
  VALUES
    ('Pasta Acolchada', 'B'),
    ('Pasta de Acrílico de 2mm', 'B'),
    ('Pasta Vinipiel', 'B'),
    ('Pasta Dura', 'C'),
    ('Pasta Dura con Caja Deslizable', 'C'),
    ('Pasta Sencilla', 'D')
),
map_atributos(perfil, atributo, orden) AS (
  VALUES
    ('B', 'Mini Book Tamaño', 0), ('B', 'Hojas y Páginas', 1), ('B', 'Hoja Extra', 2),
    ('B', 'Requiero Diseño', 3), ('B', 'Corrección de Color', 4), ('B', 'Color Vinipiel', 5),
    ('C', 'Mini Book Tamaño', 0), ('C', 'Hojas y Páginas', 1), ('C', 'Hoja Extra', 2),
    ('C', 'Requiero Diseño', 3), ('C', 'Corrección de Color', 4),
    ('D', 'Mini Book Tamaño', 0), ('D', 'Hojas y Páginas', 1),
    ('D', 'Requiero Diseño', 2), ('D', 'Corrección de Color', 3)
)
INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, ma.orden, true
FROM map_productos mp
JOIN categorias c ON c.nombre = 'Mini Books'
JOIN productos p ON p.nombre = mp.producto AND p.categoria_id = c.id
JOIN map_atributos ma ON ma.perfil = mp.perfil
JOIN atributos a ON a.nombre = ma.atributo
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden, requerido = EXCLUDED.requerido;

-- =============================================
-- MINI BOOKS: ajuste "exacto como la web" (valores por producto)
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor
FROM atributos a
JOIN (VALUES ('6x8.5"'), ('8.5x6"')) AS v(valor) ON true
WHERE a.nombre = 'Mini Book Tamaño'
ON CONFLICT (atributo_id, valor) DO NOTHING;

DELETE FROM producto_atributo_valores pav
USING producto_atributos pa, productos p, categorias c
WHERE pav.producto_atributo_id = pa.id
  AND pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND c.nombre = 'Mini Books';

WITH map_producto_atributo(producto, atributo, set_name) AS (
  VALUES
    ('Pasta Acolchada', 'Mini Book Tamaño', 'MBT_STD'),
    ('Pasta Acolchada', 'Hojas y Páginas', 'HP_MB'),
    ('Pasta Acolchada', 'Hoja Extra', 'HE_5'),
    ('Pasta Acolchada', 'Requiero Diseño', 'SN'),
    ('Pasta Acolchada', 'Corrección de Color', 'SN'),
    ('Pasta Acolchada', 'Color Vinipiel', 'VIN_A'),
    ('Pasta de Acrílico de 2mm', 'Mini Book Tamaño', 'MBT_PLAIN'),
    ('Pasta de Acrílico de 2mm', 'Hojas y Páginas', 'HP_MB'),
    ('Pasta de Acrílico de 2mm', 'Hoja Extra', 'HE_5'),
    ('Pasta de Acrílico de 2mm', 'Requiero Diseño', 'SN'),
    ('Pasta de Acrílico de 2mm', 'Corrección de Color', 'SN'),
    ('Pasta de Acrílico de 2mm', 'Color Vinipiel', 'VIN_A'),
    ('Pasta Vinipiel', 'Mini Book Tamaño', 'MBT_STD'),
    ('Pasta Vinipiel', 'Hojas y Páginas', 'HP_MB'),
    ('Pasta Vinipiel', 'Hoja Extra', 'HE_5'),
    ('Pasta Vinipiel', 'Requiero Diseño', 'SN'),
    ('Pasta Vinipiel', 'Corrección de Color', 'SN'),
    ('Pasta Vinipiel', 'Color Vinipiel', 'VIN_A'),
    ('Pasta Dura', 'Mini Book Tamaño', 'MBT_STD'),
    ('Pasta Dura', 'Hojas y Páginas', 'HP_MB'),
    ('Pasta Dura', 'Hoja Extra', 'HE_5'),
    ('Pasta Dura', 'Requiero Diseño', 'SN'),
    ('Pasta Dura', 'Corrección de Color', 'SN'),
    ('Pasta Dura con Caja Deslizable', 'Mini Book Tamaño', 'MBT_STD'),
    ('Pasta Dura con Caja Deslizable', 'Hojas y Páginas', 'HP_MB'),
    ('Pasta Dura con Caja Deslizable', 'Hoja Extra', 'HE_5'),
    ('Pasta Dura con Caja Deslizable', 'Requiero Diseño', 'SN'),
    ('Pasta Dura con Caja Deslizable', 'Corrección de Color', 'SN'),
    ('Pasta Sencilla', 'Mini Book Tamaño', 'MBT_SEN'),
    ('Pasta Sencilla', 'Hojas y Páginas', 'HP_MB1'),
    ('Pasta Sencilla', 'Requiero Diseño', 'SN'),
    ('Pasta Sencilla', 'Corrección de Color', 'SN')
),
sets(set_name, valores) AS (
  VALUES
    ('MBT_STD', ARRAY['6x6"', '6x8.5" Horizontal', '8.5x6" Vertical', '7x5"', '8x8"']),
    ('MBT_PLAIN', ARRAY['6x6"', '7x5"', '6x8.5"', '8.5x6"', '8x8"']),
    ('MBT_SEN', ARRAY['6x6"', '7x5"', '6x8.5"', '8.5x6"', '8x8"', '8x10"', '8.5x11"']),
    ('HP_MB', ARRAY['10 Hojas 20 Páginas', '15 Hojas 30 Páginas']),
    ('HP_MB1', ARRAY['10 Hojas 20 Páginas']),
    ('HE_5', ARRAY['Ninguna', '1 Hoja', '2 Hojas', '3 Hojas', '4 Hojas']),
    ('SN', ARRAY['No', 'Si']),
    ('VIN_A', ARRAY['Acuático', 'Azul Rey', 'Banana', 'Ferrero', 'Fucsia', 'Ladrillo', 'Leche', 'Marrón', 'Negro Arroyo', 'Oxford', 'Palomitas', 'Peach', 'Pétalo', 'Pinot', 'Rojo Labial', 'Silken', 'Silver', 'Testa', 'Topo', 'Yellow', 'Azul Marino', 'Beige', 'Chocolate', 'Gris', 'Negro', 'Tabaco'])
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM map_producto_atributo mpa
JOIN categorias c ON c.nombre = 'Mini Books'
JOIN productos p ON p.nombre = mpa.producto AND p.categoria_id = c.id
JOIN producto_atributos pa ON pa.producto_id = p.id
JOIN atributos a ON a.id = pa.atributo_id AND a.nombre = mpa.atributo
JOIN sets s ON s.set_name = mpa.set_name
CROSS JOIN LATERAL unnest(s.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE SET orden = EXCLUDED.orden;

-- =============================================
-- ACRÍLICOS: ajuste "exacto como la web"
-- =============================================
-- Renombres de etiquetas (Acrílicos / atributo huérfano)
UPDATE atributos SET nombre = 'Color marco' WHERE nombre = 'Color de Marco';
UPDATE atributos SET nombre = 'Marco' WHERE nombre = 'Marco Espejo';

-- Atributo Grosor + valor
INSERT INTO atributos (nombre) VALUES ('Grosor') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor FROM atributos a JOIN (VALUES ('2mm')) AS v(valor) ON true
WHERE a.nombre = 'Grosor'
ON CONFLICT (atributo_id, valor) DO NOTHING;

-- Valores de Color marco que la web trae y no existían
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v.valor FROM atributos a
JOIN (VALUES ('Chocolate Cobrizo'), ('Oro Betas Rojas'), ('Plata Rayada')) AS v(valor) ON true
WHERE a.nombre = 'Color marco'
ON CONFLICT (atributo_id, valor) DO NOTHING;

-- Remapear atributos de Acrílicos
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

-- Remapear valores de Acrílicos
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

-- =============================================
-- BASTIDORES: ajuste "exacto como la web" (Foto Bastidor)
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

UPDATE atributos SET activo = false
WHERE nombre IN ('Tipo de Bastidor', 'Tipo de Corte');

-- =============================================
-- ESTUCHES Y CAJAS: ajuste "exacto como la web"
-- =============================================
DELETE FROM producto_atributos
WHERE producto_id IN (
  SELECT p.id FROM productos p
  JOIN categorias c ON c.id = p.categoria_id
  WHERE c.nombre = 'Estuches y Cajas'
);

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

INSERT INTO producto_atributos (producto_id, atributo_id, orden, requerido)
SELECT p.id, a.id, 0, true
FROM categorias c
JOIN productos p ON p.nombre = 'Estuche para USB y DVD' AND p.categoria_id = c.id
JOIN atributos a ON a.nombre = 'Color Vinipiel'
WHERE c.nombre = 'Estuches y Cajas'
ON CONFLICT (producto_id, atributo_id) DO UPDATE
  SET orden = EXCLUDED.orden, requerido = EXCLUDED.requerido;

DELETE FROM producto_atributo_valores pav
USING producto_atributos pa, productos p, categorias c
WHERE pav.producto_atributo_id = pa.id
  AND pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND c.nombre = 'Estuches y Cajas';

WITH map_producto_atributo(producto, atributo, set_name) AS (
  VALUES
    ('Caja para Book Acolchada', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para Book Acolchada', 'Color Vinipiel', 'CV_26'),
    ('Caja para Book con Bastidor Inglés de 2.5mm', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para Book con Bastidor Inglés de 2.5mm', 'Color Vinipiel', 'CV_26'),
    ('Caja para Book con Ventana de Acrílico', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para Book con Ventana de Acrílico', 'Color Vinipiel', 'CV_26'),
    ('Caja para PhotoBook Color Liso', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para PhotoBook Color Liso', 'Color Vinipiel', 'CV_26'),
    ('Caja para Book Foto Laminada', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para Book Foto Laminada', 'Color Vinipiel', 'CV_NEGRO'),
    ('Caja para Book Lisa', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para Book Lisa', 'Color Vinipiel', 'CV_NEGRO'),
    ('Caja para PhotoBook de Vinipiel con ranura USB', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja para PhotoBook de Vinipiel con ranura USB', 'Color Vinipiel', 'CV_NEGRO'),
    ('Caja Personalizada para Book', 'Caja Tamaño', 'CAJA_TAMANO'),
    ('Caja Personalizada para Book', 'Color Vinipiel', 'CV_NEGRO'),
    ('Estuche para USB y DVD', 'Color Vinipiel', 'CV_26')
),
sets(set_name, valores) AS (
  VALUES
    ('CAJA_TAMANO', ARRAY['8x8"', '8x10"', '10x10"', '12x12"', '11x14"']),
    ('CV_NEGRO', ARRAY['Negro']),
    ('CV_26', ARRAY['Acuático', 'Azul Rey', 'Banana', 'Ferrero', 'Fucsia', 'Ladrillo', 'Leche', 'Marrón', 'Negro Arroyo', 'Oxford', 'Palomitas', 'Peach', 'Pétalo', 'Pinot', 'Rojo Labial', 'Silken', 'Silver', 'Testa', 'Topo', 'Yellow', 'Azul Marino', 'Beige', 'Chocolate', 'Gris', 'Negro', 'Tabaco'])
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM map_producto_atributo mpa
JOIN categorias c ON c.nombre = 'Estuches y Cajas'
JOIN productos p ON p.nombre = mpa.producto AND p.categoria_id = c.id
JOIN producto_atributos pa ON pa.producto_id = p.id
JOIN atributos a ON a.id = pa.atributo_id AND a.nombre = mpa.atributo
JOIN sets s ON s.set_name = mpa.set_name
CROSS JOIN LATERAL unnest(s.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE SET orden = EXCLUDED.orden;

-- =============================================
-- ESTUCHES Y CAJAS: alta de 5 productos faltantes vs la web
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

-- =============================================
-- FOTO CRISTAL: categoría + producto "Cristal Con Caja" (exacto como la web)
-- =============================================
INSERT INTO categorias (nombre, orden) VALUES ('Foto Cristal', 9)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, '3mm' FROM atributos a WHERE a.nombre = 'Grosor'
ON CONFLICT (atributo_id, valor) DO NOTHING;

INSERT INTO productos (categoria_id, nombre, ruta, orden)
SELECT c.id, 'Cristal Con Caja', 'R2', 0
FROM categorias c WHERE c.nombre = 'Foto Cristal'
ON CONFLICT (categoria_id, nombre) DO NOTHING;

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

-- =============================================
-- RESTO DE CATEGORÍAS: Canvas, Laminados, Adhesivos (+altas), Impresiones (nueva)
-- (idéntico a la migración 035)
-- =============================================
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

INSERT INTO categorias (nombre, orden) VALUES ('Impresiones', 10)
ON CONFLICT (nombre) DO NOTHING;

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
    ('TEXT_IMP', ARRAY['3D','Brillante','Canvas','Escarcha','Espuma Brillante','Granizo','Lino Fino','Manta Sueca','Mate','Nieve','Piel','Seda','Super Arena']),
    ('PAPEL', ARRAY['Lustre','Metálico']),
    ('SN', ARRAY['No','Si'])
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
)
INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
SELECT pa.id, av.id, v.ord - 1
FROM map_pa mpa
JOIN productos p ON p.nombre = mpa.producto
JOIN categorias c ON c.id = p.categoria_id
  AND c.nombre IN ('Impresión en Canvas', 'Rollos de Laminado Fotográfico', 'Adhesivos', 'Impresiones')
JOIN producto_atributos pa ON pa.producto_id = p.id
JOIN atributos a ON a.id = pa.atributo_id AND a.nombre = mpa.atributo
JOIN sets s ON s.set_name = mpa.set_name
CROSS JOIN LATERAL unnest(s.valores) WITH ORDINALITY AS v(valor, ord)
JOIN atributo_valores av ON av.atributo_id = a.id AND av.valor = v.valor
ON CONFLICT (producto_atributo_id, valor_id) DO UPDATE SET orden = EXCLUDED.orden;

-- =============================================
-- INK JET: ajuste "exacto como la web" (idéntico a la migración 036)
-- =============================================
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

UPDATE productos SET nombre = 'Rollo de Papel Fotográfico Pearlite Satin 24"x30m (60.96cmx30m)', orden = 5
WHERE nombre = 'Rollo de Papel Fotográfico Pearlite Satin / Silky'
  AND categoria_id = (SELECT id FROM categorias WHERE nombre = 'Ink Jet / Papeles y Materiales');

UPDATE productos SET nombre = 'Rollo de Tela Canvas Poliéster Mate', orden = 11
WHERE nombre = 'Rollos de Tela Canvas'
  AND categoria_id = (SELECT id FROM categorias WHERE nombre = 'Ink Jet / Papeles y Materiales');

INSERT INTO productos (categoria_id, nombre, ruta, orden)
SELECT c.id, v.nombre, 'R1', v.orden FROM categorias c
JOIN (VALUES
  ('Rollo de Papel Fotográfico Pearlite Silky 24"x30m (60.96cmx30m)', 6),
  ('Rollo de Papel Fotográfico Silky 24"x30m (60.96cmx30m)', 9),
  ('Rollo de Tela Canvas Poli-Algodón Mate', 10)
) AS v(nombre, orden) ON true
WHERE c.nombre = 'Ink Jet / Papeles y Materiales'
ON CONFLICT (categoria_id, nombre) DO NOTHING;

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
