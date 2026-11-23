-- =============================================
-- MIGRACIÓN 073: importar valores de un atributo existente
-- Solo agrega valores; no crea atributos ni borra valores.
-- =============================================

CREATE OR REPLACE FUNCTION public.importar_valores_atributo(
  p_atributo_id UUID,
  p_valores TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_valor TEXT;
  v_insertados INT;
  v_valores_creados INT := 0;
BEGIN
  IF p_atributo_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM atributos WHERE id = p_atributo_id
  ) THEN
    RAISE EXCEPTION 'El atributo no existe';
  END IF;

  IF p_valores IS NOT NULL THEN
    FOR v_valor IN
      SELECT DISTINCT trim(valor)
      FROM unnest(p_valores) AS valor
      WHERE trim(valor) <> ''
    LOOP
      INSERT INTO atributo_valores (atributo_id, valor)
      VALUES (p_atributo_id, v_valor)
      ON CONFLICT (atributo_id, valor) DO NOTHING;

      GET DIAGNOSTICS v_insertados = ROW_COUNT;
      v_valores_creados := v_valores_creados + v_insertados;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('valores_creados', v_valores_creados);
END;
$$;

REVOKE ALL ON FUNCTION public.importar_valores_atributo(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.importar_valores_atributo(UUID, TEXT[]) TO service_role;
