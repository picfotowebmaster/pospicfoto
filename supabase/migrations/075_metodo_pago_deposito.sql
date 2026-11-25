-- =============================================
-- MIGRACIÓN 075: método de pago "Depósito"
--
-- La app ofrece "Depósito" como método de pago (anticipo y saldo),
-- pero pedidos.metodo_pago usa el enum metodo_pago_enum, que solo
-- declaraba Efectivo, Tarjeta y Transferencia. Al registrar una
-- venta cobrada por Depósito el insert fallaba con:
--   22P02 invalid input value for enum metodo_pago_enum: "Depósito"
-- =============================================

ALTER TYPE public.metodo_pago_enum ADD VALUE IF NOT EXISTS 'Depósito';
