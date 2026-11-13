-- =============================================
-- MIGRACIÓN 061: Administración de clientes
-- Edición de datos y consulta de compras por periodo
-- =============================================

-- =============================================
-- Índice para historial de compras por cliente
-- =============================================

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_fecha
  ON pedidos(cliente_id, fecha_recepcion DESC)
  WHERE cliente_id IS NOT NULL;

-- =============================================
-- Edición de clientes (solo admin / superadmin)
-- =============================================

CREATE OR REPLACE FUNCTION public.actualizar_cliente(
  p_id UUID,
  p_nombre TEXT,
  p_telefono TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_notas TEXT DEFAULT NULL,
  p_rfc TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  telefono TEXT,
  email TEXT,
  notas TEXT,
  rfc TEXT,
  last_order_at TIMESTAMPTZ,
  pedidos_count INTEGER,
  total_gastado NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_nombre TEXT := trim(COALESCE(p_nombre, ''));
  v_telefono TEXT := NULLIF(trim(COALESCE(p_telefono, '')), '');
  v_email TEXT := NULLIF(lower(trim(COALESCE(p_email, ''))), '');
  v_notas TEXT := NULLIF(trim(COALESCE(p_notas, '')), '');
  v_rfc TEXT := NULLIF(upper(trim(COALESCE(p_rfc, ''))), '');
  v_telefono_normalizado TEXT := public.normalizar_telefono_cliente(p_telefono);
  v_conflicto UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND rol IN ('admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_nombre = '' THEN
    RAISE EXCEPTION 'El nombre del cliente es obligatorio';
  END IF;

  IF v_email IS NOT NULL AND v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'El correo electrónico no es válido';
  END IF;

  IF v_telefono_normalizado <> '' THEN
    SELECT c.id INTO v_conflicto
    FROM clientes c
    WHERE c.telefono_normalizado = v_telefono_normalizado
      AND c.id <> p_id
    LIMIT 1;

    IF v_conflicto IS NOT NULL THEN
      RAISE EXCEPTION 'Ya existe otro cliente con ese teléfono';
    END IF;
  END IF;

  UPDATE clientes c
  SET
    nombre = v_nombre,
    telefono = v_telefono,
    email = v_email,
    notas = v_notas,
    rfc = v_rfc
  WHERE c.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.nombre,
    c.telefono,
    c.email,
    c.notas,
    c.rfc,
    c.last_order_at,
    c.pedidos_count,
    c.total_gastado
  FROM clientes c
  WHERE c.id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.actualizar_cliente(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.actualizar_cliente(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =============================================
-- Listado administrativo con búsqueda y paginación
-- =============================================

CREATE OR REPLACE FUNCTION public.listar_clientes_admin(
  p_q TEXT DEFAULT '',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  telefono TEXT,
  email TEXT,
  notas TEXT,
  rfc TEXT,
  last_order_at TIMESTAMPTZ,
  pedidos_count INTEGER,
  total_gastado NUMERIC,
  total BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
  WITH params AS (
    SELECT
      public.normalizar_texto_cliente(p_q) AS q_norm,
      lower(trim(COALESCE(p_q, ''))) AS q_email,
      public.normalizar_telefono_cliente(p_q) AS q_tel,
      GREATEST(1, LEAST(COALESCE(p_limit, 20), 100)) AS lim,
      GREATEST(0, COALESCE(p_offset, 0)) AS off
  )
  SELECT
    c.id,
    c.nombre,
    c.telefono,
    c.email,
    c.notas,
    c.rfc,
    c.last_order_at,
    c.pedidos_count,
    c.total_gastado,
    count(*) OVER() AS total
  FROM clientes c, params p
  WHERE (
    (p.q_norm = '' AND p.q_tel = '' AND p.q_email = '')
    OR (length(p.q_tel) >= 2 AND c.telefono_normalizado LIKE '%' || p.q_tel || '%')
    OR (length(p.q_email) >= 2 AND c.email_normalizado LIKE '%' || p.q_email || '%')
    OR (length(p.q_norm) >= 2 AND c.nombre_normalizado LIKE '%' || p.q_norm || '%')
    OR (length(p.q_norm) >= 2 AND similarity(c.nombre_normalizado, p.q_norm) > 0.15)
  )
  ORDER BY
    c.last_order_at DESC NULLS LAST,
    c.nombre ASC
  LIMIT (SELECT lim FROM params)
  OFFSET (SELECT off FROM params);
$$;

REVOKE ALL ON FUNCTION public.listar_clientes_admin(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_clientes_admin(TEXT, INTEGER, INTEGER) TO authenticated;

-- =============================================
-- Backfill de pedidos antiguos sin vínculo
-- =============================================

UPDATE pedidos p
SET cliente_id = c.id
FROM clientes c
WHERE p.cliente_id IS NULL
  AND public.normalizar_telefono_cliente(p.cliente_telefono) <> ''
  AND c.telefono_normalizado = public.normalizar_telefono_cliente(p.cliente_telefono);

UPDATE pedidos p
SET cliente_id = c.id
FROM clientes c
WHERE p.cliente_id IS NULL
  AND public.normalizar_telefono_cliente(p.cliente_telefono) = ''
  AND lower(trim(COALESCE(p.cliente_email, ''))) <> ''
  AND c.email_normalizado = lower(trim(p.cliente_email));

UPDATE clientes c
SET
  pedidos_count = sub.cnt,
  total_gastado = sub.total,
  last_order_at = sub.last_order
FROM (
  SELECT
    cliente_id,
    count(*) AS cnt,
    COALESCE(sum(total), 0) AS total,
    max(created_at) AS last_order
  FROM pedidos
  WHERE cliente_id IS NOT NULL
  GROUP BY cliente_id
) sub
WHERE c.id = sub.cliente_id;
