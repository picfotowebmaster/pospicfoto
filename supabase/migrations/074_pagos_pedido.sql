-- =============================================
-- MIGRACIÓN 074: pagos divididos por pedido
-- Registra cada línea de pago (anticipo y saldo) para
-- permitir repartir un cobro entre varios métodos.
-- Las columnas agregadas de pedidos se conservan por
-- compatibilidad: metodo_pago / saldo_metodo_pago guardan
-- el método de mayor monto.
-- =============================================

CREATE TABLE IF NOT EXISTS public.pagos_pedido (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id   UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('anticipo', 'saldo')),
  metodo_pago TEXT NOT NULL CHECK (
    metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia', 'Depósito')
  ),
  monto       NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
  cobrado_por UUID REFERENCES public.profiles(id),
  cobrado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_pedido_pedido ON public.pagos_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pagos_pedido_tipo_metodo ON public.pagos_pedido(tipo, metodo_pago);

ALTER TABLE public.pagos_pedido ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagos_pedido_select" ON public.pagos_pedido;
CREATE POLICY "pagos_pedido_select" ON public.pagos_pedido
  FOR SELECT TO authenticated
  USING (public.puede_ver_pedido(pedido_id));

DROP POLICY IF EXISTS "pagos_pedido_insert" ON public.pagos_pedido;
CREATE POLICY "pagos_pedido_insert" ON public.pagos_pedido
  FOR INSERT TO authenticated
  WITH CHECK (
    public.rol_actual() IN ('mostrador', 'admin', 'superadmin')
    AND public.puede_ver_pedido(pedido_id)
  );

DROP POLICY IF EXISTS "pagos_pedido_delete" ON public.pagos_pedido;
CREATE POLICY "pagos_pedido_delete" ON public.pagos_pedido
  FOR DELETE TO authenticated
  USING (
    public.rol_actual() IN ('mostrador', 'admin', 'superadmin')
    AND public.puede_ver_pedido(pedido_id)
  );

GRANT SELECT, INSERT, DELETE ON public.pagos_pedido TO authenticated;

-- =============================================
-- Registro atómico del cobro de saldo dividido
-- =============================================
CREATE OR REPLACE FUNCTION public.registrar_pagos_saldo(
  p_pedido_id UUID,
  p_pagos JSONB,
  p_cobrado_por UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pedido public.pedidos%ROWTYPE;
  v_saldo NUMERIC(10,2);
  v_suma NUMERIC(10,2) := 0;
  v_item JSONB;
  v_metodo TEXT;
  v_monto NUMERIC(10,2);
  v_principal TEXT;
  v_mayor NUMERIC(10,2) := -1;
BEGIN
  SELECT * INTO v_pedido
  FROM public.pedidos
  WHERE id = p_pedido_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  IF NOT (
    public.puede_ver_pedido(p_pedido_id)
    AND public.rol_actual() IN ('mostrador', 'admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'No autorizado para cobrar este pedido';
  END IF;

  IF v_pedido.estado = 'cancelado' THEN
    RAISE EXCEPTION 'No se puede cobrar un pedido cancelado';
  END IF;

  IF COALESCE(v_pedido.saldo_cobrado, false) THEN
    RAISE EXCEPTION 'El saldo ya fue cobrado o el pedido no existe.';
  END IF;

  v_saldo := ROUND(
    GREATEST(0, COALESCE(v_pedido.total, 0) - COALESCE(v_pedido.anticipo, 0)),
    2
  );

  IF v_saldo <= 0 THEN
    RAISE EXCEPTION 'El pedido no tiene saldo pendiente';
  END IF;

  DELETE FROM public.pagos_pedido
  WHERE pedido_id = p_pedido_id AND tipo = 'saldo';

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_pagos, '[]'::jsonb))
  LOOP
    v_metodo := v_item->>'metodo';
    v_monto := ROUND(COALESCE((v_item->>'monto')::NUMERIC, 0), 2);

    IF v_metodo IS NULL OR v_monto <= 0 THEN
      CONTINUE;
    END IF;

    IF v_metodo NOT IN ('Efectivo', 'Tarjeta', 'Transferencia', 'Depósito') THEN
      RAISE EXCEPTION 'Método de pago inválido: %', v_metodo;
    END IF;

    v_suma := v_suma + v_monto;

    INSERT INTO public.pagos_pedido (
      pedido_id, tipo, metodo_pago, monto, cobrado_por, cobrado_en
    )
    VALUES (p_pedido_id, 'saldo', v_metodo, v_monto, p_cobrado_por, now());

    IF v_monto > v_mayor THEN
      v_mayor := v_monto;
      v_principal := v_metodo;
    END IF;
  END LOOP;

  IF v_suma = 0 THEN
    RAISE EXCEPTION 'Debes registrar al menos un pago';
  END IF;

  IF ROUND(v_suma, 2) <> v_saldo THEN
    RAISE EXCEPTION 'La suma de pagos (%) no coincide con el saldo (%)',
      ROUND(v_suma, 2), v_saldo;
  END IF;

  UPDATE public.pedidos
  SET saldo_cobrado = true,
      saldo_metodo_pago = v_principal,
      saldo_cobrado_en = now(),
      saldo_cobrado_por = p_cobrado_por,
      fecha_pago_total = now(),
      updated_at = now()
  WHERE id = p_pedido_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_pagos_saldo(UUID, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_pagos_saldo(UUID, JSONB, UUID) TO authenticated;

-- =============================================
-- Backfill de pedidos existentes
-- =============================================
INSERT INTO public.pagos_pedido (
  pedido_id, tipo, metodo_pago, monto, cobrado_por, cobrado_en
)
SELECT
  p.id,
  'anticipo',
  COALESCE(p.metodo_pago::TEXT, 'Efectivo'),
  p.anticipo,
  p.cajero_id,
  COALESCE(
    (p.fecha_recepcion::TEXT || 'T12:00:00-06:00')::TIMESTAMPTZ,
    p.created_at
  )
FROM public.pedidos p
WHERE COALESCE(p.anticipo, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.pagos_pedido pp
    WHERE pp.pedido_id = p.id AND pp.tipo = 'anticipo'
  );

INSERT INTO public.pagos_pedido (
  pedido_id, tipo, metodo_pago, monto, cobrado_por, cobrado_en
)
SELECT
  p.id,
  'saldo',
  COALESCE(p.saldo_metodo_pago, p.metodo_pago::TEXT, 'Efectivo'),
  ROUND(GREATEST(0, COALESCE(p.total, 0) - COALESCE(p.anticipo, 0)), 2),
  p.saldo_cobrado_por,
  COALESCE(p.saldo_cobrado_en, p.fecha_pago_total, now())
FROM public.pedidos p
WHERE COALESCE(p.saldo_cobrado, false)
  AND ROUND(GREATEST(0, COALESCE(p.total, 0) - COALESCE(p.anticipo, 0)), 2) > 0.01
  AND NOT EXISTS (
    SELECT 1 FROM public.pagos_pedido pp
    WHERE pp.pedido_id = p.id AND pp.tipo = 'saldo'
  );
