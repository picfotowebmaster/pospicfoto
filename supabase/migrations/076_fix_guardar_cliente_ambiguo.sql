-- =============================================
-- MIGRACIÓN 076: Corregir guardar_cliente y recuperar clientes
--
-- La función declaraba RETURNS TABLE (id, nombre, ...), por lo que
-- esos nombres existen como variables PL/pgSQL. Las referencias a
-- `id` sin calificar en el chequeo de permisos y en el UPDATE de
-- pedidos colisionaban con la variable y fallaban en cada llamada:
--   42702 column reference "id" is ambiguous
--
-- Como la app ignora el error (catch vacío), el pedido se guardaba
-- pero el cliente nunca se creaba ni se vinculaba (cliente_id NULL).
--
-- Esta migración:
--   1. Reemplaza guardar_cliente calificando las columnas.
--   2. Hace backfill de los pedidos históricos sin cliente_id.
-- =============================================

CREATE OR REPLACE FUNCTION public.guardar_cliente(
  p_nombre TEXT,
  p_telefono TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_pedido_id UUID DEFAULT NULL,
  p_total NUMERIC DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  telefono TEXT,
  email TEXT,
  last_order_at TIMESTAMPTZ,
  pedidos_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_tel TEXT := public.normalizar_telefono_cliente(p_telefono);
  v_email TEXT := lower(trim(COALESCE(p_email, '')));
  v_nombre TEXT := trim(COALESCE(p_nombre, ''));
  v_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.rol IN ('mostrador', 'admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_nombre = '' AND v_tel = '' AND v_email = '' THEN
    RETURN;
  END IF;

  IF v_tel <> '' THEN
    SELECT c.id INTO v_id
    FROM public.clientes c
    WHERE c.telefono_normalizado = v_tel
    ORDER BY c.last_order_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_id IS NULL AND v_email <> '' THEN
    SELECT c.id INTO v_id
    FROM public.clientes c
    WHERE c.email_normalizado = v_email
    ORDER BY c.last_order_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    BEGIN
      INSERT INTO public.clientes (nombre, telefono, email)
      VALUES (
        COALESCE(NULLIF(v_nombre, ''), 'Cliente'),
        NULLIF(p_telefono, ''),
        NULLIF(p_email, '')
      )
      RETURNING clientes.id INTO v_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT c.id INTO v_id
      FROM public.clientes c
      WHERE c.telefono_normalizado = v_tel
      LIMIT 1;
    END;
  ELSE
    UPDATE public.clientes c
    SET
      email = COALESCE(c.email, NULLIF(p_email, '')),
      last_order_at = now()
    WHERE c.id = v_id;
  END IF;

  IF p_pedido_id IS NOT NULL THEN
    UPDATE public.pedidos p
    SET cliente_id = v_id
    WHERE p.id = p_pedido_id
      AND p.cliente_id IS NULL;

    IF FOUND THEN
      UPDATE public.clientes c
      SET
        pedidos_count = c.pedidos_count + 1,
        total_gastado = c.total_gastado + COALESCE(p_total, 0),
        last_order_at = now()
      WHERE c.id = v_id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT c.id, c.nombre, c.telefono, c.email, c.last_order_at, c.pedidos_count
  FROM public.clientes c
  WHERE c.id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.guardar_cliente(TEXT, TEXT, TEXT, UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_cliente(TEXT, TEXT, TEXT, UUID, NUMERIC) TO authenticated;

-- =============================================
-- Backfill: crear clientes desde pedidos históricos
-- =============================================

-- Clientes identificados por teléfono
INSERT INTO public.clientes (nombre, telefono, email, last_order_at)
SELECT DISTINCT ON (public.normalizar_telefono_cliente(p.cliente_telefono))
  COALESCE(NULLIF(trim(p.cliente_nombre), ''), 'Cliente'),
  p.cliente_telefono,
  NULLIF(trim(p.cliente_email), ''),
  p.created_at
FROM public.pedidos p
WHERE public.normalizar_telefono_cliente(p.cliente_telefono) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.telefono_normalizado = public.normalizar_telefono_cliente(p.cliente_telefono)
  )
ORDER BY public.normalizar_telefono_cliente(p.cliente_telefono), p.created_at DESC;

-- Clientes identificados solo por email (sin teléfono)
INSERT INTO public.clientes (nombre, email, last_order_at)
SELECT DISTINCT ON (lower(trim(p.cliente_email)))
  COALESCE(NULLIF(trim(p.cliente_nombre), ''), 'Cliente'),
  p.cliente_email,
  p.created_at
FROM public.pedidos p
WHERE public.normalizar_telefono_cliente(p.cliente_telefono) = ''
  AND lower(trim(COALESCE(p.cliente_email, ''))) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.email_normalizado = lower(trim(p.cliente_email))
  )
ORDER BY lower(trim(p.cliente_email)), p.created_at DESC;

-- Enlazar pedidos por teléfono
UPDATE public.pedidos p
SET cliente_id = c.id
FROM public.clientes c
WHERE p.cliente_id IS NULL
  AND public.normalizar_telefono_cliente(p.cliente_telefono) <> ''
  AND c.telefono_normalizado = public.normalizar_telefono_cliente(p.cliente_telefono);

-- Enlazar pedidos por email cuando no hay teléfono
UPDATE public.pedidos p
SET cliente_id = c.id
FROM public.clientes c
WHERE p.cliente_id IS NULL
  AND public.normalizar_telefono_cliente(p.cliente_telefono) = ''
  AND lower(trim(COALESCE(p.cliente_email, ''))) <> ''
  AND c.email_normalizado = lower(trim(p.cliente_email));

-- Recalcular agregados por cliente
UPDATE public.clientes c
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
  FROM public.pedidos
  WHERE cliente_id IS NOT NULL
  GROUP BY cliente_id
) sub
WHERE c.id = sub.cliente_id;

NOTIFY pgrst, 'reload schema';
