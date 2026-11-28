-- =============================================
-- MIGRACIÓN 088: Corrige ambigüedad en generar_numero_pedido / generar_folio_venta
-- Error original: "column reference \"marca_codigo\" is ambiguous"
-- porque el parámetro y la columna tenían el mismo nombre.
-- Esta migración NO toca los contadores ya inicializados.
-- =============================================

-- =============================================
-- 1. Helper: siguiente folio (parámetros sin colisión)
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
-- 2. Wrapper de número de pedido (mismos nombres RPC)
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
-- 3. Wrapper de folio de venta agrupada
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
