-- =============================================
-- MIGRACIÓN 056: Datos fiscales por combinación y
-- razón social / sucursal separadas por usuario.
--   - Agrega la combinación FRAMEX + Palma.
--   - Guarda marca_id en profiles además de sucursal_id.
--   - La entidad emisora se deriva de marca + sucursal.
-- =============================================

-- =============================================
-- 1. Cuarta combinación: FRAMEX + Palma
-- =============================================

INSERT INTO entidades_emisoras (
  codigo,
  nombre_comercial,
  razon_social,
  rfc,
  regimen_fiscal,
  direccion,
  telefonos,
  email,
  sitio_web,
  logo_url,
  marca_id,
  sucursal_id,
  cp_expedicion,
  serie_factura,
  facturacion_key,
  orden
)
VALUES (
  'FRX_PAL',
  'FRAMEX',
  'Enmarcado Profesional de México',
  'EPM180424491',
  'Régimen General Ley de Personas Morales',
  'PALMA NORTE #410-D, COL. CENTRO, C.P. 06010, ALCALDÍA CUAUHTÉMOC, CDMX',
  '55 5772 6267 / 55 6513 1190',
  'ventas@framex.mx',
  NULL,
  '/icons/framex-icon.png',
  (SELECT id FROM marcas WHERE codigo = 'FRX'),
  (SELECT id FROM sucursales WHERE codigo = 'PAL'),
  '06010',
  'FRXPAL',
  'FRX',
  4
)
ON CONFLICT (codigo) DO UPDATE SET
  nombre_comercial = EXCLUDED.nombre_comercial,
  razon_social = EXCLUDED.razon_social,
  rfc = EXCLUDED.rfc,
  regimen_fiscal = EXCLUDED.regimen_fiscal,
  direccion = EXCLUDED.direccion,
  telefonos = EXCLUDED.telefonos,
  email = EXCLUDED.email,
  sitio_web = EXCLUDED.sitio_web,
  logo_url = EXCLUDED.logo_url,
  marca_id = EXCLUDED.marca_id,
  sucursal_id = EXCLUDED.sucursal_id,
  cp_expedicion = EXCLUDED.cp_expedicion,
  serie_factura = EXCLUDED.serie_factura,
  facturacion_key = EXCLUDED.facturacion_key,
  activo = true,
  orden = EXCLUDED.orden;

INSERT INTO folios_factura (entidad_emisora_id, serie, ultimo_folio)
SELECT e.id, COALESCE(e.serie_factura, ''), 0
FROM entidades_emisoras e
WHERE e.codigo = 'FRX_PAL'
ON CONFLICT (entidad_emisora_id) DO NOTHING;

-- =============================================
-- 2. Razón social (marca) separada de la sucursal
-- =============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marca_id UUID REFERENCES marcas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_marca
  ON profiles(marca_id) WHERE marca_id IS NOT NULL;

-- Backfill: marca desde la entidad emisora ya asignada.
UPDATE profiles p
SET marca_id = e.marca_id
FROM entidades_emisoras e
WHERE p.entidad_emisora_id = e.id
  AND p.marca_id IS NULL
  AND e.marca_id IS NOT NULL;

-- Completar la sucursal desde la entidad asignada.
UPDATE profiles p
SET sucursal_id = e.sucursal_id
FROM entidades_emisoras e
WHERE p.entidad_emisora_id = e.id
  AND p.sucursal_id IS NULL
  AND e.sucursal_id IS NOT NULL;

-- Perfiles históricos sin marca: se asume PICFOTO (igual que la migración 052).
UPDATE profiles p
SET marca_id = (SELECT id FROM marcas WHERE codigo = 'PIC')
WHERE p.marca_id IS NULL
  AND p.sucursal_id IS NOT NULL;

-- Deriva la entidad emisora para perfiles sin entidad pero con marca y sucursal.
UPDATE profiles p
SET entidad_emisora_id = e.id
FROM entidades_emisoras e
WHERE p.entidad_emisora_id IS NULL
  AND p.marca_id IS NOT NULL
  AND p.sucursal_id IS NOT NULL
  AND e.marca_id = p.marca_id
  AND e.sucursal_id = p.sucursal_id
  AND e.activo = true;
