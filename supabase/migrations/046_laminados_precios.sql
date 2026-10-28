-- =============================================
-- MIGRACIÓN 046: Atributos de precio para Rollos de Laminado Fotográfico
--   - Rollo de Laminado Cristal: Ancho de Rollo.
--   - Rollo de Laminado Fotográfico: Ancho de Rollo + Textura.
--   - Los precios se importan desde /admin/precios.
-- =============================================

UPDATE producto_atributos pa
SET afecta_precio = true
FROM productos p, categorias c
WHERE pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND c.nombre = 'Rollos de Laminado Fotográfico';
