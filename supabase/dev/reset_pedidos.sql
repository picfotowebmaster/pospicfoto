-- =============================================
-- ⚠️  ALERTA — SCRIPT DESTRUCTIVO — SOLO DESARROLLO  ⚠️
-- =============================================
-- NO EJECUTAR en producción ni sobre datos reales.
-- Requiere una ORDEN ESCRITA Y EXPLÍCITA DEL CLIENTE.
--
-- Este script BORRA TODOS los pedidos y su historial:
-- detalle_pedidos, pedido_movimientos, pedidos y sus hijos
-- por cascada (pagos, comentarios, enlaces compartidos).
-- También reinicia los folios de pedido.
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

DELETE FROM pedido_movimientos;
DELETE FROM detalle_pedidos;
DELETE FROM pedidos;

DO $$
BEGIN
  IF to_regclass('public.folios_correlativos') IS NOT NULL THEN
    DELETE FROM public.folios_correlativos;
  END IF;
END $$;

ALTER SEQUENCE IF EXISTS factura_folio_seq RESTART WITH 1;

COMMIT;
