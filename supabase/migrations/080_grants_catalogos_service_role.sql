-- =============================================
-- MIGRACIÓN 080: SELECT para service_role en catálogos
-- Las rutas admin y scripts con SUPABASE_SERVICE_ROLE_KEY no podían
-- leer sucursales ni marcas (permission denied for table), a diferencia
-- de authenticated. Son catálogos de solo lectura.
-- =============================================

GRANT SELECT ON public.sucursales TO service_role;
GRANT SELECT ON public.marcas TO service_role;

NOTIFY pgrst, 'reload schema';
