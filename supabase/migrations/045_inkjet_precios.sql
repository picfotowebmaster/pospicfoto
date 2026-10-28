-- =============================================
-- MIGRACIÓN 045: Atributos de precio para Ink Jet
--   - Rollos: Ancho de Rollo.
--   - Papel Fine Art Mate: Papel Tamaño + Cantidad de Hojas.
--   - Pack hojas: Tipo de papel Ink Jet + Papel Tamaño + Cantidad de Hojas.
--   - Los productos simples usan precio base.
--   - Los precios se importan desde /admin/precios.
-- =============================================

UPDATE producto_atributos pa
SET afecta_precio = true
FROM productos p, categorias c
WHERE pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND c.nombre = 'Ink Jet / Papeles y Materiales';
