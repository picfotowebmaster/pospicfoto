-- =============================================
-- MIGRACIÓN 042: Atributos de precio para Estuches y Cajas
--   - Las cajas varían de precio por Caja Tamaño.
--   - Los estuches tienen precio fijo (precio base).
--   - Color Vinipiel no modifica el precio.
--   - Los precios se importan desde /admin/precios.
-- =============================================

UPDATE producto_atributos pa
SET afecta_precio = (a.nombre = 'Caja Tamaño')
FROM productos p, categorias c, atributos a
WHERE pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND pa.atributo_id = a.id
  AND c.nombre = 'Estuches y Cajas';
