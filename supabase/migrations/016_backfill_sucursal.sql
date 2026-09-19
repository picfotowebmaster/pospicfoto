-- =============================================
-- 16. BACKFILL DE SUCURSAL EN PROFILES
-- =============================================
-- El trigger handle_new_user crea perfiles sin sucursal_id,
-- lo que deja el botón PAGAR deshabilitado en mostrador.
-- Asignamos la sucursal por defecto (Palma) a perfiles huérfanos.

UPDATE profiles
SET sucursal_id = (SELECT id FROM sucursales WHERE codigo = 'PAL')
WHERE sucursal_id IS NULL;
