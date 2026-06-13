-- =============================================
-- GRANTS — Permisos base para roles
-- Las políticas RLS requieren estos GRANTs para
-- que Postgres permita consultar las tablas.
-- =============================================
-- Ejecutar una sola vez en: SQL Editor de Supabase
-- https://supabase.com/dashboard/project/ofarxltreyfpxsbiafzs/sql/new
-- =============================================

-- Pedidos
GRANT SELECT, INSERT, UPDATE ON public.pedidos TO authenticated;

-- Detalle de pedidos
GRANT SELECT, INSERT ON public.detalle_pedidos TO authenticated;

-- Catálogos
GRANT SELECT ON public.atributos TO authenticated;
GRANT SELECT ON public.atributo_valores TO authenticated;

-- Historial de productos
GRANT SELECT, INSERT, UPDATE ON public.productos_historial TO authenticated;

-- Perfiles de usuario
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
