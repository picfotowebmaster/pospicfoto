-- =============================================
-- MIGRACIÓN 053: Diagnóstico e integridad de precios por variante
--   - Vista de cobertura: combinaciones esperadas vs precios activos.
--   - Vista de filas de precio inválidas u huérfanas.
--   - Función manual de limpieza (SECURITY DEFINER, solo service_role).
-- No borra datos automáticamente.
-- =============================================

CREATE OR REPLACE VIEW public.producto_precios_diagnostico AS
WITH dimensiones AS (
  SELECT
    pa.producto_id,
    count(*)::int AS dimensiones,
    bool_or(COALESCE(v.n, 0) = 0) AS dimension_vacia
  FROM producto_atributos pa
  LEFT JOIN LATERAL (
    SELECT count(*) AS n
    FROM producto_atributo_valores pav
    WHERE pav.producto_atributo_id = pa.id
  ) v ON true
  WHERE pa.afecta_precio
  GROUP BY pa.producto_id
),
esperadas AS (
  SELECT
    pa.producto_id,
    exp(sum(ln(GREATEST(COALESCE(v.n, 0), 1)::numeric)))::bigint AS esperadas
  FROM producto_atributos pa
  LEFT JOIN LATERAL (
    SELECT count(*) AS n
    FROM producto_atributo_valores pav
    WHERE pav.producto_atributo_id = pa.id
  ) v ON true
  WHERE pa.afecta_precio
  GROUP BY pa.producto_id
),
activas AS (
  SELECT producto_id, count(*)::int AS activas
  FROM producto_precios
  WHERE activo
  GROUP BY producto_id
)
SELECT
  p.id AS producto_id,
  p.nombre,
  COALESCE(d.dimensiones, 0) AS dimensiones_precio,
  COALESCE(e.esperadas, 1) AS combinaciones_esperadas,
  COALESCE(a.activas, 0) AS precios_activos,
  GREATEST(COALESCE(e.esperadas, 1) - COALESCE(a.activas, 0), 0) AS faltantes,
  COALESCE(d.dimension_vacia, false) AS tiene_dimension_sin_valores,
  EXISTS (
    SELECT 1
    FROM producto_atributos pa
    JOIN atributos a ON a.id = pa.atributo_id
    WHERE pa.producto_id = p.id
      AND pa.afecta_precio
      AND NOT a.activo
  ) AS tiene_atributo_inactivo
FROM productos p
LEFT JOIN dimensiones d ON d.producto_id = p.id
LEFT JOIN esperadas e ON e.producto_id = p.id
LEFT JOIN activas a ON a.producto_id = p.id
WHERE p.activo;

GRANT SELECT ON public.producto_precios_diagnostico TO authenticated, service_role;

CREATE OR REPLACE VIEW public.producto_precios_invalidos AS
SELECT
  pp.id,
  pp.producto_id,
  p.nombre,
  pp.valores_ids,
  pp.precio,
  pp.activo,
  (
    SELECT count(*)
    FROM producto_atributos pa
    WHERE pa.producto_id = pp.producto_id AND pa.afecta_precio
  )::int AS dimensiones_precio
FROM producto_precios pp
JOIN productos p ON p.id = pp.producto_id
WHERE EXISTS (
    SELECT 1
    FROM producto_atributos pa
    WHERE pa.producto_id = pp.producto_id AND pa.afecta_precio
  )
  AND (
    cardinality(pp.valores_ids) <> (
      SELECT count(*)
      FROM producto_atributos pa
      WHERE pa.producto_id = pp.producto_id AND pa.afecta_precio
    )
    OR EXISTS (
      SELECT 1
      FROM unnest(pp.valores_ids) v(valor_id)
      WHERE NOT EXISTS (
        SELECT 1
        FROM producto_atributos pa
        JOIN producto_atributo_valores pav
          ON pav.producto_atributo_id = pa.id
        WHERE pa.producto_id = pp.producto_id
          AND pa.afecta_precio
          AND pav.valor_id = v.valor_id
      )
    )
  );

GRANT SELECT ON public.producto_precios_invalidos TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.limpiar_precios_invalidos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eliminados integer;
BEGIN
  DELETE FROM producto_precios pp
  WHERE EXISTS (
      SELECT 1
      FROM producto_atributos pa
      WHERE pa.producto_id = pp.producto_id AND pa.afecta_precio
    )
    AND (
      cardinality(pp.valores_ids) <> (
        SELECT count(*)
        FROM producto_atributos pa
        WHERE pa.producto_id = pp.producto_id AND pa.afecta_precio
      )
      OR EXISTS (
        SELECT 1
        FROM unnest(pp.valores_ids) v(valor_id)
        WHERE NOT EXISTS (
          SELECT 1
          FROM producto_atributos pa
          JOIN producto_atributo_valores pav
            ON pav.producto_atributo_id = pa.id
          WHERE pa.producto_id = pp.producto_id
            AND pa.afecta_precio
            AND pav.valor_id = v.valor_id
        )
      )
    );

  GET DIAGNOSTICS v_eliminados = ROW_COUNT;
  RETURN v_eliminados;
END;
$$;

REVOKE ALL ON FUNCTION public.limpiar_precios_invalidos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.limpiar_precios_invalidos() TO service_role;
