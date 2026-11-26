-- =============================================
-- MIGRACIÓN 083: endurecimiento de gastos de caja
--   1. La anulación solo puede tocar columnas de anulación y pasa por RPC.
--   2. Se revoca UPDATE directo para evitar alterar monto/concepto/fecha.
--   3. Trigger de inmutabilidad como defensa en profundidad.
--   4. RPC para calcular el efectivo cobrado de caja a nivel sucursal
--      (independiente del filtro por marca del corte).
-- =============================================

-- =============================================
-- 1. Anulación segura (idempotente, con auditoría)
-- =============================================
CREATE OR REPLACE FUNCTION public.anular_gasto_caja(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_gasto public.gastos_caja%ROWTYPE;
BEGIN
  IF public.rol_actual() NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'No autorizado para anular gastos';
  END IF;

  SELECT * INTO v_gasto
  FROM public.gastos_caja
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gasto no encontrado';
  END IF;

  -- Idempotente: si ya está anulado, no hace nada.
  IF v_gasto.anulado THEN
    RETURN;
  END IF;

  UPDATE public.gastos_caja
  SET anulado = true,
      anulado_por = auth.uid(),
      anulado_en = now()
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.anular_gasto_caja(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anular_gasto_caja(UUID) TO authenticated;

-- =============================================
-- 2. Sin UPDATE directo: la anulación pasa solo por la RPC
-- =============================================
REVOKE UPDATE ON public.gastos_caja FROM authenticated, anon;
DROP POLICY IF EXISTS "gastos_caja_update" ON public.gastos_caja;

-- =============================================
-- 3. Inmutabilidad de los campos financieros
-- =============================================
CREATE OR REPLACE FUNCTION public.gastos_caja_proteger_campos()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.sucursal_id IS DISTINCT FROM OLD.sucursal_id
     OR NEW.concepto IS DISTINCT FROM OLD.concepto
     OR NEW.categoria IS DISTINCT FROM OLD.categoria
     OR NEW.monto IS DISTINCT FROM OLD.monto
     OR NEW.fecha IS DISTINCT FROM OLD.fecha
     OR NEW.registrado_por IS DISTINCT FROM OLD.registrado_por
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Los datos del gasto no se pueden modificar; solo anular';
  END IF;

  IF OLD.anulado AND NOT NEW.anulado THEN
    RAISE EXCEPTION 'Un gasto anulado no se puede reactivar';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gastos_caja_proteger_campos ON public.gastos_caja;
CREATE TRIGGER trg_gastos_caja_proteger_campos
BEFORE UPDATE ON public.gastos_caja
FOR EACH ROW EXECUTE FUNCTION public.gastos_caja_proteger_campos();

REVOKE ALL ON FUNCTION public.gastos_caja_proteger_campos() FROM PUBLIC;

-- =============================================
-- 4. Efectivo cobrado de caja por sucursal
--    Base de caja real, sin depender del filtro por marca del corte.
-- =============================================
CREATE OR REPLACE FUNCTION public.cobrado_efectivo_caja(
  p_desde DATE,
  p_hasta DATE,
  p_sucursal_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(pp.monto), 0)
  FROM public.pagos_pedido pp
  JOIN public.pedidos p ON p.id = pp.pedido_id
  WHERE pp.metodo_pago = 'Efectivo'
    AND pp.cobrado_en >= (p_desde::text || 'T00:00:00-06:00')::timestamptz
    AND pp.cobrado_en <= (p_hasta::text || 'T23:59:59.999-06:00')::timestamptz
    AND p.estado <> 'cancelado'
    AND (p_sucursal_id IS NULL OR p.sucursal_id = p_sucursal_id)
    AND (
      public.rol_actual() IN ('admin', 'superadmin', 'contador')
      OR (
        public.rol_actual() = 'mostrador'
        AND p.sucursal_id = public.sucursal_actual()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.cobrado_efectivo_caja(DATE, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cobrado_efectivo_caja(DATE, DATE, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
