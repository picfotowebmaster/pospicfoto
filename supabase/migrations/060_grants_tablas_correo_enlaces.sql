-- =============================================
-- MIGRACIÓN 060: Permisos para service_role
-- Tablas nuevas creadas con RLS sin políticas públicas.
-- El acceso se hace exclusivamente con SUPABASE_SERVICE_ROLE_KEY.
-- =============================================

GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON TABLE enlaces_compartidos TO service_role;
GRANT ALL ON TABLE email_envios TO service_role;
GRANT ALL ON TABLE email_eventos TO service_role;

-- Refresca el caché de PostgREST para las nuevas tablas.
NOTIFY pgrst, 'reload schema';
