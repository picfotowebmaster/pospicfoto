-- =============================================
-- MIGRACIÓN 043: Atributos de precio para Impresión en Canvas
--   - El producto ya existe en el catálogo.
--   - El precio depende únicamente de Impresión Tamaño.
--   - Los precios se importan desde /admin/precios.
-- =============================================

UPDATE producto_atributos pa
SET afecta_precio = (a.nombre = 'Impresión Tamaño')
FROM productos p, categorias c, atributos a
WHERE pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND pa.atributo_id = a.id
  AND c.nombre = 'Impresión en Canvas';
