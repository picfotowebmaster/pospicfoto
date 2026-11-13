-- =============================================
-- MIGRACIÓN 066: Pedidos y reportes por sucursal
-- Mostrador solo puede leer pedidos de su sucursal.
-- =============================================

CREATE OR REPLACE FUNCTION public.rol_actual()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT rol::text FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.sucursal_actual()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT sucursal_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.puede_ver_sucursal(p_sucursal_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.rol_actual() IN (
      'admin', 'superadmin', 'contador',
      'diseno', 'impresion', 'laminado', 'montaje',
      'books', 'bastidores', 'marcos', 'taller', 'corte'
    )
    OR (
      public.rol_actual() = 'mostrador'
      AND public.sucursal_actual() IS NOT NULL
      AND p_sucursal_id = public.sucursal_actual()
    );
$$;

CREATE OR REPLACE FUNCTION public.puede_ver_pedido(p_pedido_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pedidos p
    WHERE p.id = p_pedido_id
      AND public.puede_ver_sucursal(p.sucursal_id)
  );
$$;

REVOKE ALL ON FUNCTION public.rol_actual() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sucursal_actual() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.puede_ver_sucursal(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.puede_ver_pedido(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rol_actual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sucursal_actual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.puede_ver_sucursal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.puede_ver_pedido(UUID) TO authenticated;

-- =============================================
-- Políticas SELECT por sucursal
-- =============================================

DROP POLICY IF EXISTS "Pedidos legibles por autenticados" ON pedidos;
CREATE POLICY "Pedidos legibles por rol o sucursal" ON pedidos
  FOR SELECT TO authenticated
  USING (public.puede_ver_sucursal(pedidos.sucursal_id));

DROP POLICY IF EXISTS "Detalle pedidos legibles por autenticados" ON detalle_pedidos;
CREATE POLICY "Detalle pedidos legibles por sucursal" ON detalle_pedidos
  FOR SELECT TO authenticated
  USING (public.puede_ver_pedido(detalle_pedidos.pedido_id));

DROP POLICY IF EXISTS "Movimientos legibles por autenticados" ON pedido_movimientos;
CREATE POLICY "Movimientos legibles por sucursal" ON pedido_movimientos
  FOR SELECT TO authenticated
  USING (public.puede_ver_pedido(pedido_movimientos.pedido_id));

DROP POLICY IF EXISTS "Comentarios legibles por autenticados" ON pedido_comentarios;
CREATE POLICY "Comentarios legibles por sucursal" ON pedido_comentarios
  FOR SELECT TO authenticated
  USING (public.puede_ver_pedido(pedido_comentarios.pedido_id));

-- =============================================
-- UPDATE: mostrador solo pedidos de su sucursal
-- =============================================

DROP POLICY IF EXISTS "Pedidos actualizables por produccion/admin" ON pedidos;
CREATE POLICY "Pedidos actualizables por produccion/admin" ON pedidos
  FOR UPDATE TO authenticated
  USING (
    public.rol_actual() IN ('taller', 'corte', 'admin', 'superadmin')
    OR (
      public.rol_actual() = 'mostrador'
      AND public.sucursal_actual() IS NOT NULL
      AND pedidos.sucursal_id = public.sucursal_actual()
    )
  );

-- =============================================
-- Cancelación: exigir sucursal válida para mostrador
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
      IF v_sucursal IS NULL
        OR v_pedido.sucursal_id IS NULL
        OR v_pedido.sucursal_id <> v_sucursal THEN
        RAISE EXCEPTION 'Solo puedes cancelar ventas de tu sucursal';
      END IF;

      IF v_pedido.estado <> 'pendiente' OR v_pedido.area_actual <> 'mostrador' THEN
        RAISE EXCEPTION 'Mostrador solo puede cancelar pedidos pendientes en mostrador';
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

REVOKE ALL ON FUNCTION public.cancelar_venta(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancelar_venta(UUID, TEXT, TEXT) TO authenticated;

-- =============================================
-- Vendedores filtrados por sucursal
-- =============================================

DROP FUNCTION IF EXISTS public.listar_vendedores();

CREATE OR REPLACE FUNCTION public.listar_vendedores(
  p_sucursal_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  email TEXT,
  rol TEXT,
  sucursal_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_rol TEXT;
  v_sucursal UUID;
  v_filtro_sucursal UUID := p_sucursal_id;
BEGIN
  SELECT p.rol::text, p.sucursal_id
  INTO v_rol, v_sucursal
  FROM profiles p
  WHERE p.id = auth.uid();

  IF v_rol = 'mostrador' THEN
    v_filtro_sucursal := v_sucursal;
  END IF;

  RETURN QUERY
    SELECT
      p.id,
      COALESCE(NULLIF(trim(p.nombre), ''), u.email, 'Sin nombre')::text AS nombre,
      u.email::text AS email,
      p.rol::text AS rol,
      p.sucursal_id
    FROM profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE v_filtro_sucursal IS NULL OR p.sucursal_id = v_filtro_sucursal
    ORDER BY
      COALESCE(NULLIF(trim(p.nombre), ''), u.email, 'Sin nombre');
END;
$$;

REVOKE ALL ON FUNCTION public.listar_vendedores(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_vendedores(UUID) TO authenticated;
