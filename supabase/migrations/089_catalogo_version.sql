-- =============================================
-- MIGRACIÓN 089: Versión global del catálogo (P1a)
-- Permite que el cliente pregunte si el catálogo cambió antes de
-- descargarlo completo. Solo agrega metadata: NO modifica precios,
-- productos, pedidos ni clientes.
-- =============================================

-- =============================================
-- 1. Tabla de versión
-- =============================================
CREATE TABLE IF NOT EXISTS public.catalogo_version (
  id         TEXT PRIMARY KEY,
  version    BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.catalogo_version (id, version)
VALUES ('global', 1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.catalogo_version ENABLE ROW LEVEL SECURITY;

-- Solo se accede a través de la función/RPC.
REVOKE ALL ON public.catalogo_version FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.catalogo_version TO service_role;

-- =============================================
-- 2. Función que incrementa la versión
-- Solo escribe en catalogo_version (metadata).
-- =============================================
CREATE OR REPLACE FUNCTION public.bump_catalogo_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.catalogo_version
     SET version = version + 1,
         updated_at = now()
   WHERE id = 'global';
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_catalogo_version() FROM PUBLIC;

-- =============================================
-- 3. Triggers en las tablas de catálogo
-- AFTER ... FOR EACH STATEMENT: una vez por operación.
-- =============================================
DROP TRIGGER IF EXISTS trg_catalogo_version_categorias ON public.categorias;
CREATE TRIGGER trg_catalogo_version_categorias
AFTER INSERT OR UPDATE OR DELETE ON public.categorias
FOR EACH STATEMENT EXECUTE FUNCTION public.bump_catalogo_version();

DROP TRIGGER IF EXISTS trg_catalogo_version_productos ON public.productos;
CREATE TRIGGER trg_catalogo_version_productos
AFTER INSERT OR UPDATE OR DELETE ON public.productos
FOR EACH STATEMENT EXECUTE FUNCTION public.bump_catalogo_version();

DROP TRIGGER IF EXISTS trg_catalogo_version_producto_atributos ON public.producto_atributos;
CREATE TRIGGER trg_catalogo_version_producto_atributos
AFTER INSERT OR UPDATE OR DELETE ON public.producto_atributos
FOR EACH STATEMENT EXECUTE FUNCTION public.bump_catalogo_version();

DROP TRIGGER IF EXISTS trg_catalogo_version_producto_atributo_valores ON public.producto_atributo_valores;
CREATE TRIGGER trg_catalogo_version_producto_atributo_valores
AFTER INSERT OR UPDATE OR DELETE ON public.producto_atributo_valores
FOR EACH STATEMENT EXECUTE FUNCTION public.bump_catalogo_version();

DROP TRIGGER IF EXISTS trg_catalogo_version_atributos ON public.atributos;
CREATE TRIGGER trg_catalogo_version_atributos
AFTER INSERT OR UPDATE OR DELETE ON public.atributos
FOR EACH STATEMENT EXECUTE FUNCTION public.bump_catalogo_version();

DROP TRIGGER IF EXISTS trg_catalogo_version_atributo_valores ON public.atributo_valores;
CREATE TRIGGER trg_catalogo_version_atributo_valores
AFTER INSERT OR UPDATE OR DELETE ON public.atributo_valores
FOR EACH STATEMENT EXECUTE FUNCTION public.bump_catalogo_version();

DROP TRIGGER IF EXISTS trg_catalogo_version_producto_precios ON public.producto_precios;
CREATE TRIGGER trg_catalogo_version_producto_precios
AFTER INSERT OR UPDATE OR DELETE ON public.producto_precios
FOR EACH STATEMENT EXECUTE FUNCTION public.bump_catalogo_version();

DROP TRIGGER IF EXISTS trg_catalogo_version_descuentos ON public.descuentos;
CREATE TRIGGER trg_catalogo_version_descuentos
AFTER INSERT OR UPDATE OR DELETE ON public.descuentos
FOR EACH STATEMENT EXECUTE FUNCTION public.bump_catalogo_version();

-- =============================================
-- 4. RPC para consultar la versión actual
-- =============================================
CREATE OR REPLACE FUNCTION public.catalogo_version_actual()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT version FROM public.catalogo_version WHERE id = 'global';
$$;

REVOKE ALL ON FUNCTION public.catalogo_version_actual() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalogo_version_actual()
  TO authenticated, service_role;
