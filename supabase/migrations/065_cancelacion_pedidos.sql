-- =============================================
-- MIGRACIÓN 065: Cancelación de ventas con auditoría
-- Cancelación por grupo (factura_numero) con motivo,
-- reembolso y protección contra updates directos.
-- =============================================

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT,
  ADD COLUMN IF NOT EXISTS cancelacion_notas TEXT,
  ADD COLUMN IF NOT EXISTS cancelado_por UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS cancelado_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reembolso_estado TEXT NOT NULL DEFAULT 'no_aplica',
  ADD COLUMN IF NOT EXISTS reembolso_monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reembolso_realizado_por UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reembolso_realizado_en TIMESTAMPTZ;

ALTER TABLE pedidos
  DROP CONSTRAINT IF EXISTS pedidos_reembolso_estado_check;

ALTER TABLE pedidos
  ADD CONSTRAINT pedidos_reembolso_estado_check
  CHECK (reembolso_estado IN ('no_aplica', 'pendiente', 'realizado'));

CREATE INDEX IF NOT EXISTS idx_pedidos_cancelado_por
  ON pedidos(cancelado_por)
  WHERE cancelado_por IS NOT NULL;

-- Impide cancelar un pedido con UPDATE directo sin pasar por cancelar_venta.
CREATE OR REPLACE FUNCTION public.proteger_cancelacion_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.estado = 'cancelado' AND OLD.estado IS DISTINCT FROM 'cancelado' THEN
    IF COALESCE(current_setting('app.cancelacion_autorizada', true), '') <> 'true' THEN
      RAISE EXCEPTION 'Usa el flujo de cancelación de venta';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_cancelacion_pedido ON pedidos;
CREATE TRIGGER trg_proteger_cancelacion_pedido
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_cancelacion_pedido();

-- Cancela todos los pedidos de una venta (mismo factura_numero/numero_pedido).
CREATE OR REPLACE FUNCTION public.cancelar_venta(
  p_pedido_id UUID,
  p_motivo TEXT,
  p_notas TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_rol TEXT;
  v_sucursal UUID;
  v_principal pedidos%ROWTYPE;
  v_clave TEXT;
  v_ids UUID[];
  v_pedido RECORD;
  v_motivo TEXT := NULLIF(trim(COALESCE(p_motivo, '')), '');
  v_notas TEXT := NULLIF(trim(COALESCE(p_notas, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF v_motivo IS NULL THEN
    RAISE EXCEPTION 'El motivo de cancelación es obligatorio';
  END IF;

  SELECT rol, sucursal_id INTO v_rol, v_sucursal
  FROM profiles
  WHERE id = v_uid;

  IF v_rol IS NULL OR v_rol NOT IN ('mostrador', 'admin', 'superadmin') THEN
    RAISE EXCEPTION 'No autorizado para cancelar ventas';
  END IF;

  SELECT * INTO v_principal FROM pedidos WHERE id = p_pedido_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  v_clave := COALESCE(
    NULLIF(v_principal.factura_numero, ''),
    NULLIF(v_principal.numero_pedido, ''),
    v_principal.id::text
  );

  v_ids := '{}';

  FOR v_pedido IN
    SELECT *
    FROM pedidos
    WHERE COALESCE(NULLIF(factura_numero, ''), NULLIF(numero_pedido, ''), id::text) = v_clave
    FOR UPDATE
  LOOP
    v_ids := array_append(v_ids, v_pedido.id);

    IF v_pedido.estado = 'cancelado' THEN
      RAISE EXCEPTION 'La venta ya está cancelada';
    END IF;

    IF (
      v_pedido.factura_uuid IS NOT NULL
      AND COALESCE(v_pedido.factura_estado, '') <> 'cancelada'
    ) OR v_pedido.factura_global_id IS NOT NULL THEN
      RAISE EXCEPTION 'La venta tiene CFDI vigente. Cancela la factura en Contabilidad primero';
    END IF;

    IF v_rol = 'mostrador' THEN
      IF v_pedido.estado <> 'pendiente' OR v_pedido.area_actual <> 'mostrador' THEN
        RAISE EXCEPTION 'Mostrador solo puede cancelar pedidos pendientes en mostrador';
      END IF;

      IF v_sucursal IS NOT NULL
        AND v_pedido.sucursal_id IS NOT NULL
        AND v_pedido.sucursal_id <> v_sucursal THEN
        RAISE EXCEPTION 'Solo puedes cancelar ventas de tu sucursal';
      END IF;
    ELSIF v_rol = 'admin' THEN
      IF v_pedido.estado = 'entregado' THEN
        RAISE EXCEPTION 'Solo superadmin puede cancelar pedidos entregados';
      END IF;
    END IF;
  END LOOP;

  IF array_length(v_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  PERFORM set_config('app.cancelacion_autorizada', 'true', true);

  UPDATE pedidos
  SET
    estado = 'cancelado',
    motivo_cancelacion = v_motivo,
    cancelacion_notas = v_notas,
    cancelado_por = v_uid,
    cancelado_en = now(),
    reembolso_monto = ROUND((
      COALESCE(anticipo, 0)
      + CASE
          WHEN COALESCE(saldo_cobrado, false)
            THEN GREATEST(COALESCE(total, 0) - COALESCE(anticipo, 0), 0)
          ELSE 0
        END
    )::numeric, 2),
    reembolso_estado = CASE
      WHEN (
        COALESCE(anticipo, 0)
        + CASE
            WHEN COALESCE(saldo_cobrado, false)
              THEN GREATEST(COALESCE(total, 0) - COALESCE(anticipo, 0), 0)
            ELSE 0
          END
      ) > 0 THEN 'pendiente'
      ELSE 'no_aplica'
    END
  WHERE id = ANY(v_ids);

  INSERT INTO pedido_movimientos (pedido_id, from_area, to_area, operador_id)
  SELECT id, area_actual, area_actual, v_uid
  FROM pedidos
  WHERE id = ANY(v_ids);

  RETURN jsonb_build_object(
    'cancelados', COALESCE(array_length(v_ids, 1), 0),
    'pedido_ids', to_jsonb(v_ids)
  );
END;
$$;

-- Marca el reembolso de una venta cancelada como realizado.
CREATE OR REPLACE FUNCTION public.registrar_reembolso(
  p_pedido_id UUID,
  p_notas TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_rol TEXT;
  v_principal pedidos%ROWTYPE;
  v_clave TEXT;
  v_ids UUID[];
  v_actualizados INT;
  v_notas TEXT := NULLIF(trim(COALESCE(p_notas, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT rol INTO v_rol FROM profiles WHERE id = v_uid;

  IF v_rol IS NULL OR v_rol NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'No autorizado para registrar reembolsos';
  END IF;

  SELECT * INTO v_principal FROM pedidos WHERE id = p_pedido_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;

  v_clave := COALESCE(
    NULLIF(v_principal.factura_numero, ''),
    NULLIF(v_principal.numero_pedido, ''),
    v_principal.id::text
  );

  SELECT array_agg(id) INTO v_ids
  FROM pedidos
  WHERE COALESCE(NULLIF(factura_numero, ''), NULLIF(numero_pedido, ''), id::text) = v_clave;

  UPDATE pedidos
  SET
    reembolso_estado = 'realizado',
    reembolso_realizado_por = v_uid,
    reembolso_realizado_en = now(),
    cancelacion_notas = COALESCE(v_notas, cancelacion_notas)
  WHERE id = ANY(v_ids)
    AND reembolso_estado = 'pendiente';

  GET DIAGNOSTICS v_actualizados = ROW_COUNT;

  IF v_actualizados = 0 THEN
    RAISE EXCEPTION 'La venta no tiene un reembolso pendiente';
  END IF;

  RETURN jsonb_build_object('actualizados', v_actualizados);
END;
$$;

REVOKE ALL ON FUNCTION public.cancelar_venta(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_reembolso(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancelar_venta(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_reembolso(UUID, TEXT) TO authenticated;
