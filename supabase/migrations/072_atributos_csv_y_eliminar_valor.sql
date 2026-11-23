-- =============================================
-- MIGRACIÓN 072: atributos por CSV y borrado seguro de valores
-- =============================================

CREATE OR REPLACE FUNCTION public.eliminar_atributo_valor(p_valor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_precios INT;
  v_productos INT;
BEGIN
  IF p_valor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM atributo_valores WHERE id = p_valor_id
  ) THEN
    RAISE EXCEPTION 'El valor no existe';
  END IF;

  SELECT count(*) INTO v_precios
  FROM producto_precios
  WHERE valores_ids @> ARRAY[p_valor_id];

  IF v_precios > 0 THEN
    RAISE EXCEPTION
      'El valor está usado en % precio(s). Ajusta esos precios antes de eliminarlo.',
      v_precios;
  END IF;

  SELECT count(DISTINCT pa.producto_id) INTO v_productos
  FROM producto_atributo_valores pav
  JOIN producto_atributos pa ON pa.id = pav.producto_atributo_id
  WHERE pav.valor_id = p_valor_id;

  DELETE FROM atributo_valores WHERE id = p_valor_id;

  RETURN jsonb_build_object(
    'productos_desvinculados', v_productos,
    'precios_bloqueantes', 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_atributo_seguro(p_atributo_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_precios INT;
  v_productos INT;
BEGIN
  IF p_atributo_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM atributos WHERE id = p_atributo_id
  ) THEN
    RAISE EXCEPTION 'El atributo no existe';
  END IF;

  SELECT count(DISTINCT pp.id) INTO v_precios
  FROM producto_precios pp
  JOIN atributo_valores av ON av.id = ANY(pp.valores_ids)
  WHERE av.atributo_id = p_atributo_id;

  IF v_precios > 0 THEN
    RAISE EXCEPTION
      'El atributo está usado en % precio(s). Ajusta esos precios antes de eliminarlo.',
      v_precios;
  END IF;

  SELECT count(DISTINCT pa.producto_id) INTO v_productos
  FROM producto_atributos pa
  WHERE pa.atributo_id = p_atributo_id;

  DELETE FROM atributos WHERE id = p_atributo_id;

  RETURN jsonb_build_object(
    'productos_desvinculados', v_productos,
    'precios_bloqueantes', 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.importar_atributos_csv(p_atributos JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_atributo JSONB;
  v_nombre TEXT;
  v_atributo_id UUID;
  v_valor TEXT;
  v_insertados INT;
  v_atributos_creados INT := 0;
  v_valores_creados INT := 0;
BEGIN
  IF p_atributos IS NULL OR jsonb_typeof(p_atributos) <> 'array' THEN
    RAISE EXCEPTION 'Formato de atributos inválido';
  END IF;

  FOR v_atributo IN SELECT * FROM jsonb_array_elements(p_atributos)
  LOOP
    v_nombre := trim(v_atributo->>'nombre');
    IF v_nombre IS NULL OR v_nombre = '' THEN
      RAISE EXCEPTION 'Atributo sin nombre';
    END IF;

    INSERT INTO atributos (nombre)
    VALUES (v_nombre)
    ON CONFLICT (nombre) DO NOTHING;

    GET DIAGNOSTICS v_insertados = ROW_COUNT;
    v_atributos_creados := v_atributos_creados + v_insertados;

    SELECT id INTO v_atributo_id
    FROM atributos
    WHERE nombre = v_nombre;

    FOR v_valor IN
      SELECT DISTINCT trim(valor)
      FROM jsonb_array_elements_text(
        COALESCE(v_atributo->'valores', '[]'::jsonb)
      ) AS valor
      WHERE trim(valor) <> ''
    LOOP
      INSERT INTO atributo_valores (atributo_id, valor)
      VALUES (v_atributo_id, v_valor)
      ON CONFLICT (atributo_id, valor) DO NOTHING;

      GET DIAGNOSTICS v_insertados = ROW_COUNT;
      v_valores_creados := v_valores_creados + v_insertados;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'atributos_creados', v_atributos_creados,
    'valores_creados', v_valores_creados
  );
END;
$$;

REVOKE ALL ON FUNCTION public.eliminar_atributo_valor(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.eliminar_atributo_seguro(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.importar_atributos_csv(JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.eliminar_atributo_valor(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.eliminar_atributo_seguro(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.importar_atributos_csv(JSONB) TO service_role;
