ALTER TABLE public.producto_precios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Precios legibles por autenticados" ON public.producto_precios;
CREATE POLICY "Precios legibles por autenticados" ON public.producto_precios
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.producto_precios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_precios TO service_role;

ALTER TABLE public.producto_precios_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Historial de precios legible por autenticados" ON public.producto_precios_historial;
REVOKE SELECT ON public.producto_precios_historial FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.producto_precios_historial TO service_role;
