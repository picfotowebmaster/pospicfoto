-- =============================================
-- ⚠️  ALERTA — SCRIPT DESTRUCTIVO — SOLO DESARROLLO  ⚠️
-- =============================================
-- NO EJECUTAR en producción ni sobre datos reales.
-- Requiere una ORDEN ESCRITA Y EXPLÍCITA DEL CLIENTE.
--
-- Este script BORRA pedidos, clientes, facturación y correos:
-- pedido_comentarios, enlaces_compartidos, detalle_pedidos,
-- pedido_movimientos, pedidos, clientes, facturas_globales,
-- email_envios, email_eventos y clientes_fiscales.
-- También reinicia los consecutivos de pedidos y facturas.
--
-- Se conservan usuarios/perfiles, catálogos, precios,
-- sucursales, marcas, entidades emisoras y push_subscriptions.
--
-- ANTES DE EJECUTAR:
--   1. Confirma que existe autorización escrita del cliente.
--   2. Respalda la base (Dashboard → Database → Backups).
--   3. Descomenta la línea SET de abajo y ejecuta todo junto.
--
-- SET app.allow_destructive_dev = 'true';
-- =============================================

DO $$
BEGIN
  IF current_setting('app.allow_destructive_dev', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION
      'RESET BLOQUEADO: script destructivo. Requiere orden escrita del cliente y ejecutar antes: SET app.allow_destructive_dev = ''true'';';
  END IF;
END $$;

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
DO $$
BEGIN
  IF to_regclass('public.folios_correlativos') IS NOT NULL THEN
    DELETE FROM public.folios_correlativos;
  END IF;
END $$;
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
