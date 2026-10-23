-- =============================================
-- MIGRACIÓN 037: Precios por producto y variante
--   - Marca qué atributos determinan el precio.
--   - Guarda precios por combinación de valores.
--   - Registra historial de cambios (inmutable).
--   - Carga los 39 precios publicados de "Foto Bastidor".
-- =============================================

-- 1. Atributos que afectan el precio y snapshot en pedidos
ALTER TABLE producto_atributos
  ADD COLUMN IF NOT EXISTS afecta_precio BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE detalle_pedidos
  ADD COLUMN IF NOT EXISTS precio_lista NUMERIC(10,2);

-- 2. Precios por combinación de valores
CREATE TABLE IF NOT EXISTS producto_precios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  valores_ids UUID[] NOT NULL DEFAULT '{}',
  precio      NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (producto_id, valores_ids)
);

CREATE INDEX IF NOT EXISTS idx_producto_precios_producto
  ON producto_precios(producto_id);

-- 3. Historial de cambios
CREATE TABLE IF NOT EXISTS producto_precios_historial (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id     UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  valores_ids     UUID[] NOT NULL,
  precio_anterior NUMERIC(12,2),
  precio_nuevo    NUMERIC(12,2),
  usuario_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_precios_historial_producto
  ON producto_precios_historial(producto_id, created_at DESC);

-- 4. Trigger de historial (inmutable, solo INSERT)
CREATE OR REPLACE FUNCTION public.registrar_historial_precio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario UUID;
BEGIN
  v_usuario := NULLIF(current_setting('app.usuario_id', true), '')::UUID;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO producto_precios_historial
      (producto_id, valores_ids, precio_anterior, precio_nuevo, usuario_id)
    VALUES
      (NEW.producto_id, NEW.valores_ids, NULL, NEW.precio, v_usuario);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.precio IS DISTINCT FROM OLD.precio THEN
      INSERT INTO producto_precios_historial
        (producto_id, valores_ids, precio_anterior, precio_nuevo, usuario_id)
      VALUES
        (OLD.producto_id, OLD.valores_ids, OLD.precio, NEW.precio, v_usuario);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Si el producto se está eliminando en cascada, no hay historial que guardar.
    IF EXISTS (SELECT 1 FROM productos WHERE id = OLD.producto_id) THEN
      INSERT INTO producto_precios_historial
        (producto_id, valores_ids, precio_anterior, precio_nuevo, usuario_id)
      VALUES
        (OLD.producto_id, OLD.valores_ids, OLD.precio, NULL, v_usuario);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_producto_precios_historial ON producto_precios;
CREATE TRIGGER trg_producto_precios_historial
  AFTER INSERT OR UPDATE OR DELETE ON producto_precios
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historial_precio();

-- 5. RLS y permisos
ALTER TABLE producto_precios ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_precios_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Precios legibles por autenticados" ON producto_precios;
CREATE POLICY "Precios legibles por autenticados" ON producto_precios
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Historial de precios legible por autenticados" ON producto_precios_historial;
CREATE POLICY "Historial de precios legible por autenticados" ON producto_precios_historial
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.producto_precios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_precios TO service_role;
GRANT SELECT ON public.producto_precios_historial TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_precios_historial TO service_role;

-- 6. RPC atómico para guardar precios de un producto
CREATE OR REPLACE FUNCTION public.guardar_precios_producto(
  p_producto_id UUID,
  p_atributos_precio UUID[],
  p_precios JSONB,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attr_count INT;
  v_insertados INT := 0;
  v_eliminados INT := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM productos WHERE id = p_producto_id) THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  IF p_atributos_precio IS NULL THEN
    p_atributos_precio := ARRAY[]::UUID[];
  END IF;

  p_atributos_precio := ARRAY(
    SELECT DISTINCT valor
    FROM unnest(p_atributos_precio) AS t(valor)
    ORDER BY valor
  );

  IF EXISTS (
    SELECT 1
    FROM unnest(p_atributos_precio) AS x(atributo_id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM producto_atributos pa
      WHERE pa.producto_id = p_producto_id
        AND pa.atributo_id = x.atributo_id
    )
  ) THEN
    RAISE EXCEPTION 'Atributo de precio no pertenece al producto';
  END IF;

  -- Los precios se guardan con el usuario que hizo el cambio.
  PERFORM set_config('app.usuario_id', COALESCE(p_usuario_id::TEXT, ''), true);

  UPDATE producto_atributos pa
  SET afecta_precio = (pa.atributo_id = ANY(p_atributos_precio))
  WHERE pa.producto_id = p_producto_id;

  IF p_precios IS NULL THEN
    p_precios := '[]'::JSONB;
  END IF;

  IF jsonb_typeof(p_precios) <> 'array' THEN
    RAISE EXCEPTION 'Formato de precios inválido';
  END IF;

  v_attr_count := COALESCE(array_length(p_atributos_precio, 1), 0);

  CREATE TEMP TABLE IF NOT EXISTS _precios_nuevos (
    valores_ids UUID[] PRIMARY KEY,
    precio NUMERIC(12,2) NOT NULL
  ) ON COMMIT DROP;
  TRUNCATE _precios_nuevos;

  INSERT INTO _precios_nuevos (valores_ids, precio)
  SELECT
    ARRAY(
      SELECT v
      FROM (
        SELECT DISTINCT t.valor::UUID AS v
        FROM unnest(
          ARRAY(
            SELECT jsonb_array_elements_text(n->'valores_ids')
          )
        ) AS t(valor)
      ) AS valores
      ORDER BY v::TEXT
    ),
    (n->>'precio')::NUMERIC
  FROM jsonb_array_elements(p_precios) AS n;

  IF (SELECT count(*) FROM _precios_nuevos) <> jsonb_array_length(p_precios) THEN
    RAISE EXCEPTION 'Variantes duplicadas';
  END IF;

  IF EXISTS (
    SELECT 1 FROM _precios_nuevos
    WHERE precio IS NULL OR precio < 0
  ) THEN
    RAISE EXCEPTION 'Precio inválido';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _precios_nuevos n
    WHERE COALESCE(array_length(n.valores_ids, 1), 0) <> v_attr_count
  ) THEN
    RAISE EXCEPTION 'La variante no coincide con los atributos de precio';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _precios_nuevos n
    CROSS JOIN LATERAL unnest(n.valores_ids) AS vid(valor_id)
    WHERE vid.valor_id NOT IN (
      SELECT pav.valor_id
      FROM producto_atributos pa
      JOIN producto_atributo_valores pav ON pav.producto_atributo_id = pa.id
      WHERE pa.producto_id = p_producto_id
    )
  ) THEN
    RAISE EXCEPTION 'Valor no permitido para el producto';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _precios_nuevos n
    CROSS JOIN LATERAL unnest(n.valores_ids) AS vid(valor_id)
    JOIN atributo_valores av ON av.id = vid.valor_id
    WHERE NOT (av.atributo_id = ANY(p_atributos_precio))
  ) THEN
    RAISE EXCEPTION 'La variante contiene valores que no son de precio';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _precios_nuevos n
    WHERE (
      SELECT count(DISTINCT av.atributo_id)
      FROM atributo_valores av
      WHERE av.id = ANY(n.valores_ids)
    ) <> v_attr_count
  ) THEN
    RAISE EXCEPTION 'La variante debe tener un valor por atributo de precio';
  END IF;

  DELETE FROM producto_precios pp
  WHERE pp.producto_id = p_producto_id
    AND NOT EXISTS (
      SELECT 1 FROM _precios_nuevos n
      WHERE n.valores_ids = pp.valores_ids
    );
  GET DIAGNOSTICS v_eliminados = ROW_COUNT;

  INSERT INTO producto_precios (producto_id, valores_ids, precio, updated_at)
  SELECT p_producto_id, n.valores_ids, n.precio, now()
  FROM _precios_nuevos n
  ON CONFLICT (producto_id, valores_ids) DO UPDATE
    SET precio = EXCLUDED.precio,
        activo = true,
        updated_at = now()
    WHERE producto_precios.precio IS DISTINCT FROM EXCLUDED.precio
       OR producto_precios.activo IS DISTINCT FROM true;
  GET DIAGNOSTICS v_insertados = ROW_COUNT;

  RETURN jsonb_build_object(
    'insertados', v_insertados,
    'eliminados', v_eliminados
  );
END;
$$;

REVOKE ALL ON FUNCTION public.guardar_precios_producto(UUID, UUID[], JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_precios_producto(UUID, UUID[], JSONB, UUID) TO service_role;

-- 7. Carga inicial: Foto Bastidor (precios publicados por tamaño)
UPDATE producto_atributos pa
SET afecta_precio = false
FROM productos p, categorias c
WHERE pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND c.nombre = 'Bastidores'
  AND p.nombre = 'Foto Bastidor';

UPDATE producto_atributos pa
SET afecta_precio = true
FROM productos p, categorias c, atributos a
WHERE pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND pa.atributo_id = a.id
  AND c.nombre = 'Bastidores'
  AND p.nombre = 'Foto Bastidor'
  AND a.nombre = 'Impresión Tamaño';

WITH precios(valor, precio) AS (
  VALUES
    ('4x6"', 50.00),
    ('5x7"', 70.00),
    ('6x6"', 80.00),
    ('6x8"', 85.00),
    ('6x8.5"', 90.00),
    ('6x9"', 105.00),
    ('6x12"', 135.00),
    ('6x15"', 175.00),
    ('6x18"', 205.00),
    ('8x8"', 110.00),
    ('8x10"', 135.00),
    ('8x12"', 160.00),
    ('8x20"', 265.00),
    ('8.5x11"', 160.00),
    ('10x10"', 165.00),
    ('10x20"', 340.00),
    ('10x22"', 370.00),
    ('10x24"', 380.00),
    ('11x14"', 260.00),
    ('11x16"', 300.00),
    ('11x17"', 320.00),
    ('12x12"', 240.00),
    ('12x16"', 320.00),
    ('12x20"', 400.00),
    ('12x24"', 485.00),
    ('12x36"', 715.00),
    ('16x16"', 425.00),
    ('16x20"', 530.00),
    ('16x24"', 635.00),
    ('18.8x26.8"', 835.00),
    ('20x20"', 660.00),
    ('20x24"', 795.00),
    ('20x28"', 925.00),
    ('20x30"', 990.00),
    ('20x32"', 1100.00),
    ('21.2x63.2"', 2220.00),
    ('24x24"', 955.00),
    ('24x30"', 1190.00),
    ('24x36"', 1430.00)
)
INSERT INTO producto_precios (producto_id, valores_ids, precio)
SELECT p.id, ARRAY[av.id], pr.precio
FROM productos p
JOIN categorias c ON c.id = p.categoria_id AND c.nombre = 'Bastidores'
JOIN producto_atributos pa ON pa.producto_id = p.id
JOIN atributos a ON a.id = pa.atributo_id AND a.nombre = 'Impresión Tamaño'
JOIN producto_atributo_valores pav ON pav.producto_atributo_id = pa.id
JOIN atributo_valores av ON av.id = pav.valor_id
JOIN precios pr ON pr.valor = av.valor
WHERE p.nombre = 'Foto Bastidor'
ON CONFLICT (producto_id, valores_ids) DO UPDATE
  SET precio = EXCLUDED.precio,
      activo = true,
      updated_at = now()
  WHERE producto_precios.precio IS DISTINCT FROM EXCLUDED.precio
     OR producto_precios.activo IS DISTINCT FROM true;
