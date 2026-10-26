-- =============================================
-- MIGRACIÓN 040: Atributos de precio para Acrílicos
--   - Todos los productos ya existen en el catálogo.
--   - El precio depende únicamente de Impresión Tamaño.
--   - Grosor, color de marco, marco y filo no modifican el precio.
--   - Los precios se importan desde /admin/precios.
-- =============================================

UPDATE producto_atributos pa
SET afecta_precio = (a.nombre = 'Impresión Tamaño')
FROM productos p, categorias c, atributos a
WHERE pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND pa.atributo_id = a.id
  AND c.nombre = 'Acrílicos';
