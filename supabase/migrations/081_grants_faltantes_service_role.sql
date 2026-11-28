-- =============================================
-- MIGRACIÓN 081: SELECT para service_role en tablas internas
-- Estas tablas existen pero no otorgaban privilegios a service_role,
-- por lo que cualquier lectura server-side devolvía 403
-- (permission denied for table). La app con rol authenticated no se ve
-- afectada; esto habilita lecturas admin/scripts con la service role key.
-- =============================================

GRANT SELECT ON public.push_subscriptions TO service_role;
GRANT SELECT ON public.cancelacion_intentos TO service_role;
GRANT SELECT ON public.pedido_movimientos TO service_role;
GRANT SELECT ON public.production_areas TO service_role;
GRANT SELECT ON public.workflow_routes TO service_role;

-- Refresca el caché de PostgREST para las tablas.
NOTIFY pgrst, 'reload schema';
