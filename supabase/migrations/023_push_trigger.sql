-- =============================================
-- MIGRACIÓN 023: Push garantizado desde Postgres (pg_net)
--
-- Envía notificaciones push aunque el cliente cierre la app,
-- llamando a la edge function `send-push` desde un trigger.
--
-- REQUISITO (una sola vez, en el SQL Editor o por CLI):
--   select vault.create_secret('https://TU-PROYECTO.supabase.co', 'project_url', 'URL del proyecto');
--   select vault.create_secret('TU_SERVICE_ROLE_KEY', 'service_role_key', 'Service role key');
--
-- Si los secretos no existen, el trigger no hace nada (no rompe la app).
-- Enrutamiento (idéntico a la edge function):
--   * area  -> operarios del área + admin/superadmin
--   * roles -> solo esos roles
-- =============================================

-- 1. Extensión pg_net (si no está disponible, se ignora)
DO $$
BEGIN
  EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_net';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net no disponible: %', SQLERRM;
END $$;

-- 2. Helper para leer secretos de Vault (security definer)
CREATE OR REPLACE FUNCTION public.get_app_secret(nombre TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = nombre
  LIMIT 1;
  RETURN v_secret;
EXCEPTION WHEN OTHERS THEN
  -- Vault no disponible o sin permisos: degradar sin romper
  RETURN NULL;
END;
$$;

-- 3. Función de trigger
CREATE OR REPLACE FUNCTION public.notificar_push_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url   TEXT;
  v_key   TEXT;
  v_area  TEXT;
  v_title TEXT;
  v_body  TEXT;
  v_tag   TEXT;
  v_roles JSONB := NULL;
  v_payload JSONB;
BEGIN
  v_url := public.get_app_secret('project_url');
  v_key := public.get_app_secret('service_role_key');

  -- Sin configuración: salir en silencio
  IF v_url IS NULL OR v_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_title := 'Nuevo pedido';
    v_body  := NEW.cliente_nombre || COALESCE(' · ' || NEW.numero_pedido, '');
    v_area  := NEW.area_actual;
    v_tag   := 'nuevo-pedido';

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.requiere_correccion AND NOT COALESCE(OLD.requiere_correccion, FALSE) THEN
      v_title := 'Corrección solicitada';
      v_body  := NEW.cliente_nombre || COALESCE(' · ' || NEW.motivo_correccion, '');
      v_roles := '["admin","superadmin"]'::JSONB;
      v_tag   := 'correccion';

    ELSIF NEW.area_actual IS DISTINCT FROM OLD.area_actual THEN
      -- No notificar entradas a estados terminales
      IF NEW.area_actual IN ('entregado', 'listo') THEN
        RETURN NEW;
      END IF;
      v_title := 'Pedido en tu área';
      v_body  := NEW.cliente_nombre || COALESCE(' · ' || NEW.numero_pedido, '');
      v_area  := NEW.area_actual;
      v_tag   := 'area-' || NEW.area_actual;

    ELSIF NEW.prioridad = 'urgente' AND OLD.prioridad IS DISTINCT FROM 'urgente' THEN
      v_title := 'Pedido prioritario';
      v_body  := NEW.cliente_nombre;
      v_area  := NEW.area_actual;
      v_tag   := 'prioridad';

    ELSIF NEW.asignado_a IS DISTINCT FROM OLD.asignado_a AND NEW.asignado_a IS NOT NULL THEN
      v_title := 'Pedido asignado';
      v_body  := NEW.cliente_nombre;
      v_area  := NEW.area_actual;
      v_tag   := 'asignado';

    ELSIF NEW.saldo_cobrado AND NOT COALESCE(OLD.saldo_cobrado, FALSE) THEN
      v_title := 'Saldo cobrado';
      v_body  := NEW.cliente_nombre;
      v_area  := NEW.area_actual;
      v_tag   := 'saldo';

    ELSE
      RETURN NEW;
    END IF;
  END IF;

  v_payload := jsonb_build_object(
    'title', v_title,
    'body',  v_body,
    'area',  v_area,
    'roles', v_roles,
    'url',   '/produccion/kanban',
    'tag',   v_tag
  );

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/send-push',
    body    := v_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

-- 4. Trigger sobre los cambios relevantes
DROP TRIGGER IF EXISTS trg_push_pedidos ON public.pedidos;
CREATE TRIGGER trg_push_pedidos
AFTER INSERT OR UPDATE OF
  area_actual, requiere_correccion, prioridad, asignado_a, saldo_cobrado
ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.notificar_push_pedido();
