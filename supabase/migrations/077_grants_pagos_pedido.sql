-- =============================================
-- MIGRACIÓN 077: Permisos para service_role en pagos_pedido
-- La tabla se creó en la 074 solo con permisos para authenticated.
-- Las rutas admin (envío de ticket por correo y link público de ticket)
-- consultan pedidos embebiendo pagos_pedido(*), por lo que service_role
-- necesita SELECT o PostgREST responde "permission denied for table".
-- =============================================

GRANT SELECT ON public.pagos_pedido TO service_role;

-- Refresca el caché de PostgREST para la tabla.
NOTIFY pgrst, 'reload schema';
