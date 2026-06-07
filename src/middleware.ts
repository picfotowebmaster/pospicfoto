import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url === "your_supabase_url_here") return null;
  return { url, key };
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
    return NextResponse.redirect(new URL("/mostrador", request.url));
  }

  if (user && pathname === "/") {
    return NextResponse.redirect(new URL("/mostrador", request.url));
  }

  if (user && (pathname.startsWith("/produccion/taller") || pathname.startsWith("/produccion/corte"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (!profile) {
      // Si no existe el perfil, redirigir a mostrador
      return NextResponse.redirect(new URL("/mostrador?mensaje=perfil_no_encontrado", request.url));
    }

    if (!["taller", "corte", "admin"].includes(profile.rol)) {
      return NextResponse.redirect(new URL("/mostrador?mensaje=acceso_denegado", request.url));
    }
  }

  if (user && pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (!profile) {
      // Si no existe el perfil, redirigir a mostrador
      return NextResponse.redirect(new URL("/mostrador?mensaje=perfil_no_encontrado", request.url));
    }

    if (profile.rol !== "admin") {
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
