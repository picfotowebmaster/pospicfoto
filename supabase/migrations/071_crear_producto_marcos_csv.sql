-- =============================================
-- MIGRACIÓN 071: alta transaccional de molduras desde CSV
-- Crea producto, atributos, valores, colores y precios en un solo commit.
-- Solo puede ejecutarla service_role (server action con admin/superadmin).
-- =============================================

CREATE OR REPLACE FUNCTION public.crear_producto_marcos_csv(
  p_categoria_id UUID,
  p_nombre TEXT,
  p_atributos_precio JSONB,
  p_atributo_color UUID,
  p_colores TEXT[],
  p_precios JSONB,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_producto_id UUID;
  v_orden INT;
  v_atributo JSONB;
  v_pa_id UUID;
  v_indice INT := 0;
  v_color TEXT;
  v_colores_antes INT;
  v_colores_despues INT;
  v_colores_creados INT;
  v_precios_creados INT := 0;
  v_precio JSONB;
  v_valores UUID[];
BEGIN
  IF p_categoria_id IS NULL OR p_nombre IS NULL OR trim(p_nombre) = '' THEN
    RAISE EXCEPTION 'Categoría o nombre inválido';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM categorias
    WHERE id = p_categoria_id
      AND lower(trim(nombre)) = 'marcos'
  ) THEN
    RAISE EXCEPTION 'Solo se pueden crear productos en la categoría Marcos';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM productos
    WHERE categoria_id = p_categoria_id
      AND lower(trim(nombre)) = lower(trim(p_nombre))
  ) THEN
    RAISE EXCEPTION 'El producto % ya existe', p_nombre;
  END IF;

  IF p_atributo_color IS NULL THEN
    RAISE EXCEPTION 'Falta el atributo Color marco';
  END IF;

  IF p_atributos_precio IS NULL OR jsonb_array_length(p_atributos_precio) = 0 THEN
    RAISE EXCEPTION 'Faltan atributos de precio';
  END IF;

  IF p_precios IS NULL OR jsonb_array_length(p_precios) = 0 THEN
    RAISE EXCEPTION 'Faltan precios';
  END IF;

  SELECT COALESCE(MAX(orden), -1) + 1
  INTO v_orden
  FROM productos
  WHERE categoria_id = p_categoria_id;

  INSERT INTO productos (categoria_id, nombre, ruta, orden, activo)
  VALUES (p_categoria_id, trim(p_nombre), 'R2', v_orden, true)
  RETURNING id INTO v_producto_id;

  FOR v_atributo IN SELECT * FROM jsonb_array_elements(p_atributos_precio)
  LOOP
    INSERT INTO producto_atributos (
      producto_id, atributo_id, orden, requerido, afecta_precio
    )
    VALUES (
      v_producto_id,
      (v_atributo->>'atributo_id')::UUID,
      v_indice,
      true,
      true
    )
    RETURNING id INTO v_pa_id;

    INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
    SELECT v_pa_id, valor::UUID, (ord - 1)::INT
    FROM jsonb_array_elements_text(v_atributo->'valores_ids')
      WITH ORDINALITY AS t(valor, ord);

    v_indice := v_indice + 1;
  END LOOP;

  INSERT INTO producto_atributos (
    producto_id, atributo_id, orden, requerido, afecta_precio
  )
  VALUES (v_producto_id, p_atributo_color, v_indice, true, false)
  RETURNING id INTO v_pa_id;

  SELECT count(*) INTO v_colores_antes
  FROM atributo_valores
  WHERE atributo_id = p_atributo_color;

  FOR v_color IN
    SELECT DISTINCT trim(color)
    FROM unnest(COALESCE(p_colores, ARRAY[]::TEXT[])) AS color
    WHERE trim(color) <> ''
    ORDER BY 1
  LOOP
    INSERT INTO atributo_valores (atributo_id, valor)
    VALUES (p_atributo_color, v_color)
    ON CONFLICT (atributo_id, valor) DO NOTHING;
  END LOOP;

  SELECT count(*) INTO v_colores_despues
  FROM atributo_valores
  WHERE atributo_id = p_atributo_color;

  v_colores_creados := v_colores_despues - v_colores_antes;

  INSERT INTO producto_atributo_valores (producto_atributo_id, valor_id, orden)
  SELECT v_pa_id, av.id, (agrupado.orden - 1)::INT
  FROM (
    SELECT trim(color) AS color, MIN(ord) AS orden
    FROM unnest(COALESCE(p_colores, ARRAY[]::TEXT[]))
      WITH ORDINALITY AS t(color, ord)
    WHERE trim(color) <> ''
    GROUP BY trim(color)
  ) AS agrupado
  JOIN atributo_valores av
    ON av.atributo_id = p_atributo_color
   AND av.valor = agrupado.color
  ON CONFLICT (producto_atributo_id, valor_id) DO NOTHING;

  PERFORM set_config('app.usuario_id', COALESCE(p_usuario_id::TEXT, ''), true);

  FOR v_precio IN SELECT * FROM jsonb_array_elements(p_precios)
  LOOP
    SELECT array_agg(valor::UUID ORDER BY valor::UUID)
    INTO v_valores
    FROM jsonb_array_elements_text(v_precio->'valores_ids') AS t(valor);

    IF v_valores IS NULL OR array_length(v_valores, 1) = 0 THEN
      RAISE EXCEPTION 'Variante sin valores';
    END IF;

    INSERT INTO producto_precios (
      producto_id, valores_ids, precio, activo, updated_at
    )
    VALUES (
      v_producto_id,
      v_valores,
      (v_precio->>'precio')::NUMERIC,
      true,
      now()
    );

    v_precios_creados := v_precios_creados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'producto_id', v_producto_id,
    'colores_creados', v_colores_creados,
    'precios_creados', v_precios_creados
  );
END;
$$;

REVOKE ALL ON FUNCTION public.crear_producto_marcos_csv(UUID, TEXT, JSONB, UUID, TEXT[], JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_producto_marcos_csv(UUID, TEXT, JSONB, UUID, TEXT[], JSONB, UUID) TO service_role;
