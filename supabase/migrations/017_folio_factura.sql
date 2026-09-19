-- =============================================
-- MIGRACIÓN 017: Folio consecutivo de factura
-- =============================================

-- Secuencia global para folio de factura
CREATE SEQUENCE IF NOT EXISTS factura_folio_seq START 1;

-- Función que devuelve el siguiente folio (zero-padded)
CREATE OR REPLACE FUNCTION generar_folio_factura()
RETURNS TEXT AS $$
  SELECT LPAD(nextval('factura_folio_seq')::TEXT, 8, '0');
$$ LANGUAGE SQL;

-- Persistir serie/folio en el pedido
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS factura_serie TEXT,
  ADD COLUMN IF NOT EXISTS factura_folio TEXT;
