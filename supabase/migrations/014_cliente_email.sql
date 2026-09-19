-- =============================================
-- MIGRACIÓN 014: Correo del cliente para envío de factura
-- =============================================

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS cliente_email TEXT,
  ADD COLUMN IF NOT EXISTS factura_email_enviado TIMESTAMPTZ;
