-- =============================================
-- MIGRACIÓN 070: pedidos y reportes por marca + sucursal
-- Mostrador solo puede leer y crear pedidos de su marca y sucursal.
-- Producción, admin, superadmin y contador conservan su alcance actual.
-- =============================================

CREATE OR REPLACE FUNCTION public.marca_actual()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT marca_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.puede_ver_pedido_alcance(
  p_sucursal_id UUID,
  p_marca_id UUID
)
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
      AND public.marca_actual() IS NOT NULL
      AND p_sucursal_id = public.sucursal_actual()
      AND p_marca_id = public.marca_actual()
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
      AND public.puede_ver_pedido_alcance(p.sucursal_id, p.marca_id)
  );
$$;

REVOKE ALL ON FUNCTION public.marca_actual() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.puede_ver_pedido_alcance(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.puede_ver_pedido(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marca_actual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.puede_ver_pedido_alcance(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.puede_ver_pedido(UUID) TO authenticated;

-- =============================================
-- Backfill de marca en pedidos y perfiles
-- =============================================

UPDATE pedidos p
SET marca_id = e.marca_id
FROM entidades_emisoras e
WHERE p.entidad_emisora_id = e.id
  AND p.marca_id IS NULL;

UPDATE profiles p
SET marca_id = e.marca_id
FROM entidades_emisoras e
WHERE p.entidad_emisora_id = e.id
  AND p.marca_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_sucursal_marca
  ON pedidos(sucursal_id, marca_id);

-- =============================================
-- Políticas SELECT
-- =============================================

DROP POLICY IF EXISTS "Pedidos legibles por rol o sucursal" ON pedidos;
CREATE POLICY "Pedidos legibles por marca y sucursal" ON pedidos
  FOR SELECT TO authenticated
  USING (
    public.puede_ver_pedido_alcance(pedidos.sucursal_id, pedidos.marca_id)
  );

-- detalle_pedidos, pedido_movimientos y pedido_comentarios ya usan
-- public.puede_ver_pedido(...), que ahora incluye la marca.

-- =============================================
-- Políticas INSERT
-- =============================================

DROP POLICY IF EXISTS "Pedidos insert por mostrador/admin" ON pedidos;
CREATE POLICY "Pedidos insert por marca y sucursal" ON pedidos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.rol_actual() IN ('admin', 'superadmin')
    OR (
      public.rol_actual() = 'mostrador'
      AND public.sucursal_actual() IS NOT NULL
      AND public.marca_actual() IS NOT NULL
      AND pedidos.sucursal_id = public.sucursal_actual()
      AND pedidos.marca_id = public.marca_actual()
      AND pedidos.cajero_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Detalle pedidos insert por mostrador/admin" ON detalle_pedidos;
CREATE POLICY "Detalle pedidos insert por pedido visible" ON detalle_pedidos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.rol_actual() IN ('mostrador', 'admin', 'superadmin')
    AND public.puede_ver_pedido(detalle_pedidos.pedido_id)
  );

-- =============================================
-- Políticas UPDATE / DELETE
-- =============================================

DROP POLICY IF EXISTS "Pedidos actualizables por produccion/admin" ON pedidos;
CREATE POLICY "Pedidos actualizables por produccion/admin" ON pedidos
  FOR UPDATE TO authenticated
  USING (
    public.rol_actual() IN ('taller', 'corte', 'admin', 'superadmin')
    OR (
      public.rol_actual() = 'mostrador'
      AND public.sucursal_actual() IS NOT NULL
      AND public.marca_actual() IS NOT NULL
      AND pedidos.sucursal_id = public.sucursal_actual()
      AND pedidos.marca_id = public.marca_actual()
    )
  );

DROP POLICY IF EXISTS "Detalle pedidos actualizable por admin/mostrador" ON detalle_pedidos;
CREATE POLICY "Detalle pedidos actualizable por admin/mostrador" ON detalle_pedidos
  FOR UPDATE TO authenticated
  USING (
    public.rol_actual() IN ('mostrador', 'admin', 'superadmin')
    AND public.puede_ver_pedido(detalle_pedidos.pedido_id)
  );

DROP POLICY IF EXISTS "Detalle pedidos eliminable por admin/mostrador" ON detalle_pedidos;
CREATE POLICY "Detalle pedidos eliminable por admin/mostrador" ON detalle_pedidos
  FOR DELETE TO authenticated
  USING (
    public.rol_actual() IN ('mostrador', 'admin', 'superadmin')
    AND public.puede_ver_pedido(detalle_pedidos.pedido_id)
  );

DROP POLICY IF EXISTS "Movimientos insertables por operador" ON pedido_movimientos;
DROP POLICY IF EXISTS "Movimientos insert por produccion/admin" ON pedido_movimientos;
CREATE POLICY "Movimientos insert por produccion/admin" ON pedido_movimientos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.rol_actual() IN (
      'taller', 'corte', 'admin', 'superadmin', 'mostrador'
    )
    AND public.puede_ver_pedido(pedido_movimientos.pedido_id)
  );

DROP POLICY IF EXISTS "Comentarios insert por produccion/admin" ON pedido_comentarios;
CREATE POLICY "Comentarios insert por produccion/admin" ON pedido_comentarios
  FOR INSERT TO authenticated
  WITH CHECK (
    autor_id = auth.uid()
    AND public.rol_actual() IN (
      'diseno', 'impresion', 'laminado', 'montaje',
      'books', 'bastidores', 'marcos', 'taller', 'corte',
      'admin', 'superadmin', 'mostrador'
    )
    AND public.puede_ver_pedido(pedido_comentarios.pedido_id)
  );

DROP POLICY IF EXISTS "Comentarios delete por autor o admin" ON pedido_comentarios;
CREATE POLICY "Comentarios delete por autor o admin" ON pedido_comentarios
  FOR DELETE TO authenticated
  USING (
    public.puede_ver_pedido(pedido_comentarios.pedido_id)
    AND (
      autor_id = auth.uid()
      OR public.rol_actual() IN ('admin', 'superadmin')
    )
  );

-- =============================================
-- Vendedores filtrados por sucursal y marca
-- =============================================

DROP FUNCTION IF EXISTS public.listar_vendedores();
DROP FUNCTION IF EXISTS public.listar_vendedores(UUID);

CREATE OR REPLACE FUNCTION public.listar_vendedores(
  p_sucursal_id UUID DEFAULT NULL,
  p_marca_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  email TEXT,
  rol TEXT,
  sucursal_id UUID,
  marca_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_rol TEXT;
  v_sucursal UUID;
  v_marca UUID;
  v_filtro_sucursal UUID := p_sucursal_id;
  v_filtro_marca UUID := p_marca_id;
BEGIN
  SELECT p.rol::text, p.sucursal_id, p.marca_id
  INTO v_rol, v_sucursal, v_marca
  FROM profiles p
  WHERE p.id = auth.uid();

  IF v_rol = 'mostrador' THEN
    IF v_sucursal IS NULL OR v_marca IS NULL THEN
      RETURN;
    END IF;

    v_filtro_sucursal := v_sucursal;
    v_filtro_marca := v_marca;
  END IF;

  RETURN QUERY
    SELECT
      p.id,
      COALESCE(NULLIF(trim(p.nombre), ''), u.email, 'Sin nombre')::text AS nombre,
      u.email::text AS email,
      p.rol::text AS rol,
      p.sucursal_id,
      p.marca_id
    FROM profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE (v_filtro_sucursal IS NULL OR p.sucursal_id = v_filtro_sucursal)
      AND (v_filtro_marca IS NULL OR p.marca_id = v_filtro_marca)
    ORDER BY
      COALESCE(NULLIF(trim(p.nombre), ''), u.email, 'Sin nombre');
END;
$$;

REVOKE ALL ON FUNCTION public.listar_vendedores(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_vendedores(UUID, UUID) TO authenticated;
