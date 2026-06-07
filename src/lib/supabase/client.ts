import { createBrowserClient } from "@supabase/ssr";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "your_supabase_url_here") {
    if (typeof window !== "undefined") {
      throw new Error("SUPABASE_URL y SUPABASE_ANON_KEY son requeridos. Configúralos en .env.local");
    }
    return null as unknown as ReturnType<typeof createBrowserClient>;
  }
  return createBrowserClient(url, key);
}

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (!_client) {
    _client = getSupabaseClient();
  }
  return _client;
}

export const supabase = getSupabase();
