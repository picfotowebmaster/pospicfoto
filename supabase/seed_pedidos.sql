-- =============================================
-- PEDIDOS DE MUESTRA — PIC FOTO / FRAMEX (16 pedidos)
-- Ejecutar en: SQL Editor de Supabase
-- Primero limpia datos existentes, reinicia secuencias, luego inserta 16
-- =============================================

DELETE FROM pedido_movimientos;
DELETE FROM detalle_pedidos;
DELETE FROM pedidos;
ALTER SEQUENCE pedido_global_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS factura_folio_seq RESTART WITH 1;

DO $$
DECLARE
  rec RECORD;
  _sucursal_id UUID;
  _marca_id UUID;
  _pedido_id UUID;
  _anticipo NUMERIC(10,2);
  _recep_ts TIMESTAMP;
  _path TEXT[];
  _ts TIMESTAMP;
  j INT;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      (1,  'María García López',           '5512345678', 'maria.garcia@example.com',        'PIC', 'PAL', 'R1', 'mostrador', 'pendiente',  'Efectivo',      true,  290.00,  70, 1, '09:15', 3, '14:00'),
      (2,  'Juan Hernández Ruiz',          '5523456789', 'juan.hernandez@example.com',      'PIC', 'CUB', 'R1', 'diseno',    'en_taller',  'Tarjeta',       false, 1580.00, 100, 2, '10:30', 4, '16:30'),
      (3,  'Ana Martínez Díaz',            '5534567890', 'ana.martinez@example.com',        'FRX', 'PAL', 'R1', 'impresion', 'en_taller',  'Transferencia', true,  950.00,  70, 3, '11:00', 2, '13:00'),
      (4,  'Carlos Sánchez Torres',        '5545678901', 'carlos.sanchez@example.com',      'PIC', 'CUB', 'R1', 'impresion', 'en_taller',  'Efectivo',      false, 1110.00, 100, 2, '12:45', 5, '18:00'),
      (5,  'Laura Ramírez Flores',         '5556789012', 'laura.ramirez@example.com',       'FRX', 'CUB', 'R4', 'laminado',  'en_taller',  'Tarjeta',       false, 460.00,  70, 1, '13:20', 3, '15:30'),
      (6,  'Pedro López Vega',             '5567890123', 'pedro.lopez@example.com',         'PIC', 'PAL', 'R1', 'laminado',  'en_taller',  'Transferencia', false, 720.00,  70, 3, '08:50', 4, '12:00'),
      (7,  'Sofía Mendoza Ortiz',          '5578901234', 'sofia.mendoza@example.com',       'PIC', 'CUB', 'R2', 'montaje',   'en_taller',  'Efectivo',      true,  1340.00, 100, 4, '09:40', 6, '17:00'),
      (8,  'Diego Castro Jiménez',         '5589012345', 'diego.castro@example.com',        'FRX', 'PAL', 'R3', 'books',     'en_taller',  'Tarjeta',       false, 380.00,  70, 2, '15:10', 5, '14:00'),
      (9,  'Valeria Ríos Nava',            '5590123456', 'valeria.rios@example.com',        'FRX', 'CUB', 'R1', 'bastidores','en_taller',  'Transferencia', false, 890.00,  100, 5, '10:05', 7, '13:30'),
      (10, 'Fernando Mora Cruz',           '5501234567', 'fernando.mora@example.com',       'FRX', 'PAL', 'R2', 'marcos',    'en_taller',  'Efectivo',      false, 2100.00, 70, 3, '16:20', 8, '18:30'),
      (11, 'Gabriela Peña Rojas',          '5512223344', 'gabriela.pena@example.com',       'PIC', 'PAL', 'R4', 'montaje',   'en_taller',  'Efectivo',      false, 650.00,  70, 2, '11:35', 4, '16:00'),
      (12, 'Ricardo Salinas Bravo',        '5523334455', 'ricardo.salinas@example.com',     'PIC', 'CUB', 'R1', 'listo',     'listo',      'Tarjeta',       false, 900.00,  100, 6, '09:00', 1, '12:00'),
      (13, 'Mónica Guerrero Paz',          '5534445566', 'monica.guerrero@example.com',     'FRX', 'PAL', 'R3', 'listo',     'listo',      'Transferencia', false, 1450.00, 70, 7, '14:15', 1, '17:30'),
      (14, 'Alejandro Vargas Lira',        '5545556677', 'alejandro.vargas@example.com',    'PIC', 'PAL', 'R1', 'entregado', 'entregado',  'Efectivo',      false, 670.00,  100, 8, '10:00', 0, '11:00'),
      (15, 'Patricia Núñez Cárdenas',      '5556667788', 'patricia.nunez@example.com',      'FRX', 'CUB', 'R2', 'entregado', 'entregado',  'Tarjeta',       false, 800.00,  100, 9, '12:30', 0, '15:00'),
      (16, 'Héctor Domínguez Sáez',        '5567778899', 'hector.dominguez@example.com',    'PIC', 'PAL', 'R3', 'mostrador', 'cancelado',  'Efectivo',      false, 460.00,  0,   4, '13:45', 5, '13:00')
    ) AS t(i, cliente, telefono, email, marca, sucursal, ruta, area, estado, metodo, correccion, subtotal, anticipo_pct, recep_ago, hora_rec, entrega_en, hora_ent)
  LOOP
    SELECT id INTO _sucursal_id FROM sucursales WHERE codigo = rec.sucursal;
    SELECT id INTO _marca_id FROM marcas WHERE codigo = rec.marca;

    _anticipo := ROUND(rec.subtotal * rec.anticipo_pct / 100.0, 2);
    _pedido_id := gen_random_uuid();
    _recep_ts := (CURRENT_DATE - rec.recep_ago) + rec.hora_rec::time;

    INSERT INTO pedidos (
      id, numero_pedido, sucursal_id, marca_id,
      cliente_nombre, cliente_telefono, cliente_email,
      fecha_recepcion, hora_recepcion,
      fecha_entrega, hora_entrega,
      requiere_correccion, estado, area_actual, ruta,
      subtotal, anticipo, total, metodo_pago
    ) VALUES (
      _pedido_id,
      generar_numero_pedido(rec.marca, rec.sucursal),
      _sucursal_id, _marca_id,
      rec.cliente, rec.telefono, rec.email,
      CURRENT_DATE - rec.recep_ago,
      rec.hora_rec::time,
      CURRENT_DATE + rec.entrega_en,
      rec.hora_ent::time,
      rec.correccion,
      rec.estado::estado_pedido_enum,
      rec.area,
      rec.ruta,
      rec.subtotal,
      _anticipo,
      rec.subtotal,
      rec.metodo::metodo_pago_enum
    );

    -- Detalle del pedido (importes suman exactamente el subtotal)
    CASE rec.i
      WHEN 1 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Impresión fotográfica 20x25 cm', 2, 45.00, 90.00, '{"Tamano":"20x25 cm","Papel":"Matte Premium","Tipo de Impresion":"Inkjet"}'),
          (_pedido_id, 'Impresión fotográfica 30x40 cm', 1, 120.00, 120.00, '{"Tamano":"30x40 cm","Papel":"Lustre","Tipo de Impresion":"Inkjet"}'),
          (_pedido_id, 'Impresión fotográfica 13x18 cm', 4, 20.00, 80.00, '{"Tamano":"13x18 cm","Papel":"RC Satinado","Tipo de Impresion":"Inkjet"}');
      WHEN 2 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Fotolienzo Fine Art', 1, 650.00, 650.00, '{"Tamano":"60x90 cm","Papel":"Fine Art Canvas","Correccion de Color":"Si"}'),
          (_pedido_id, 'Impresión en canvas 60x90 cm', 1, 700.00, 700.00, '{"Tamano":"60x90 cm","Tipo de Impresion":"Inkjet"}'),
          (_pedido_id, 'Enmarcado Marco Minimalista', 1, 230.00, 230.00, '{"Marco":"Marco Minimalista","Color":"Negro"}');
      WHEN 3 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Impresión fotográfica 50x75 cm', 1, 350.00, 350.00, '{"Tamano":"50x75 cm","Papel":"Metallic Glossy"}'),
          (_pedido_id, 'Bastidor con impresión galería', 1, 480.00, 480.00, '{"Tamano":"40x60 cm","Tipo de Bastidor":"Madera 4cm"}'),
          (_pedido_id, 'Impresión fotográfica 20x25 cm', 2, 60.00, 120.00, '{"Tamano":"20x25 cm","Papel":"Matte Premium","Color":"ByN"}');
      WHEN 4 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Impresión fotográfica 60x90 cm', 1, 600.00, 600.00, '{"Tamano":"60x90 cm","Papel":"Fine Art Baryta","Tipo de Impresion":"Inkjet"}'),
          (_pedido_id, 'Enmarcado Moldura 033', 1, 510.00, 510.00, '{"Marco":"Moldura 033","Color de Marco":"Nogal","Tamano":"60x90 cm"}');
      WHEN 5 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Laminado mate sobre impresión 50x75 cm', 1, 300.00, 300.00, '{"Tamano":"50x75 cm","Textura":"Mate","Tipo de Corte":"Recto"}'),
          (_pedido_id, 'Impresión fotográfica 30x45 cm', 1, 160.00, 160.00, '{"Tamano":"30x45 cm","Papel":"Lustre","Color":"Color"}');
      WHEN 6 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Lámina fotográfica 40x50 cm', 3, 100.00, 300.00, '{"Tamano":"40x50 cm","Papel":"Lustre Premium","Tipo de Impresion":"Revelado Quimico"}'),
          (_pedido_id, 'Impresión fotográfica 30x45 cm', 2, 150.00, 300.00, '{"Tamano":"30x45 cm","Papel":"Fine Art Baryta"}'),
          (_pedido_id, 'Foto carnet', 3, 40.00, 120.00, '{"Tamano":"Infantil","Papel":"RC Satinado"}');
      WHEN 7 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Enmarcado Moldura 007', 2, 280.00, 560.00, '{"Marco":"Moldura 007","Color de Marco":"Dorado","Tamano":"30x40 cm"}'),
          (_pedido_id, 'Enmarcado Caja de Acrílico', 1, 550.00, 550.00, '{"Marco":"Caja de Acrilico","Tamano":"50x75 cm"}'),
          (_pedido_id, 'Impresión fotográfica 30x40 cm', 1, 230.00, 230.00, '{"Tamano":"30x40 cm","Papel":"Fine Art Rag"}');
      WHEN 8 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Álbum fotográfico 20x30 cm', 1, 380.00, 380.00, '{"Tamano":"20x30 cm","Cantidad de Hojas":"40","Papel":"Fine Art Rag"}');
      WHEN 9 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Bastidor 60x90 cm', 1, 490.00, 490.00, '{"Tamano":"60x90 cm","Tipo de Bastidor":"Madera 4cm","Impresion Bastidor":"Si - Galeria"}'),
          (_pedido_id, 'Impresión fotográfica 60x90 cm', 1, 400.00, 400.00, '{"Tamano":"60x90 cm","Papel":"Metallic Glossy"}');
      WHEN 10 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Fotolienzo Fine Art 120x80 cm', 1, 1200.00, 1200.00, '{"Tamano":"120x80 cm","Papel":"Canvas Matte","Textura":"Lino","Correccion de Color":"Si"}'),
          (_pedido_id, 'Enmarcado Caja Profunda', 1, 650.00, 650.00, '{"Marco":"Caja Profunda","Color":"Blanco","Tamano":"120x80 cm","Vidrio":"Museo"}'),
          (_pedido_id, 'Impresión fotográfica 13x18 cm', 10, 25.00, 250.00, '{"Tamano":"13x18 cm","Papel":"RC Satinado"}');
      WHEN 11 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Impresión fotográfica 50x70 cm', 1, 320.00, 320.00, '{"Tamano":"50x70 cm","Papel":"Lustre Premium"}'),
          (_pedido_id, 'Laminado brillante 50x70 cm', 1, 180.00, 180.00, '{"Tamano":"50x70 cm","Textura":"Glossy"}'),
          (_pedido_id, 'Montaje sobre MDF', 1, 150.00, 150.00, '{"Tamano":"50x70 cm","Grosor":"5mm"}');
      WHEN 12 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Impresión fotográfica 30x40 cm', 4, 160.00, 640.00, '{"Tamano":"30x40 cm","Papel":"Fine Art Rag"}'),
          (_pedido_id, 'Enmarcado Marco Minimalista', 1, 260.00, 260.00, '{"Marco":"Marco Minimalista","Color":"Blanco","Tamano":"30x40 cm"}');
      WHEN 13 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Álbum fotográfico de bodas 30x30 cm', 1, 1450.00, 1450.00, '{"Tamano":"30x30 cm","Cantidad de Hojas":"50","Papel":"Fine Art Rag","Textura":"Lino"}');
      WHEN 14 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Impresión fotográfica 20x25 cm', 10, 45.00, 450.00, '{"Tamano":"20x25 cm","Papel":"Matte Premium","Tipo de Impresion":"Inkjet"}'),
          (_pedido_id, 'Impresión fotográfica 13x18 cm', 10, 22.00, 220.00, '{"Tamano":"13x18 cm","Papel":"RC Satinado","Tipo de Impresion":"Inkjet"}');
      WHEN 15 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Enmarcado Moldura Flotante', 1, 520.00, 520.00, '{"Marco":"Moldura Flotante","Color de Marco":"Madera Natural","Tamano":"40x60 cm"}'),
          (_pedido_id, 'Impresión fotográfica 40x60 cm', 1, 280.00, 280.00, '{"Tamano":"40x60 cm","Papel":"Fine Art Baryta"}');
      WHEN 16 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Álbum fotográfico 20x30 cm', 1, 380.00, 380.00, '{"Tamano":"20x30 cm","Cantidad de Hojas":"40","Papel":"Fine Art Rag"}'),
          (_pedido_id, 'Foto carnet', 2, 40.00, 80.00, '{"Tamano":"Carta","Papel":"RC Satinado"}');
    END CASE;

    -- Trayectoria de producción hasta el área actual
    CASE rec.i
      WHEN 1  THEN _path := ARRAY['mostrador'];
      WHEN 2  THEN _path := ARRAY['mostrador','diseno'];
      WHEN 3  THEN _path := ARRAY['mostrador','diseno','impresion'];
      WHEN 4  THEN _path := ARRAY['mostrador','diseno','impresion'];
      WHEN 5  THEN _path := ARRAY['mostrador','laminado'];
      WHEN 6  THEN _path := ARRAY['mostrador','diseno','impresion','laminado'];
      WHEN 7  THEN _path := ARRAY['mostrador','marcos','montaje'];
      WHEN 8  THEN _path := ARRAY['mostrador','books'];
      WHEN 9  THEN _path := ARRAY['mostrador','diseno','impresion','bastidores'];
      WHEN 10 THEN _path := ARRAY['mostrador','marcos'];
      WHEN 11 THEN _path := ARRAY['mostrador','laminado','montaje'];
      WHEN 12 THEN _path := ARRAY['mostrador','diseno','impresion','laminado','montaje','listo'];
      WHEN 13 THEN _path := ARRAY['mostrador','books','listo'];
      WHEN 14 THEN _path := ARRAY['mostrador','diseno','impresion','laminado','montaje','listo','entregado'];
      WHEN 15 THEN _path := ARRAY['mostrador','marcos','montaje','listo','entregado'];
      WHEN 16 THEN _path := ARRAY['mostrador'];
    END CASE;

    FOR j IN 1..array_length(_path, 1) LOOP
      _ts := _recep_ts + ((j - 1) * INTERVAL '6 hours');
      INSERT INTO pedido_movimientos (pedido_id, from_area, to_area, operador_id, created_at)
      VALUES (
        _pedido_id,
        CASE WHEN j = 1 THEN NULL ELSE _path[j - 1] END,
        _path[j],
        NULL,
        _ts
      );
    END LOOP;

  END LOOP;
END $$;
