-- =============================================
-- PEDIDOS DE MUESTRA — PIC PHOTO / FRAMEX (10 pedidos)
-- Ejecutar en: SQL Editor de Supabase
-- Primero limpia datos existentes, reinicia secuencia, luego inserta 10
-- =============================================

DELETE FROM pedido_movimientos;
DELETE FROM detalle_pedidos;
DELETE FROM pedidos;
ALTER SEQUENCE pedido_global_seq RESTART WITH 1;

DO $$
DECLARE
  pal_id UUID; cub_id UUID;
  pic_id UUID; frx_id UUID;
  suc_ids UUID[]; suc_cods TEXT[];
  mar_ids UUID[]; mar_cods TEXT[];
  p RECORD;
  i INT;
  _estado TEXT;
  _area TEXT;
  _ruta TEXT;
  _cliente TEXT;
  _metodo TEXT;
  _total NUMERIC;
  _subtotal NUMERIC;
  _anticipo NUMERIC;
  _pedido_id UUID;
BEGIN
  SELECT id INTO pal_id FROM sucursales WHERE codigo = 'PAL';
  SELECT id INTO cub_id FROM sucursales WHERE codigo = 'CUB';
  SELECT id INTO pic_id FROM marcas WHERE codigo = 'PIC';
  SELECT id INTO frx_id FROM marcas WHERE codigo = 'FRX';

  suc_ids := ARRAY[pal_id, cub_id, pal_id, cub_id, pal_id, cub_id, pal_id, cub_id, pal_id, cub_id];
  suc_cods := ARRAY['PAL','CUB','PAL','CUB','PAL','CUB','PAL','CUB','PAL','CUB'];
  mar_ids  := ARRAY[pic_id, pic_id, frx_id, frx_id, pic_id, frx_id, pic_id, frx_id, frx_id, pic_id];
  mar_cods := ARRAY['PIC','PIC','FRX','FRX','PIC','FRX','PIC','FRX','FRX','PIC'];

  FOR i IN 1..10 LOOP
    CASE i
      WHEN 1 THEN _estado := 'pendiente'; _area := 'mostrador'; _ruta := 'R1';
      WHEN 2 THEN _estado := 'en_taller';  _area := 'diseno';    _ruta := 'R1';
      WHEN 3 THEN _estado := 'en_taller';  _area := 'impresion'; _ruta := 'R1';
      WHEN 4 THEN _estado := 'en_taller';  _area := 'marcos';    _ruta := 'R2';
      WHEN 5 THEN _estado := 'listo';      _area := 'listo';     _ruta := 'R3';
      WHEN 6 THEN _estado := 'en_corte';   _area := 'corte';     _ruta := 'R4';
      WHEN 7 THEN _estado := 'en_taller';  _area := 'laminado';  _ruta := 'R4';
      WHEN 8 THEN _estado := 'entregado';  _area := 'entregado'; _ruta := 'R1';
      WHEN 9 THEN _estado := 'listo';      _area := 'listo';     _ruta := 'R2';
      WHEN 10 THEN _estado := 'cancelado'; _area := 'mostrador'; _ruta := 'R3';
    END CASE;

    CASE (i % 3)
      WHEN 0 THEN _metodo := 'Efectivo';
      WHEN 1 THEN _metodo := 'Tarjeta';
      WHEN 2 THEN _metodo := 'Transferencia';
    END CASE;

    CASE i
      WHEN 1 THEN _cliente := 'María García López';    _subtotal := 290.00;
      WHEN 2 THEN _cliente := 'Juan Hernández Ruiz';    _subtotal := 1580.00;
      WHEN 3 THEN _cliente := 'Ana Martínez Díaz';      _subtotal := 950.00;
      WHEN 4 THEN _cliente := 'Carlos Sánchez Torres';  _subtotal := 1110.00;
      WHEN 5 THEN _cliente := 'Laura Ramírez Flores';   _subtotal := 460.00;
      WHEN 6 THEN _cliente := 'Pedro López Vega';       _subtotal := 720.00;
      WHEN 7 THEN _cliente := 'Sofía Mendoza Ortiz';    _subtotal := 1340.00;
      WHEN 8 THEN _cliente := 'Diego Castro Jiménez';   _subtotal := 380.00;
      WHEN 9 THEN _cliente := 'Valeria Ríos Nava';      _subtotal := 890.00;
      WHEN 10 THEN _cliente := 'Fernando Mora Cruz';    _subtotal := 2100.00;
    END CASE;

    _anticipo := ROUND(_subtotal * (CASE i % 3 WHEN 0 THEN 0.70 WHEN 1 THEN 1.00 WHEN 2 THEN 0.70 END)::NUMERIC, 2);
    _total := _subtotal;

    _pedido_id := gen_random_uuid();

    INSERT INTO pedidos (
      id, numero_pedido, sucursal_id, marca_id,
      cliente_nombre, cliente_telefono,
      fecha_recepcion, hora_recepcion,
      fecha_entrega, hora_entrega,
      requiere_correccion, estado, area_actual, ruta,
      subtotal, anticipo, total, metodo_pago
    ) VALUES (
      _pedido_id,
      generar_numero_pedido(mar_cods[i], suc_cods[i]),
      suc_ids[i], mar_ids[i],
      _cliente,
      '55' || (10000000 + i * 1111111)::TEXT,
      CURRENT_DATE - (i % 5),
      (LPAD(((8 + i) % 24)::TEXT, 2, '0') || ':30')::TIME,
      CURRENT_DATE + (i % 7) + 1,
      (LPAD(((8 + (i * 3) % 14))::TEXT, 2, '0') || ':00')::TIME,
      (i IN (2, 6)),
      _estado::estado_pedido_enum,
      _area,
      _ruta,
      _subtotal,
      _anticipo,
      _total,
      _metodo::metodo_pago_enum
    );

    CASE i
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
          (_pedido_id, 'Enmarcado Moldura 007', 2, 280.00, 560.00, '{"Marco":"Moldura 007","Color de Marco":"Dorado","Tamano":"30x40 cm"}'),
          (_pedido_id, 'Enmarcado Caja de Acrilico', 1, 550.00, 550.00, '{"Marco":"Caja de Acrilico","Tamano":"50x75 cm"}');
      WHEN 5 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Álbum fotográfico 20x30 cm', 1, 380.00, 380.00, '{"Tamano":"20x30 cm","Cantidad de Hojas":"40","Papel":"Fine Art Rag"}'),
          (_pedido_id, 'Foto carnet', 2, 40.00, 80.00, '{"Tamano":"Carta","Papel":"RC Satinado"}');
      WHEN 6 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Lámina fotográfica 40x50 cm', 3, 100.00, 300.00, '{"Tamano":"40x50 cm","Papel":"Lustre Premium","Tipo de Impresion":"Revelado Quimico"}'),
          (_pedido_id, 'Impresión fotográfica 30x45 cm', 2, 150.00, 300.00, '{"Tamano":"30x45 cm","Papel":"Fine Art Baryta"}'),
          (_pedido_id, 'Foto carnet', 3, 40.00, 120.00, '{"Tamano":"Infantil","Papel":"RC Satinado"}');
      WHEN 7 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Lienzo canvas 80x120 cm', 1, 850.00, 850.00, '{"Tamano":"80x120 cm","Tipo de Impresion":"Inkjet","Grosor":"5mm"}'),
          (_pedido_id, 'Impresión fotográfica 50x75 cm', 1, 350.00, 350.00, '{"Tamano":"50x75 cm","Papel":"Metallic Glossy"}'),
          (_pedido_id, 'Bastidor 30x40 cm', 1, 140.00, 140.00, '{"Tamano":"30x40 cm","Tipo de Bastidor":"Madera 2cm"}');
      WHEN 8 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Impresión fotográfica 20x25 cm', 5, 40.00, 200.00, '{"Tamano":"20x25 cm","Papel":"Lustre","Tipo de Impresion":"Inkjet"}'),
          (_pedido_id, 'Lámina fotográfica 13x18 cm', 4, 25.00, 100.00, '{"Tamano":"13x18 cm","Papel":"RC Satinado"}'),
          (_pedido_id, 'Impresión fotográfica 10x15 cm', 8, 10.00, 80.00, '{"Tamano":"10x15 cm","Papel":"Matte Premium"}');
      WHEN 9 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Enmarcado Marco Vintage', 1, 450.00, 450.00, '{"Marco":"Marco Vintage","Color de Marco":"Plata","Tamano":"50x70 cm","Vidrio":"Antirreflejante"}'),
          (_pedido_id, 'Enmarcado Moldura 007', 1, 280.00, 280.00, '{"Marco":"Moldura 007","Color de Marco":"Negro","Tamano":"30x40 cm"}'),
          (_pedido_id, 'Impresión fotográfica 30x40 cm', 1, 160.00, 160.00, '{"Tamano":"30x40 cm","Papel":"Fine Art Rag"}');
      WHEN 10 THEN
        INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos) VALUES
          (_pedido_id, 'Fotolienzo Fine Art 120x80 cm', 1, 1200.00, 1200.00, '{"Tamano":"120x80 cm","Papel":"Canvas Matte","Textura":"Lino","Correccion de Color":"Si"}'),
          (_pedido_id, 'Enmarcado Caja Profunda', 1, 650.00, 650.00, '{"Marco":"Caja Profunda","Color":"Blanco","Tamano":"120x80 cm","Vidrio":"Museo"}'),
          (_pedido_id, 'Impresión fotográfica 13x18 cm', 10, 25.00, 250.00, '{"Tamano":"13x18 cm","Papel":"RC Satinado"}');
    END CASE;

    -- Movimiento inicial para cada pedido
    INSERT INTO pedido_movimientos (pedido_id, from_area, to_area, created_at) VALUES
      (_pedido_id, NULL, _area, CURRENT_TIMESTAMP - (i || ' days')::INTERVAL);

  END LOOP;
END $$;
