-- =============================================
-- MIGRACIÓN 068: Solo admin/superadmin cancela ventas
-- Mostrador puede solicitar la cancelación, pero debe
-- ser autorizada por un administrador a través del API.
-- =============================================

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

  SELECT rol INTO v_rol
  FROM profiles
  WHERE id = v_uid;

  IF v_rol IS NULL OR v_rol NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Solo un administrador puede cancelar ventas';
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

    IF v_rol = 'admin' AND v_pedido.estado = 'entregado' THEN
      RAISE EXCEPTION 'Solo superadmin puede cancelar pedidos entregados';
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

REVOKE ALL ON FUNCTION public.cancelar_venta(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancelar_venta(UUID, TEXT, TEXT) TO authenticated;
