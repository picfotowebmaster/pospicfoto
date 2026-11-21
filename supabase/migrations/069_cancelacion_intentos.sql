-- =============================================
-- MIGRACIÓN 069: intentos de cancelación
-- Registra intentos de autorización para limitar
-- la fuerza bruta sobre credenciales de admin.
-- =============================================

CREATE TABLE IF NOT EXISTS public.cancelacion_intentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exito BOOLEAN NOT NULL,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cancelacion_intentos_fallos
  ON public.cancelacion_intentos (solicitante_id, created_at DESC)
  WHERE exito = false;

ALTER TABLE public.cancelacion_intentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Intentos propios insertables" ON public.cancelacion_intentos;
CREATE POLICY "Intentos propios insertables" ON public.cancelacion_intentos
  FOR INSERT TO authenticated
  WITH CHECK (solicitante_id = auth.uid());

DROP POLICY IF EXISTS "Intentos propios legibles" ON public.cancelacion_intentos;
CREATE POLICY "Intentos propios legibles" ON public.cancelacion_intentos
  FOR SELECT TO authenticated
  USING (solicitante_id = auth.uid());

REVOKE ALL ON public.cancelacion_intentos FROM PUBLIC;
REVOKE ALL ON public.cancelacion_intentos FROM anon;
GRANT SELECT, INSERT ON public.cancelacion_intentos TO authenticated;
