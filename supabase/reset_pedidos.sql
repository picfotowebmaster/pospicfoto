-- =============================================
-- RESET DE PEDIDOS
-- Borra todos los pedidos y reinicia los folios.
-- Ejecutar en: SQL Editor de Supabase
-- https://supabase.com/dashboard/project/ofarxltreyfpxsbiafzs/sql/new
-- =============================================

DELETE FROM pedido_movimientos;
DELETE FROM detalle_pedidos;
DELETE FROM pedidos;
ALTER SEQUENCE pedido_global_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS factura_folio_seq RESTART WITH 1;
