-- =============================================
-- MIGRACIÓN 039: Atributos de precio para Mini Books
--   - Los productos ya existen en el catálogo.
--   - Solo se marcan los atributos que determinan el precio.
--   - Los precios se importan desde /admin/precios.
-- =============================================

UPDATE producto_atributos pa
SET afecta_precio = (
  a.nombre IN ('Mini Book Tamaño', 'Hojas y Páginas', 'Hoja Extra', 'Requiero Diseño')
)
FROM productos p, categorias c, atributos a
WHERE pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND pa.atributo_id = a.id
  AND c.nombre = 'Mini Books';
