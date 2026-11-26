-- =============================================
-- MIGRACIÓN 082: gastos de caja por sucursal
-- Registra los gastos de la tienda que se pagan del efectivo de caja
-- para descontarlos del corte del día. La anulación es lógica para
-- conservar el historial del corte.
-- =============================================

CREATE TABLE IF NOT EXISTS public.gastos_caja (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id    UUID NOT NULL REFERENCES public.sucursales(id),
  concepto       TEXT NOT NULL CHECK (btrim(concepto) <> ''),
  categoria      TEXT,
  monto          NUMERIC(10,2) NOT NULL CHECK (monto > 0),
  fecha          DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Mexico_City')::date),
  registrado_por UUID REFERENCES public.profiles(id) DEFAULT auth.uid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  anulado        BOOLEAN NOT NULL DEFAULT false,
  anulado_por    UUID REFERENCES public.profiles(id),
  anulado_en     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gastos_caja_sucursal_fecha
  ON public.gastos_caja(sucursal_id, fecha)
  WHERE anulado = false;

ALTER TABLE public.gastos_caja ENABLE ROW LEVEL SECURITY;

-- Lectura: admin/contador ven todas; mostrador solo su sucursal.
DROP POLICY IF EXISTS "gastos_caja_select" ON public.gastos_caja;
CREATE POLICY "gastos_caja_select" ON public.gastos_caja
  FOR SELECT TO authenticated
  USING (
    public.rol_actual() IN ('admin', 'superadmin', 'contador')
    OR (
      public.rol_actual() = 'mostrador'
      AND public.sucursal_actual() IS NOT NULL
      AND gastos_caja.sucursal_id = public.sucursal_actual()
    )
  );

-- Alta: mostrador solo en su sucursal; admin/superadmin en cualquiera.
DROP POLICY IF EXISTS "gastos_caja_insert" ON public.gastos_caja;
CREATE POLICY "gastos_caja_insert" ON public.gastos_caja
  FOR INSERT TO authenticated
  WITH CHECK (
    public.rol_actual() IN ('mostrador', 'admin', 'superadmin')
    AND registrado_por = auth.uid()
    AND (
      public.rol_actual() IN ('admin', 'superadmin')
      OR sucursal_id = public.sucursal_actual()
    )
  );

-- Anulación: solo admin/superadmin.
DROP POLICY IF EXISTS "gastos_caja_update" ON public.gastos_caja;
CREATE POLICY "gastos_caja_update" ON public.gastos_caja
  FOR UPDATE TO authenticated
  USING (public.rol_actual() IN ('admin', 'superadmin'))
  WITH CHECK (public.rol_actual() IN ('admin', 'superadmin'));

GRANT SELECT, INSERT, UPDATE ON public.gastos_caja TO authenticated;
GRANT ALL ON public.gastos_caja TO service_role;

NOTIFY pgrst, 'reload schema';
