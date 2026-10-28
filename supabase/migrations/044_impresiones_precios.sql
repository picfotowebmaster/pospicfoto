-- =============================================
-- MIGRACIÓN 044: Atributos de precio para Impresiones
--   - Impresión Fotográfica Digital: Impresión Tamaño + Papel.
--   - Papeles con textura: Impresión Tamaño + Tipo de Impresión.
--   - Margen Blanco, Textura y Corrección de Color no modifican el precio.
--   - Los precios se importan desde /admin/precios.
-- =============================================

UPDATE producto_atributos pa
SET afecta_precio = (
  a.nombre IN ('Impresión Tamaño', 'Papel', 'Tipo de Impresión')
)
FROM productos p, categorias c, atributos a
WHERE pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND pa.atributo_id = a.id
  AND c.nombre = 'Impresiones';
