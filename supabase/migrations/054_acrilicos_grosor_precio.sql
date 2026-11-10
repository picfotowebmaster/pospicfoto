UPDATE producto_atributos pa
SET afecta_precio = (
  a.nombre = 'Impresión Tamaño'
  OR (
    a.nombre = 'Grosor'
    AND p.nombre IN (
      'Acrílico Flotado',
      'FlexiGlass Flotado',
      'Acrílico con Bastidor y Chapetones',
      'Acrílico con Marco y Chapetones'
    )
  )
)
FROM productos p, categorias c, atributos a
WHERE pa.producto_id = p.id
  AND p.categoria_id = c.id
  AND pa.atributo_id = a.id
  AND c.nombre = 'Acrílicos';
