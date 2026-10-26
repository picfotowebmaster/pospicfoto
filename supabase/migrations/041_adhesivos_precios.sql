-- =============================================
-- MIGRACIÓN 041: Atributos de precio para Adhesivos
--   - Los productos ya existen en el catálogo.
--   - Cada producto variable tiene un solo atributo de precio:
--     Ancho de rollo, Largo de Rollo o Tamaño Easy Sheet.
--   - Los productos simples usan un precio base.
--   - Los precios se importan desde /admin/precios.
-- =============================================

UPDATE producto_atributos pa
SET afecta_precio = true
FROM productos p, categorias c
WHERE pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND c.nombre = 'Adhesivos';
