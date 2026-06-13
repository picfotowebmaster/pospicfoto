-- =============================================
-- PEDIDOS DE MUESTRA — PIC PHOTO
-- ~30 pedidos con variedad en:
--    Método de pago (Efectivo/Tarjeta/Transferencia)
--    Anticipo (0% / 70% / 100%)
--    Fecha de entrega (hasta 7 días)
--    Estado (pendiente → entregado)
--
-- Ejecutar en: SQL Editor de Supabase
-- Idempotente: no borra datos existentes
-- =============================================

DO $$
DECLARE
    pedido_id UUID;
    sub NUMERIC(10,2);
    anti NUMERIC(10,2);
    i INT;
    j INT;
    num_lineas INT;
    prod_idx INT;
    cant INT;
    prec NUMERIC(10,2);
    dias_entrega INT;

    productos_def TEXT[] := ARRAY[
        'Impresión fotográfica 13x18 cm',
        'Impresión fotográfica 20x25 cm',
        'Impresión fotográfica 28x36 cm',
        'Impresión fotográfica 30x40 cm',
        'Impresión fotográfica 50x75 cm',
        'Impresión fotográfica 60x90 cm',
        'Impresión en canvas 40x60 cm',
        'Impresión en canvas 60x90 cm',
        'Enmarcado Moldura 007',
        'Enmarcado Marco Minimalista',
        'Enmarcado Caja de Acrílico',
        'Impresión vinil adhesivo',
        'Rollo fotográfico 24"',
        'Bastidor con impresión galería',
        'Revelado químico 35mm',
        'Fotolienzo Fine Art',
        'Foto carnet',
        'Restauración digital',
        'Álbum fotográfico 20x30 cm'
    ];
    precios_def NUMERIC[] := ARRAY[
        25.00, 45.00, 80.00, 120.00, 350.00, 500.00,
        450.00, 700.00, 280.00, 350.00, 550.00,
        180.00, 320.00, 480.00, 150.00, 650.00,
        80.00, 200.00, 380.00
    ];
    clientes TEXT[] := ARRAY[
        'María García López', 'Juan Hernández Ruiz', 'Ana Martínez Díaz',
        'Carlos Sánchez Torres', 'Laura Ramírez Flores', 'Pedro González Vargas',
        'Sofía Jiménez Cruz', 'Miguel Ángel Torres Reyes', 'Fernanda Castillo Moreno',
        'Alejandro Romero Herrera', 'Isabel Núñez Medina', 'Ricardo Mendoza Ortiz',
        'Gabriela Silva Campos', 'Javier Ortega Paredes', 'Daniela Ríos Navarro',
        'Luis Ángel Domínguez', 'Paola Vázquez Luna', 'Emilio Guzmán Rojas',
        'Andrea Morales Vega', 'Diego Contreras Peña', 'Valentina Rivas Aguilar',
        'Eduardo Campos Fuentes', 'Carmen Delgado Franco', 'Santiago Reyes Juárez',
        'Lucía Vargas Soto', 'Felipe Estrada Acosta', 'Mariana Ponce Lara',
        'Héctor Cárdenas Valle', 'Adriana Rosales Méndez', 'Oscar Villanueva Gil'
    ];
    telefonos TEXT[] := ARRAY[
        '5512345678', NULL, '5523456789', '5534567890', NULL,
        '5545678901', NULL, '5556789012', '5567890123', NULL,
        '5578901234', '5589012345', NULL, '5590123456', NULL,
        '5511122233', NULL, '5522233344', NULL, '5533344455',
        '5544455566', NULL, '5555566677', '5566677788', NULL,
        NULL, '5577788899', NULL, '5588899900', '5599900011'
    ];
    correcciones BOOLEAN[] := ARRAY[
        FALSE, FALSE, TRUE, FALSE, FALSE,
        TRUE, FALSE, FALSE, FALSE, TRUE,
        FALSE, FALSE, FALSE, TRUE, FALSE,
        FALSE, TRUE, FALSE, FALSE, FALSE,
        FALSE, TRUE, FALSE, FALSE, TRUE,
        FALSE, FALSE, FALSE, TRUE, FALSE
    ];
    horas TIME[] := ARRAY[
        '09:00','09:30','10:00','10:30','11:00','11:30',
        '12:00','12:30','13:00','13:30','14:00','14:30',
        '15:00','15:30','16:00','16:30','17:00','17:30',
        '18:00','18:30','19:00','19:30','10:15','11:15',
        '12:15','13:15','14:15','15:15','16:15','17:15'
    ];
    metodos metodo_pago_enum[] := ARRAY['Efectivo', 'Tarjeta', 'Transferencia'];
    estados estado_pedido_enum[] := ARRAY['pendiente', 'en_taller', 'en_corte', 'listo', 'entregado'];
    antic_pos INT[] := ARRAY[0, 70, 100];

    prod_indices INT[];
    cantidades INT[];
BEGIN
    RAISE NOTICE 'Insertando 30 pedidos de muestra...';

    FOR i IN 1..30 LOOP
        num_lineas := 2 + floor(random() * 4)::INT;

        sub := 0;
        prod_indices := ARRAY[]::INT[];
        cantidades := ARRAY[]::INT[];

        FOR j IN 1..num_lineas LOOP
            prod_idx := 1 + floor(random() * array_length(productos_def, 1))::INT;
            cant := 1 + floor(random() * 3)::INT;
            prec := precios_def[prod_idx];
            sub := sub + (prec * cant);
            prod_indices := array_append(prod_indices, prod_idx);
            cantidades := array_append(cantidades, cant);
        END LOOP;

        dias_entrega := floor(random() * 8)::INT;
        pedido_id := gen_random_uuid();
        anti := round((sub * antic_pos[1 + (i % 3)]) / 100, 2);

        INSERT INTO pedidos (
            id, cliente_nombre, cliente_telefono,
            fecha_entrega, hora_entrega,
            requiere_correccion, estado,
            subtotal, anticipo, total, metodo_pago
        ) VALUES (
            pedido_id,
            clientes[i],
            telefonos[i],
            CURRENT_DATE + (dias_entrega || ' days')::INTERVAL,
            horas[i],
            correcciones[i],
            estados[1 + (i % 5)],
            sub,
            anti,
            sub,
            metodos[1 + (i % 3)]
        );

        FOR j IN 1..num_lineas LOOP
            prec := precios_def[prod_indices[j]];
            INSERT INTO detalle_pedidos (
                pedido_id, producto_nombre,
                cantidad, precio_unitario, importe_linea, atributos
            ) VALUES (
                pedido_id,
                productos_def[prod_indices[j]],
                cantidades[j],
                prec,
                prec * cantidades[j],
                '{}'::JSONB
            );
        END LOOP;

    END LOOP;

    RAISE NOTICE 'Pedidos de muestra insertados correctamente.';
END;
$$;
