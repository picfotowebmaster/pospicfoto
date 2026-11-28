-- =============================================
-- MIGRACIÓN 084: Folios de pedido consecutivos por marca + sucursal
-- Cada prefijo (FRX-CUB, PIC-CUB, PIC-PAL, ...) lleva su propio contador.
-- No se renumeran pedidos históricos: los nuevos continúan desde el
-- máximo número ya usado por cada prefijo.
-- =============================================

-- =============================================
-- 1. Tabla contadora de folios
-- =============================================
CREATE TABLE IF NOT EXISTS public.folios_correlativos (
  marca_codigo    TEXT   NOT NULL,
  sucursal_codigo TEXT   NOT NULL,
  tipo            TEXT   NOT NULL CHECK (tipo IN ('pedido', 'venta')),
  ultimo_folio    BIGINT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (marca_codigo, sucursal_codigo, tipo)
);

ALTER TABLE public.folios_correlativos ENABLE ROW LEVEL SECURITY;

-- Solo se accede a través de las funciones SECURITY DEFINER.
REVOKE ALL ON public.folios_correlativos FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.folios_correlativos TO service_role;

-- =============================================
-- 2. Inicializar desde el máximo histórico (sin renumerar)
-- =============================================
INSERT INTO public.folios_correlativos (
  marca_codigo,
  sucursal_codigo,
  tipo,
  ultimo_folio
)
SELECT
  split_part(numero_pedido, '-', 1) AS marca_codigo,
  split_part(numero_pedido, '-', 2) AS sucursal_codigo,
  'pedido' AS tipo,
  MAX(NULLIF(regexp_replace(numero_pedido, '\D', '', 'g'), '')::BIGINT) AS ultimo_folio
FROM public.pedidos
WHERE numero_pedido ~ '^[A-Za-z]+-[A-Za-z]+-[0-9]+$'
GROUP BY 1, 2
ON CONFLICT (marca_codigo, sucursal_codigo, tipo) DO UPDATE
SET
  ultimo_folio = GREATEST(
    folios_correlativos.ultimo_folio,
    EXCLUDED.ultimo_folio
  ),
  updated_at = now();

-- =============================================
-- 3. Helper: siguiente folio
-- Parámetros con prefijo p_ para no chocar con los nombres de columna.
-- =============================================
CREATE OR REPLACE FUNCTION public._siguiente_folio(
  p_marca_codigo    TEXT,
  p_sucursal_codigo TEXT,
  p_tipo            TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_folio BIGINT;
BEGIN
  INSERT INTO public.folios_correlativos (
    marca_codigo,
    sucursal_codigo,
    tipo,
    ultimo_folio
  )
  VALUES (p_marca_codigo, p_sucursal_codigo, p_tipo, 1)
  ON CONFLICT (marca_codigo, sucursal_codigo, tipo) DO UPDATE
  SET
    ultimo_folio = folios_correlativos.ultimo_folio + 1,
    updated_at = now()
  RETURNING ultimo_folio INTO v_folio;

  RETURN v_folio;
END;
$$;

REVOKE ALL ON FUNCTION public._siguiente_folio(TEXT, TEXT, TEXT) FROM PUBLIC;

-- =============================================
-- 4. Generador de número de pedido (por prefijo)
-- =============================================
DROP FUNCTION IF EXISTS public.generar_numero_pedido(TEXT, TEXT);

CREATE FUNCTION public.generar_numero_pedido(
  marca_codigo TEXT,
  sucursal_codigo TEXT
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT marca_codigo || '-' || sucursal_codigo || '-' ||
    LPAD(
      public._siguiente_folio(marca_codigo, sucursal_codigo, 'pedido')::TEXT,
      5,
      '0'
    );
$$;

REVOKE ALL ON FUNCTION public.generar_numero_pedido(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generar_numero_pedido(TEXT, TEXT)
  TO authenticated, service_role;

-- =============================================
-- 5. Generador de folio de venta agrupada
-- Evita consumir un número de pedido en ventas con varias rutas.
-- =============================================
DROP FUNCTION IF EXISTS public.generar_folio_venta(TEXT, TEXT);

CREATE FUNCTION public.generar_folio_venta(
  marca_codigo TEXT,
  sucursal_codigo TEXT
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 'VTA-' || marca_codigo || '-' || sucursal_codigo || '-' ||
    LPAD(
      public._siguiente_folio(marca_codigo, sucursal_codigo, 'venta')::TEXT,
      5,
      '0'
    );
$$;

REVOKE ALL ON FUNCTION public.generar_folio_venta(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generar_folio_venta(TEXT, TEXT)
  TO authenticated, service_role;
