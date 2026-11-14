-- =============================================
-- RESET DE PEDIDOS Y CLIENTES
-- Borra todos los datos transaccionales de prueba
-- y reinicia los consecutivos. Se conservan
-- usuarios/perfiles, catálogos, precios, sucursales,
-- marcas, entidades emisoras y push_subscriptions.
--
-- Ejecutar en: SQL Editor de Supabase
-- https://supabase.com/dashboard/project/ofarxltreyfpxsbiafzs/sql/new
--
-- ADVERTENCIA: operación irreversible. Respalda la
-- base antes de ejecutar (Database > Backups).
-- =============================================

BEGIN;

-- 1. Hijos de pedidos (ON DELETE CASCADE, explícito por claridad)
DELETE FROM pedido_comentarios;
DELETE FROM enlaces_compartidos;
DELETE FROM detalle_pedidos;
DELETE FROM pedido_movimientos;

-- 2. Pedidos y clientes
DELETE FROM pedidos;
DELETE FROM clientes;

-- 3. Facturación, correos y clientes fiscales (datos de prueba)
DELETE FROM facturas_globales;
DELETE FROM email_envios;
DELETE FROM email_eventos;
DELETE FROM clientes_fiscales;

-- 4. Fotos de pedidos en Storage.
-- Supabase bloquea el borrado directo desde storage.objects.
-- Para vaciar el bucket usa el script (Storage API):
--   node --env-file=.env.local scripts/limpiar-fotos-pedidos.mjs

-- 5. Reiniciar consecutivos de pedidos y facturas
ALTER SEQUENCE IF EXISTS pedido_global_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS factura_folio_seq RESTART WITH 1;
UPDATE folios_factura SET ultimo_folio = 0, updated_at = now();

COMMIT;

-- =============================================
-- Verificación (opcional)
-- =============================================
-- SELECT 'pedidos' t, count(*) FROM pedidos
-- UNION ALL SELECT 'clientes', count(*) FROM clientes
-- UNION ALL SELECT 'detalle_pedidos', count(*) FROM detalle_pedidos
-- UNION ALL SELECT 'pedido_movimientos', count(*) FROM pedido_movimientos
-- UNION ALL SELECT 'pedido_comentarios', count(*) FROM pedido_comentarios
-- UNION ALL SELECT 'enlaces_compartidos', count(*) FROM enlaces_compartidos
-- UNION ALL SELECT 'facturas_globales', count(*) FROM facturas_globales
-- UNION ALL SELECT 'clientes_fiscales', count(*) FROM clientes_fiscales
-- UNION ALL SELECT 'email_envios', count(*) FROM email_envios
-- UNION ALL SELECT 'email_eventos', count(*) FROM email_eventos;
