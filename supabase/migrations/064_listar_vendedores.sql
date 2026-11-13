-- =============================================
-- MIGRACIÓN 064: Listado de vendedores con email
-- Evita ambigüedad entre usuarios con el mismo nombre.
-- =============================================

CREATE OR REPLACE FUNCTION public.listar_vendedores()
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  email TEXT,
  rol TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    p.id,
    COALESCE(NULLIF(trim(p.nombre), ''), u.email, 'Sin nombre')::text AS nombre,
    u.email::text AS email,
    p.rol::text AS rol
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY
    COALESCE(NULLIF(trim(p.nombre), ''), u.email, 'Sin nombre');
$$;

REVOKE ALL ON FUNCTION public.listar_vendedores() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_vendedores() TO authenticated;
