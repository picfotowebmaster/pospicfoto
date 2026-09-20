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
  ('Tipo de Impresión');

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
  ('Photo Books', 'Color Book Pasta Dura', 'Pasta Color', 1),
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
  ('Photo Books', 'Color Book Pasta Dura', 'Color Vinipiel', 2),
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
  ('Photo Books', 'Color Book Pasta Dura', 'Filo de Bastidor', 3),
  ('Photo Books', 'Pasta Dura con Caja Deslizable', 'Filo de Bastidor', 3),
  ('Photo Books', 'Pasta Acrílico de 2mm', 'Filo de Bastidor', 3),
  ('Photo Books', 'Pasta Acrílico de 2mm', 'Hoja Extra', 4),
  ('Photo Books', 'Pasta Vinipiel con Relieve', 'Hoja Extra', 4),
  ('Photo Books', 'Pasta Sencilla', 'Hoja Extra', 4),
  ('Photo Books', 'Pasta Acolchada', 'Hoja Extra', 4),
  ('Photo Books', 'Pasta Foto Laminada con Vinipiel', 'Hoja Extra', 4),
  ('Photo Books', 'Pasta Dura con Caja Deslizable', 'Hoja Extra', 4),
  ('Photo Books', 'Pasta Dura', 'Hoja Extra', 4),
  ('Photo Books', 'Color Book Pasta Dura', 'Hoja Extra', 4),
  ('Photo Books', 'Pasta Vinipiel Foto-Ventana con Relieve', 'Hoja Extra', 4)
) AS v(categoria, producto, atributo, orden)
JOIN categorias c ON c.nombre = v.categoria
JOIN productos p ON p.categoria_id = c.id AND p.nombre = v.producto
JOIN atributos a ON a.nombre = v.atributo
ON CONFLICT (producto_id, atributo_id) DO NOTHING;
