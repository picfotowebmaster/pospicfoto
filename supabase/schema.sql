CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================
-- 1. ATRIBUTOS (tipos de atributo dinámico)
-- =============================================
CREATE TABLE atributos (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre  TEXT NOT NULL UNIQUE,
  activo  BOOLEAN DEFAULT true
);

-- =============================================
-- 2. VALORES DE ATRIBUTOS (pool autocompletado)
-- =============================================
CREATE TABLE atributo_valores (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  atributo_id  UUID NOT NULL REFERENCES atributos(id) ON DELETE CASCADE,
  valor        TEXT NOT NULL,
  UNIQUE(atributo_id, valor)
);

-- =============================================
-- 3. HISTORIAL DE PRODUCTOS (memoria orgánica)
-- =============================================
CREATE TABLE productos_historial (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre       TEXT NOT NULL,
  atributos    JSONB DEFAULT '{}',
  veces_usado  INT DEFAULT 1,
  ultimo_uso   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_historial_nombre ON productos_historial USING gin (nombre gin_trgm_ops);

-- =============================================
-- 4. PERFILES (auth + roles)
-- =============================================
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol        TEXT NOT NULL DEFAULT 'mostrador'
             CHECK (rol IN ('mostrador','taller','corte','admin')),
  nombre     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Función para crear perfil automático al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nombre, rol)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email), 'mostrador');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- 5. PEDIDOS
-- =============================================
CREATE TYPE metodo_pago_enum AS ENUM ('Efectivo','Tarjeta','Transferencia');
CREATE TYPE estado_pedido_enum AS ENUM (
  'pendiente','en_taller','en_corte','listo','entregado'
);

CREATE TABLE pedidos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cajero_id           UUID REFERENCES profiles(id),
  cliente_nombre      TEXT NOT NULL,
  cliente_telefono    TEXT,
  fecha_recepcion     DATE DEFAULT CURRENT_DATE,
  hora_recepcion      TIME DEFAULT CURRENT_TIME,
  fecha_entrega       DATE NOT NULL,
  hora_entrega        TIME NOT NULL,
  requiere_correccion BOOLEAN DEFAULT false,
  estado              estado_pedido_enum DEFAULT 'pendiente',
  subtotal            NUMERIC(10,2),
  anticipo            NUMERIC(10,2),
  total               NUMERIC(10,2),
  metodo_pago         metodo_pago_enum,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 6. DETALLE DE PEDIDOS
-- =============================================
CREATE TABLE detalle_pedidos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id        UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_nombre  TEXT NOT NULL,
  cantidad         INT DEFAULT 1,
  precio_unitario  NUMERIC(10,2),
  importe_linea    NUMERIC(10,2),
  atributos        JSONB DEFAULT '{}'
);

CREATE INDEX idx_detalle_pedido ON detalle_pedidos(pedido_id);

-- =============================================
-- TRIGGER updated_at
-- =============================================
CREATE OR REPLACE FUNCTION trigger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON pedidos
FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- =============================================
-- HABILITAR REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE detalle_pedidos;

-- =============================================
-- RLS: Lectura pública de catálogos
-- =============================================
ALTER TABLE atributos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atributo_valores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Catálogos: lectura para autenticados
CREATE POLICY "Atributos legibles por autenticados" ON atributos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Atributo valores legibles por autenticados" ON atributo_valores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Historial legible por autenticados" ON productos_historial
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Historial insertable por autenticados" ON productos_historial
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Historial actualizable por autenticados" ON productos_historial
  FOR UPDATE TO authenticated USING (true);

-- Pedidos: insert por mostrador/admin, lectura por todos autenticados
CREATE POLICY "Pedidos insert por mostrador/admin" ON pedidos
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('mostrador','admin')));

CREATE POLICY "Pedidos legibles por autenticados" ON pedidos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Pedidos actualizables por produccion/admin" ON pedidos
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('taller','corte','admin')));

CREATE POLICY "Detalle pedidos insert por mostrador/admin" ON detalle_pedidos
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol IN ('mostrador','admin')));

CREATE POLICY "Detalle pedidos legibles por autenticados" ON detalle_pedidos
  FOR SELECT TO authenticated USING (true);

-- Profiles: lectura por autenticados, update por admin
CREATE POLICY "Profiles legibles por autenticados" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Profiles actualizables por admin" ON profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));
