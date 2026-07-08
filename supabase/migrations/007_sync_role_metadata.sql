-- Function that syncs profiles.rol to auth.users.raw_user_meta_data
-- Runs SECURITY DEFINER (as the function owner) to allow cross-schema writes
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{rol}',
    to_jsonb(NEW.rol)
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger: fires when a profile row is inserted or its rol column changes
DROP TRIGGER IF EXISTS trg_sync_profile_role ON public.profiles;
CREATE TRIGGER trg_sync_profile_role
  AFTER INSERT OR UPDATE OF rol ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_role_to_metadata();
