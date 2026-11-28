-- =============================================
-- MIGRACIÓN 079: backfill de pagos_pedido
-- El reporte contable detectó pedidos sin filas en pagos_pedido: su
-- anticipo/saldo se infiere de columnas agregadas (metodo_pago,
-- saldo_metodo_pago), lo que impide desglosar pagos divididos.
-- Este backfill es idempotente: solo inserta lo que falta.
-- =============================================

-- Anticipos faltantes
INSERT INTO public.pagos_pedido (
  pedido_id, tipo, metodo_pago, monto, cobrado_por, cobrado_en
)
SELECT
  p.id,
  'anticipo',
  CASE
    WHEN COALESCE(p.metodo_pago::TEXT, '') IN (
      'Efectivo', 'Tarjeta', 'Transferencia', 'Depósito'
    ) THEN p.metodo_pago::TEXT
    ELSE 'Efectivo'
  END,
  ROUND(COALESCE(p.anticipo, 0), 2),
  p.cajero_id,
  COALESCE(
    (p.fecha_recepcion::TEXT || 'T12:00:00-06:00')::TIMESTAMPTZ,
    p.created_at,
    now()
  )
FROM public.pedidos p
WHERE COALESCE(p.anticipo, 0) > 0.01
  AND p.estado IS DISTINCT FROM 'cancelado'
  AND NOT EXISTS (
    SELECT 1 FROM public.pagos_pedido pp
    WHERE pp.pedido_id = p.id AND pp.tipo = 'anticipo'
  );

-- Saldos faltantes (solo pedidos ya liquidados)
INSERT INTO public.pagos_pedido (
  pedido_id, tipo, metodo_pago, monto, cobrado_por, cobrado_en
)
SELECT
  p.id,
  'saldo',
  CASE
    WHEN COALESCE(p.saldo_metodo_pago, p.metodo_pago::TEXT, '') IN (
      'Efectivo', 'Tarjeta', 'Transferencia', 'Depósito'
    ) THEN COALESCE(p.saldo_metodo_pago, p.metodo_pago::TEXT)
    ELSE 'Efectivo'
  END,
  ROUND(GREATEST(0, COALESCE(p.total, 0) - COALESCE(p.anticipo, 0)), 2),
  p.saldo_cobrado_por,
  COALESCE(
    p.saldo_cobrado_en,
    p.fecha_pago_total,
    (p.fecha_recepcion::TEXT || 'T12:00:00-06:00')::TIMESTAMPTZ,
    now()
  )
FROM public.pedidos p
WHERE COALESCE(p.saldo_cobrado, FALSE)
  AND p.estado IS DISTINCT FROM 'cancelado'
  AND ROUND(GREATEST(0, COALESCE(p.total, 0) - COALESCE(p.anticipo, 0)), 2) > 0.01
  AND NOT EXISTS (
    SELECT 1 FROM public.pagos_pedido pp
    WHERE pp.pedido_id = p.id AND pp.tipo = 'saldo'
  );
