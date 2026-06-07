import { createClient } from "@supabase/supabase-js";

function getSupabaseAdminConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY es requerida para operaciones de admin.");
  }

  const baseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "");

  return { url: baseUrl, key };
}

export function createAdminClient() {
  const config = getSupabaseAdminConfig();
  return createClient(config.url, config.key);
}
