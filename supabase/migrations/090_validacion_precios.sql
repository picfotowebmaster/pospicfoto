-- =============================================
-- MIGRACIÓN 090: Precio actual para validación (solo lectura)
-- Permite al cliente confirmar que el precio de lista de una línea
-- sigue siendo el mismo antes de crear el pedido.
-- NO modifica datos.
-- =============================================

CREATE OR REPLACE FUNCTION public.precio_actual(
  p_producto_id UUID,
  p_valores_ids UUID[]
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH objetivo AS (
    SELECT ARRAY(
      SELECT DISTINCT v
      FROM unnest(COALESCE(p_valores_ids, ARRAY[]::UUID[])) AS v
      ORDER BY v
    ) AS ids
  )
  SELECT pp.precio
  FROM public.producto_precios pp
  CROSS JOIN objetivo o
  WHERE pp.producto_id = p_producto_id
    AND pp.activo = true
    AND ARRAY(
      SELECT DISTINCT v
      FROM unnest(pp.valores_ids) AS v
      ORDER BY v
    ) = o.ids
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.precio_actual(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.precio_actual(UUID, UUID[])
  TO authenticated, service_role;
