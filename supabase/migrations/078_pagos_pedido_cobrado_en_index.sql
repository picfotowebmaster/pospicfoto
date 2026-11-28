-- =============================================
-- MIGRACIÓN 078: índice por fecha de cobro en pagos_pedido
-- Los reportes contables ahora consultan pagos_pedido por cobrado_en
-- para incluir anticipos cobrados dentro del rango aunque la venta
-- (fecha_recepcion) haya sido en un periodo anterior.
-- =============================================

CREATE INDEX IF NOT EXISTS idx_pagos_pedido_cobrado_en
  ON public.pagos_pedido(cobrado_en);
