-- =============================================
-- MIGRACIÓN 052: Entidades emisoras por usuario
--   - Catálogo de razones sociales / sucursales que emiten tickets.
--   - Entidad fija por usuario.
--   - Snapshot de la entidad en cada pedido y factura global.
--   - Folios consecutivos por entidad/serie.
-- =============================================

CREATE TABLE IF NOT EXISTS entidades_emisoras (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo            TEXT NOT NULL UNIQUE,
  nombre_comercial  TEXT NOT NULL,
  razon_social      TEXT NOT NULL,
  rfc               TEXT NOT NULL,
  regimen_fiscal    TEXT NOT NULL DEFAULT 'Régimen General Ley de Personas Morales',
  direccion         TEXT NOT NULL,
  telefonos         TEXT,
  email             TEXT,
  sitio_web         TEXT,
  logo_url          TEXT,
  marca_id          UUID REFERENCES marcas(id) ON DELETE SET NULL,
  sucursal_id       UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  cp_expedicion     TEXT NOT NULL DEFAULT '06010',
  serie_factura     TEXT,
  facturacion_key   TEXT NOT NULL DEFAULT 'PIC',
  activo            BOOLEAN NOT NULL DEFAULT true,
  orden             INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (marca_id, sucursal_id)
);

DROP TRIGGER IF EXISTS set_updated_at_entidades_emisoras ON entidades_emisoras;
CREATE TRIGGER set_updated_at_entidades_emisoras
  BEFORE UPDATE ON entidades_emisoras
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

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
VALUES
  (
    'PIC_CUB',
    'PIC PHOTO',
    'PIC PHOTO',
    'PPH180924PK9',
    'Régimen General Ley de Personas Morales',
    'REPÚBLICA DE CUBA #81 LOCAL "A", COL. CENTRO, C.P. 06010, ALCALDÍA CUAUHTÉMOC, CDMX',
    '55 2124 2521 / 55 5518 4687 / 55 7490 9744 · Ventas: 56 5692 5671',
    'miorden@picfoto.mx',
    NULL,
    '/icons/logopicfoto.svg',
    (SELECT id FROM marcas WHERE codigo = 'PIC'),
    (SELECT id FROM sucursales WHERE codigo = 'CUB'),
    '06010',
    'PIC',
    'PIC',
    1
  ),
  (
    'PIC_PAL',
    'Sucursal Palma',
    'PIC PHOTO',
    'PPH180924PK9',
    'Régimen General Ley de Personas Morales',
    'PALMA NORTE #410-D, COL. CENTRO, C.P. 06010, ALCALDÍA CUAUHTÉMOC, CDMX',
    '55 8778 4966 / 55 5510 3709',
    'archivospalma@picfoto.mx',
    'www.picfoto.mx',
    '/icons/logopicfoto.svg',
    (SELECT id FROM marcas WHERE codigo = 'PIC'),
    (SELECT id FROM sucursales WHERE codigo = 'PAL'),
    '06010',
    'PAL',
    'PIC',
    2
  ),
  (
    'FRX_CUB',
    'FRAMEX',
    'Enmarcado Profesional de México',
    'EPM180424491',
    'Régimen General Ley de Personas Morales',
    'REPÚBLICA DE CUBA #81 LOCAL "C", COL. CENTRO, C.P. 06010, ALCALDÍA CUAUHTÉMOC, CDMX',
    '55 5772 6267 / 55 6513 1190',
    'ventas@framex.mx',
    NULL,
    '/icons/framex-icon.png',
    (SELECT id FROM marcas WHERE codigo = 'FRX'),
    (SELECT id FROM sucursales WHERE codigo = 'CUB'),
    '06010',
    'FRX',
    'FRX',
    3
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

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS entidad_emisora_id UUID REFERENCES entidades_emisoras(id) ON DELETE SET NULL;

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS entidad_emisora_id UUID REFERENCES entidades_emisoras(id) ON DELETE SET NULL;

ALTER TABLE facturas_globales
  ADD COLUMN IF NOT EXISTS entidad_emisora_id UUID REFERENCES entidades_emisoras(id) ON DELETE SET NULL;

-- Backfill de perfiles: Palma -> Sucursal Palma; resto -> PIC PHOTO Cuba.
UPDATE profiles
SET entidad_emisora_id = (SELECT id FROM entidades_emisoras WHERE codigo = 'PIC_PAL')
WHERE entidad_emisora_id IS NULL
  AND sucursal_id = (SELECT id FROM sucursales WHERE codigo = 'PAL');

UPDATE profiles
SET entidad_emisora_id = (SELECT id FROM entidades_emisoras WHERE codigo = 'PIC_CUB')
WHERE entidad_emisora_id IS NULL;

-- Backfill de pedidos según marca y sucursal.
UPDATE pedidos p
SET entidad_emisora_id = CASE
  WHEN m.codigo = 'FRX' THEN (SELECT id FROM entidades_emisoras WHERE codigo = 'FRX_CUB')
  WHEN s.codigo = 'PAL' THEN (SELECT id FROM entidades_emisoras WHERE codigo = 'PIC_PAL')
  ELSE (SELECT id FROM entidades_emisoras WHERE codigo = 'PIC_CUB')
END
FROM marcas m, sucursales s
WHERE p.marca_id = m.id
  AND p.sucursal_id = s.id
  AND p.entidad_emisora_id IS NULL;

UPDATE pedidos p
SET entidad_emisora_id = CASE
  WHEN EXISTS (
    SELECT 1 FROM marcas m
    WHERE m.id = p.marca_id AND m.codigo = 'FRX'
  ) THEN (SELECT id FROM entidades_emisoras WHERE codigo = 'FRX_CUB')
  ELSE (SELECT id FROM entidades_emisoras WHERE codigo = 'PIC_CUB')
END
WHERE p.entidad_emisora_id IS NULL;

-- Las facturas globales históricas pertenecen a PIC PHOTO Cuba.
UPDATE facturas_globales
SET entidad_emisora_id = (SELECT id FROM entidades_emisoras WHERE codigo = 'PIC_CUB')
WHERE entidad_emisora_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_entidad_emisora
  ON profiles(entidad_emisora_id) WHERE entidad_emisora_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_entidad_emisora
  ON pedidos(entidad_emisora_id) WHERE entidad_emisora_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_facturas_globales_entidad
  ON facturas_globales(entidad_emisora_id) WHERE entidad_emisora_id IS NOT NULL;

-- =============================================
-- Folios consecutivos por entidad/serie
-- =============================================

CREATE TABLE IF NOT EXISTS folios_factura (
  entidad_emisora_id UUID PRIMARY KEY REFERENCES entidades_emisoras(id) ON DELETE CASCADE,
  serie              TEXT NOT NULL,
  ultimo_folio       BIGINT NOT NULL DEFAULT 0,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO folios_factura (entidad_emisora_id, serie, ultimo_folio)
SELECT
  e.id,
  COALESCE(e.serie_factura, ''),
  GREATEST(
    COALESCE((
      SELECT MAX(NULLIF(regexp_replace(p.factura_folio, '\D', '', 'g'), '')::BIGINT)
      FROM pedidos p
      WHERE p.factura_serie = e.serie_factura
    ), 0),
    COALESCE((
      SELECT MAX(NULLIF(regexp_replace(f.folio, '\D', '', 'g'), '')::BIGINT)
      FROM facturas_globales f
      WHERE f.serie = e.serie_factura
    ), 0)
  )
FROM entidades_emisoras e
ON CONFLICT (entidad_emisora_id) DO UPDATE SET
  serie = EXCLUDED.serie,
  ultimo_folio = GREATEST(folios_factura.ultimo_folio, EXCLUDED.ultimo_folio);

CREATE OR REPLACE FUNCTION generar_folio_factura_entidad(p_entidad_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_serie TEXT;
  v_folio BIGINT;
BEGIN
  SELECT serie_factura INTO v_serie
  FROM entidades_emisoras
  WHERE id = p_entidad_id;

  IF v_serie IS NULL THEN
    RETURN LPAD(nextval('factura_folio_seq')::TEXT, 8, '0');
  END IF;

  INSERT INTO folios_factura (entidad_emisora_id, serie, ultimo_folio)
  VALUES (p_entidad_id, v_serie, 0)
  ON CONFLICT (entidad_emisora_id) DO NOTHING;

  UPDATE folios_factura
  SET ultimo_folio = ultimo_folio + 1,
      serie = v_serie,
      updated_at = now()
  WHERE entidad_emisora_id = p_entidad_id
  RETURNING ultimo_folio INTO v_folio;

  RETURN LPAD(v_folio::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RLS y permisos
-- =============================================

ALTER TABLE entidades_emisoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE folios_factura ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Entidades emisoras legibles por autenticados" ON entidades_emisoras;
CREATE POLICY "Entidades emisoras legibles por autenticados" ON entidades_emisoras
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.entidades_emisoras TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entidades_emisoras TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folios_factura TO service_role;
GRANT EXECUTE ON FUNCTION public.generar_folio_factura_entidad(UUID) TO authenticated, service_role;
