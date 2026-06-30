import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const ROLES_PRODUCCION = [
  "diseno", "impresion", "laminado", "montaje", "books", "bastidores", "marcos",
  "taller", "corte", "admin", "superadmin",
];

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "your_supabase_url_here") return null;
  return { url, key };
}

function getAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

let _adminClient: ReturnType<typeof createClient> | null = null;
function getAdminClient() {
  if (_adminClient) return _adminClient;
  const config = getAdminConfig();
  if (!config) throw new Error("SUPABASE_SERVICE_ROLE_KEY requerida");
  _adminClient = createClient(config.url, config.key);
  return _adminClient;
}

export async function middleware(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname !== "/auth/login" && pathname !== "/auth/reset-password") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (user && pathname === "/auth/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (user && (pathname.startsWith("/produccion/taller") || pathname.startsWith("/produccion/corte") || pathname.startsWith("/produccion/kanban"))) {
    const admin = getAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single() as { data: { rol: string } | null };

    if (!profile) {
      // Si no existe el perfil, redirigir a mostrador
      return NextResponse.redirect(new URL("/mostrador?mensaje=perfil_no_encontrado", request.url));
    }

    if (!ROLES_PRODUCCION.includes(profile.rol)) {
      return NextResponse.redirect(new URL("/mostrador?mensaje=acceso_denegado", request.url));
    }
  }

  if (user && pathname.startsWith("/admin")) {
    const admin = getAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single() as { data: { rol: string } | null };

    if (!profile) {
      return NextResponse.redirect(new URL("/mostrador?mensaje=perfil_no_encontrado", request.url));
    }

    if (pathname.startsWith("/admin/usuarios")) {
      if (profile.rol !== "superadmin") {
        return NextResponse.redirect(new URL("/mostrador?mensaje=acceso_denegado", request.url));
      }
    } else if (!["admin", "superadmin"].includes(profile.rol)) {
      return NextResponse.redirect(new URL("/mostrador?mensaje=acceso_denegado", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
