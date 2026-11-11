-- =============================================
-- MIGRACIÓN 057: Base de compradores y búsqueda
-- =============================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================
-- Normalización
-- =============================================

CREATE OR REPLACE FUNCTION public.normalizar_telefono_cliente(p_telefono TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  WITH d AS (
    SELECT regexp_replace(COALESCE(p_telefono, ''), '\D', '', 'g') AS v
  )
  SELECT CASE
    WHEN length(v) = 13 AND left(v, 3) = '521' THEN right(v, 10)
    WHEN length(v) = 12 AND left(v, 2) = '52' THEN right(v, 10)
    ELSE v
  END
  FROM d;
$$;

CREATE OR REPLACE FUNCTION public.normalizar_texto_cliente(p_texto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT regexp_replace(
    translate(
      lower(trim(COALESCE(p_texto, ''))),
      'áàäâãéèëêíìïîóòöôõúùüûñç',
      'aaaaaeeeeiiiiooooouuuunc'
    ),
    '\s+',
    ' ',
    'g'
  );
$$;

-- =============================================
-- Tabla de compradores
-- =============================================

CREATE TABLE IF NOT EXISTS clientes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                TEXT NOT NULL,
  telefono              TEXT,
  telefono_normalizado  TEXT GENERATED ALWAYS AS (public.normalizar_telefono_cliente(telefono)) STORED,
  email                 TEXT,
  email_normalizado     TEXT GENERATED ALWAYS AS (lower(trim(COALESCE(email, '')))) STORED,
  nombre_normalizado    TEXT GENERATED ALWAYS AS (public.normalizar_texto_cliente(nombre)) STORED,
  rfc                   TEXT,
  rfc_normalizado       TEXT GENERATED ALWAYS AS (upper(regexp_replace(COALESCE(rfc, ''), '[^A-Za-z0-9&Ññ]', '', 'g'))) STORED,
  notas                 TEXT,
  last_order_at         TIMESTAMPTZ,
  pedidos_count         INTEGER NOT NULL DEFAULT 0,
  total_gastado         NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_telefono_normalizado
  ON clientes(telefono_normalizado)
  WHERE telefono_normalizado <> '';

CREATE INDEX IF NOT EXISTS idx_clientes_email_normalizado
  ON clientes(email_normalizado)
  WHERE email_normalizado <> '';

CREATE INDEX IF NOT EXISTS idx_clientes_nombre_trgm
  ON clientes USING gin (nombre_normalizado gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clientes_email_trgm
  ON clientes USING gin (email_normalizado gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clientes_telefono_trgm
  ON clientes USING gin (telefono_normalizado gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clientes_last_order
  ON clientes(last_order_at DESC NULLS LAST);

DROP TRIGGER IF EXISTS set_updated_at_clientes ON clientes;
CREATE TRIGGER set_updated_at_clientes
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- =============================================
-- Vínculo pedido -> comprador
-- =============================================

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente
  ON pedidos(cliente_id) WHERE cliente_id IS NOT NULL;

-- =============================================
-- RLS
-- =============================================

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clientes legibles por roles" ON clientes;
CREATE POLICY "Clientes legibles por roles" ON clientes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND rol IN ('mostrador', 'admin', 'superadmin', 'contador')
  ));

GRANT SELECT ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;

-- Los escrituras se hacen exclusivamente por la RPC guardar_cliente.

-- =============================================
-- Búsqueda instantánea
-- =============================================

CREATE OR REPLACE FUNCTION public.buscar_clientes(
  p_q TEXT,
  p_limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  telefono TEXT,
  email TEXT,
  last_order_at TIMESTAMPTZ,
  pedidos_count INTEGER
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
      GREATEST(1, LEAST(COALESCE(p_limit, 8), 20)) AS lim
  )
  SELECT
    c.id,
    c.nombre,
    c.telefono,
    c.email,
    c.last_order_at,
    c.pedidos_count
  FROM clientes c, params p
  WHERE (
    (length(p.q_tel) >= 2 AND c.telefono_normalizado LIKE '%' || p.q_tel || '%')
    OR (length(p.q_email) >= 2 AND c.email_normalizado LIKE '%' || p.q_email || '%')
    OR (length(p.q_norm) >= 2 AND c.nombre_normalizado LIKE '%' || p.q_norm || '%')
    OR (length(p.q_norm) >= 2 AND similarity(c.nombre_normalizado, p.q_norm) > 0.15)
  )
  ORDER BY
    GREATEST(
      similarity(c.nombre_normalizado, p.q_norm),
      similarity(c.email_normalizado, p.q_email),
      CASE
        WHEN length(p.q_tel) >= 2 AND c.telefono_normalizado LIKE '%' || p.q_tel || '%'
          THEN 1
        ELSE 0
      END
    ) DESC,
    c.last_order_at DESC NULLS LAST,
    c.pedidos_count DESC,
    c.nombre ASC
  LIMIT (SELECT lim FROM params);
$$;

REVOKE ALL ON FUNCTION public.buscar_clientes(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buscar_clientes(TEXT, INTEGER) TO authenticated;

-- =============================================
-- Alta / actualización de comprador y vínculo del pedido
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
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND rol IN ('mostrador', 'admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_nombre = '' AND v_tel = '' AND v_email = '' THEN
    RETURN;
  END IF;

  IF v_tel <> '' THEN
    SELECT c.id INTO v_id
    FROM clientes c
    WHERE c.telefono_normalizado = v_tel
    ORDER BY c.last_order_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_id IS NULL AND v_email <> '' THEN
    SELECT c.id INTO v_id
    FROM clientes c
    WHERE c.email_normalizado = v_email
    ORDER BY c.last_order_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_id IS NULL THEN
    BEGIN
      INSERT INTO clientes (nombre, telefono, email)
      VALUES (
        COALESCE(NULLIF(v_nombre, ''), 'Cliente'),
        NULLIF(p_telefono, ''),
        NULLIF(p_email, '')
      )
      RETURNING clientes.id INTO v_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT c.id INTO v_id
      FROM clientes c
      WHERE c.telefono_normalizado = v_tel
      LIMIT 1;
    END;
  ELSE
    UPDATE clientes c
    SET
      email = COALESCE(c.email, NULLIF(p_email, '')),
      last_order_at = now()
    WHERE c.id = v_id;
  END IF;

  IF p_pedido_id IS NOT NULL THEN
    UPDATE pedidos
    SET cliente_id = v_id
    WHERE id = p_pedido_id
      AND cliente_id IS NULL;

    IF FOUND THEN
      UPDATE clientes c
      SET
        pedidos_count = c.pedidos_count + 1,
        total_gastado = c.total_gastado + COALESCE(p_total, 0),
        last_order_at = now()
      WHERE c.id = v_id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT c.id, c.nombre, c.telefono, c.email, c.last_order_at, c.pedidos_count
  FROM clientes c
  WHERE c.id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.guardar_cliente(TEXT, TEXT, TEXT, UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_cliente(TEXT, TEXT, TEXT, UUID, NUMERIC) TO authenticated;

-- =============================================
-- Backfill desde pedidos existentes
-- =============================================

INSERT INTO clientes (nombre, telefono, email, last_order_at)
SELECT DISTINCT ON (public.normalizar_telefono_cliente(p.cliente_telefono))
  COALESCE(NULLIF(trim(p.cliente_nombre), ''), 'Cliente'),
  p.cliente_telefono,
  p.cliente_email,
  p.created_at
FROM pedidos p
WHERE public.normalizar_telefono_cliente(p.cliente_telefono) <> ''
ORDER BY public.normalizar_telefono_cliente(p.cliente_telefono), p.created_at DESC;

INSERT INTO clientes (nombre, email, last_order_at)
SELECT DISTINCT ON (lower(trim(p.cliente_email)))
  COALESCE(NULLIF(trim(p.cliente_nombre), ''), 'Cliente'),
  p.cliente_email,
  p.created_at
FROM pedidos p
WHERE public.normalizar_telefono_cliente(p.cliente_telefono) = ''
  AND lower(trim(COALESCE(p.cliente_email, ''))) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM clientes c
    WHERE c.email_normalizado = lower(trim(p.cliente_email))
  )
ORDER BY lower(trim(p.cliente_email)), p.created_at DESC;

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
