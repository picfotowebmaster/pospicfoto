-- =============================================
-- MIGRACIÓN 003: Roles por departamento
-- =============================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_rol_check CHECK (
  rol IN (
    'mostrador',
    'diseno',
    'impresion',
    'laminado',
    'montaje',
    'books',
    'bastidores',
    'marcos',
    'taller',
    'corte',
    'admin',
    'superadmin'
  )
);
