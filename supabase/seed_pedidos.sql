-- =============================================
-- PEDIDOS DE MUESTRA — PIC PHOTO (5 pedidos)
-- Ejecutar en: SQL Editor de Supabase
-- Primero limpia datos existentes, luego inserta 5 nuevos
-- =============================================

-- Limpiar datos de prueba existentes
DELETE FROM pedido_movimientos;
DELETE FROM detalle_pedidos;
DELETE FROM pedidos;

-- =============================================
-- PEDIDO 1: Pendiente en mostrador, R1
-- =============================================
WITH p1 AS (
  INSERT INTO pedidos (id, cliente_nombre, cliente_telefono, fecha_entrega, hora_entrega, requiere_correccion, estado, subtotal, anticipo, total, metodo_pago, area_actual, ruta)
  VALUES (
    gen_random_uuid(),
    'María García López', '5512345678',
    CURRENT_DATE + 3, '15:30',
    false, 'pendiente',
    290.00, 203.00, 290.00, 'Efectivo',
    'mostrador', 'R1'
  )
  RETURNING id
)
INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos)
SELECT p1.id, v.producto, v.cant, v.prec, v.prec * v.cant, v.attr
FROM p1, (VALUES
  ('Impresión fotográfica 20x25 cm', 2, 45.00, '{"Tamano":"20x25 cm","Papel":"Matte Premium","Tipo de Impresion":"Inkjet"}'::JSONB),
  ('Impresión fotográfica 30x40 cm', 1, 120.00, '{"Tamano":"30x40 cm","Papel":"Lustre","Tipo de Impresion":"Inkjet"}'::JSONB),
  ('Impresión fotográfica 13x18 cm', 4, 25.00, '{"Tamano":"13x18 cm","Papel":"RC Satinado","Tipo de Impresion":"Inkjet"}'::JSONB)
) AS v(producto, cant, prec, attr);

-- =============================================
-- PEDIDO 2: En diseño (R1), requiere corrección
-- =============================================
WITH p2 AS (
  INSERT INTO pedidos (id, cliente_nombre, cliente_telefono, fecha_entrega, hora_entrega, requiere_correccion, estado, subtotal, anticipo, total, metodo_pago, area_actual, ruta)
  VALUES (
    gen_random_uuid(),
    'Juan Hernández Ruiz', '5523456789',
    CURRENT_DATE + 5, '11:00',
    true, 'en_taller',
    1580.00, 1106.00, 1580.00, 'Tarjeta',
    'diseno', 'R1'
  )
  RETURNING id
)
INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos)
SELECT p2.id, v.producto, v.cant, v.prec, v.prec * v.cant, v.attr
FROM p2, (VALUES
  ('Fotolienzo Fine Art', 1, 650.00, '{"Tamano":"60x90 cm","Papel":"Fine Art Canvas Matte","Textura":"Lino","Tipo de Impresion":"Revelado Quimico","Correccion de Color":"Si - Avanzada"}'::JSONB),
  ('Impresión en canvas 60x90 cm', 1, 700.00, '{"Tamano":"60x90 cm","Tipo de Impresion":"Inkjet","Grosor":"5mm"}'::JSONB),
  ('Enmarcado Marco Minimalista', 1, 230.00, '{"Marco":"Marco Minimalista","Color":"Negro"}'::JSONB)
) AS v(producto, cant, prec, attr);

-- =============================================
-- PEDIDO 3: En impresión (R1), destino laminado
-- =============================================
WITH p3 AS (
  INSERT INTO pedidos (id, cliente_nombre, cliente_telefono, fecha_entrega, hora_entrega, requiere_correccion, estado, subtotal, anticipo, total, metodo_pago, area_actual, ruta, area_destino)
  VALUES (
    gen_random_uuid(),
    'Ana Martínez Díaz', NULL,
    CURRENT_DATE + 4, '16:00',
    false, 'en_taller',
    950.00, 665.00, 950.00, 'Transferencia',
    'impresion', 'R1', 'laminado'
  )
  RETURNING id
)
INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos)
SELECT p3.id, v.producto, v.cant, v.prec, v.prec * v.cant, v.attr
FROM p3, (VALUES
  ('Impresión fotográfica 50x75 cm', 1, 350.00, '{"Tamano":"50x75 cm","Papel":"Metallic Glossy","Tipo de Impresion":"Laser","Textura":"Metalico","Color":"Color"}'::JSONB),
  ('Bastidor con impresión galería', 1, 480.00, '{"Tamano":"40x60 cm","Tipo de Bastidor":"Madera 4cm","Impresion Bastidor":"Si - Galeria"}'::JSONB),
  ('Impresión fotográfica 20x25 cm', 2, 60.00, '{"Tamano":"20x25 cm","Papel":"Matte Premium","Tipo de Impresion":"Inkjet","Color":"ByN"}'::JSONB)
) AS v(producto, cant, prec, attr);

-- =============================================
-- PEDIDO 4: En marcos (R2)
-- =============================================
WITH p4 AS (
  INSERT INTO pedidos (id, cliente_nombre, cliente_telefono, fecha_entrega, hora_entrega, requiere_correccion, estado, subtotal, anticipo, total, metodo_pago, area_actual, ruta)
  VALUES (
    gen_random_uuid(),
    'Carlos Sánchez Torres', '5534567890',
    CURRENT_DATE + 2, '09:00',
    false, 'en_taller',
    1110.00, 1110.00, 1110.00, 'Efectivo',
    'marcos', 'R2'
  )
  RETURNING id
)
INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos)
SELECT p4.id, v.producto, v.cant, v.prec, v.prec * v.cant, v.attr
FROM p4, (VALUES
  ('Enmarcado Moldura 007', 2, 280.00, '{"Marco":"Moldura 007","Color de Marco":"Dorado","Tamano":"30x40 cm"}'::JSONB),
  ('Enmarcado Caja de Acrilico', 1, 550.00, '{"Marco":"Caja de Acrilico","Tamano":"50x75 cm"}'::JSONB)
) AS v(producto, cant, prec, attr);

-- =============================================
-- PEDIDO 5: Listo para entregar (R3, Books)
-- =============================================
WITH p5 AS (
  INSERT INTO pedidos (id, cliente_nombre, cliente_telefono, fecha_entrega, hora_entrega, requiere_correccion, estado, subtotal, anticipo, total, metodo_pago, area_actual, ruta)
  VALUES (
    gen_random_uuid(),
    'Laura Ramírez Flores', NULL,
    CURRENT_DATE + 1, '17:00',
    false, 'listo',
    460.00, 460.00, 460.00, 'Tarjeta',
    'listo', 'R3'
  )
  RETURNING id
)
INSERT INTO detalle_pedidos (pedido_id, producto_nombre, cantidad, precio_unitario, importe_linea, atributos)
SELECT p5.id, v.producto, v.cant, v.prec, v.prec * v.cant, v.attr
FROM p5, (VALUES
  ('Álbum fotográfico 20x30 cm', 1, 380.00, '{"Tamano":"20x30 cm","Cantidad de Hojas":"40","Papel":"Fine Art Rag","Color":"Original","Tipo de Impresion":"Offset"}'::JSONB),
  ('Foto carnet', 2, 40.00, '{"Tamano":"Carta","Papel":"RC Satinado","Cantidad de Hojas":"10","Tipo de Impresion":"Inkjet"}'::JSONB)
) AS v(producto, cant, prec, attr);
