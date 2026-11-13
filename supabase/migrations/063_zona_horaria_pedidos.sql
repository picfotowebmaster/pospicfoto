-- =============================================
-- MIGRACIÓN 063: Fecha/hora de recepción en zona México
-- Corrige pedidos guardados con la fecha UTC del servidor.
-- =============================================

ALTER TABLE pedidos
  ALTER COLUMN fecha_recepcion SET DEFAULT (timezone('America/Mexico_City', now())::date),
  ALTER COLUMN hora_recepcion SET DEFAULT (timezone('America/Mexico_City', now())::time);

-- Corregir pedidos históricos usando el momento real de creación.
-- Los pedidos capturados por la aplicación no establecían fecha_recepcion
-- manualmente, por lo que created_at es la fuente más confiable.
UPDATE pedidos
SET
  fecha_recepcion = (created_at AT TIME ZONE 'America/Mexico_City')::date,
  hora_recepcion = (created_at AT TIME ZONE 'America/Mexico_City')::time
WHERE created_at IS NOT NULL
  AND (
    fecha_recepcion <> (created_at AT TIME ZONE 'America/Mexico_City')::date
    OR hora_recepcion <> (created_at AT TIME ZONE 'America/Mexico_City')::time
  );
