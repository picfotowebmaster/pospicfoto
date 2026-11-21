import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { listarAutorizadoresCancelacion } from "@/lib/services/autorizadoresCancelacion";

export const dynamic = "force-dynamic";

const ROLES_PERMITIDOS = new Set(["mostrador", "admin", "superadmin"]);

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Configuración de Supabase faltante" },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // no-op en API route
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!perfil || !ROLES_PERMITIDOS.has(perfil.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const autorizadores = await listarAutorizadoresCancelacion();
    return NextResponse.json(
      { autorizadores },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error(
      "No se pudieron listar los autorizadores de cancelación:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "No se pudieron cargar los administradores." },
      { status: 500 },
    );
  }
}
