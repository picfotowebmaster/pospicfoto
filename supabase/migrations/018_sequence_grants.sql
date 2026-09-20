-- =============================================
-- MIGRACIÓN 018: Permisos USAGE en secuencias
-- Las funciones generar_numero_pedido() y generar_folio_factura()
-- son SECURITY INVOKER y usan nextval(), por lo que el rol que las
-- invoca (authenticated) necesita USAGE sobre la secuencia.
-- Sin esto falla con: "permission denied for sequence pedido_global_seq"
-- =============================================

GRANT USAGE ON SEQUENCE pedido_global_seq TO anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE factura_folio_seq TO anon, authenticated, service_role;
