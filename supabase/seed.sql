-- =============================================
-- ATRIBUTOS
-- =============================================
INSERT INTO atributos (nombre) VALUES
  ('Ancho de Rollo'),
  ('Cama Color'),
  ('Cantidad de Hojas'),
  ('Color de Marco'),
  ('Color Vinipiel'),
  ('Correccion de Color'),
  ('Color'),
  ('Grosor'),
  ('Impresion Bastidor'),
  ('Largo de Rollo'),
  ('Marco'),
  ('Papel'),
  ('Requiero Diseno'),
  ('Tamano'),
  ('Textura'),
  ('Tipo de Bastidor'),
  ('Tipo de Corte'),
  ('Tipo de Impresion'),
  ('Tipo de Papel Ink Jet');

-- =============================================
-- Ancho de Rollo
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('24" (61cm)'),('36" (91.4cm)'),('44" (111.7cm)'),('60" (152.4cm)')
) AS t(v) WHERE a.nombre = 'Ancho de Rollo';

-- =============================================
-- Cama Color
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Blanco'),('Negro'),('Crema'),('Gris'),('Beige'),('Custom')
) AS t(v) WHERE a.nombre = 'Cama Color';

-- =============================================
-- Cantidad de Hojas
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('10'),('20'),('30'),('40'),('50'),('100')
) AS t(v) WHERE a.nombre = 'Cantidad de Hojas';

-- =============================================
-- Color de Marco
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Negro'),('Blanco'),('Madera Natural'),('Caoba'),('Nogal'),
  ('Dorado'),('Plateado'),('Custom')
) AS t(v) WHERE a.nombre = 'Color de Marco';

-- =============================================
-- Color Vinipiel
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Negro'),('Blanco'),('Rojo'),('Azul'),('Verde'),('Cafe'),('Gris')
) AS t(v) WHERE a.nombre = 'Color Vinipiel';

-- =============================================
-- Correccion de Color
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('No'),('Si - Basica'),('Si - Avanzada'),('Si - Por lote')
) AS t(v) WHERE a.nombre = 'Correccion de Color';

-- =============================================
-- Color
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Negro'),('Blanco'),('Color'),('ByN'),('Sepia'),('Original')
) AS t(v) WHERE a.nombre = 'Color';

-- =============================================
-- Grosor
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('3mm'),('5mm'),('6mm'),('10mm'),('1/8"'),('1/4"'),('1/2"')
) AS t(v) WHERE a.nombre = 'Grosor';

-- =============================================
-- Impresion Bastidor
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('No'),('Si - Galeria'),('Si - Borde Envolvente'),('Si - Borde Espejo')
) AS t(v) WHERE a.nombre = 'Impresion Bastidor';

-- =============================================
-- Largo de Rollo
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('1m'),('3m'),('5m'),('10m'),('15m'),('30m'),('Rollo completo')
) AS t(v) WHERE a.nombre = 'Largo de Rollo';

-- =============================================
-- Marco
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Moldura 033'),('Moldura 007'),('Moldura Flotante'),
  ('Marco Minimalista'),('Marco Clasico'),('Marco Ornamentado'),
  ('Caja de Acrilico'),('Sin Marco')
) AS t(v) WHERE a.nombre = 'Marco';

-- =============================================
-- Papel
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Metallic Glossy'),('Matte Premium'),('Lustre'),
  ('Fine Art Baryta'),('Fine Art Rag'),('Fine Art Canvas Matte'),
  ('Cotton Rag'),('Alpha Cellulose'),('RC Satinado'),('Adhesivo Vinilico')
) AS t(v) WHERE a.nombre = 'Papel';

-- =============================================
-- Requiero Diseno
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('No'),('Si'),('Si - Logo'),('Si - Retoque'),('Si - Composicion')
) AS t(v) WHERE a.nombre = 'Requiero Diseno';

-- =============================================
-- Tamano
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('13x18 cm'),('20x25 cm'),('28x36 cm'),('30x40 cm'),('35x53 cm'),
  ('40x60 cm'),('50x75 cm'),('60x90 cm'),('80x120 cm'),
  ('20x20 cm'),('20x30 cm'),('30x30 cm'),
  ('Carta'),('Doble Carta'),('Tabloide'),('A4'),('A3'),('A2'),('A1')
) AS t(v) WHERE a.nombre = 'Tamano';

-- =============================================
-- Textura
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Mate'),('Glossy'),('Lustre'),('Metalico'),('Satinado'),
  ('Cristal'),('Antirreflejante'),('Texturizado'),('Lino'),('Perla')
) AS t(v) WHERE a.nombre = 'Textura';

-- =============================================
-- Tipo de Bastidor
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Madera 2cm'),('Madera 4cm'),('Madera 6cm'),
  ('Aluminio'),('PVC'),('Sin Bastidor')
) AS t(v) WHERE a.nombre = 'Tipo de Bastidor';

-- =============================================
-- Tipo de Corte
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Recto'),('Redondo'),('Ovalado'),('Forma personalizada'),('Escuadra')
) AS t(v) WHERE a.nombre = 'Tipo de Corte';

-- =============================================
-- Tipo de Impresion
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Inkjet'),('Laser'),('Offset'),('Sublimacion'),('Serigrafia'),('Revelado Quimico')
) AS t(v) WHERE a.nombre = 'Tipo de Impresion';

-- =============================================
-- Tipo de Papel Ink Jet
-- =============================================
INSERT INTO atributo_valores (atributo_id, valor)
SELECT a.id, v FROM atributos a, (VALUES
  ('Inkjet Metallic Glossy'),('Inkjet Matte Premium'),('Inkjet Lustre'),
  ('Inkjet Canvas'),('Inkjet Adhesivo'),('Inkjet Translucio'),
  ('Inkjet Fine Art'),('Inkjet Photo Rag')
) AS t(v) WHERE a.nombre = 'Tipo de Papel Ink Jet';
