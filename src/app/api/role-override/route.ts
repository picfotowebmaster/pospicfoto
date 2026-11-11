import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  ROLE_DESTINO,
  esAdminRol,
  rolesSwitchDisponibles,
} from "@/lib/utils/roles";

async function getProfileRole() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op en API route
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, rol: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  return { user, rol: (profile?.rol as string | null) ?? null };
}

export async function POST(request: NextRequest) {
  const { role } = await request.json();

  if (!role || !ROLE_DESTINO[role]) {
    return NextResponse.json(
      { error: "Rol inválido" },
      { status: 400 },
    );
  }

  const { user, rol } = await getProfileRole();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const permitidos = rolesSwitchDisponibles(rol);

  if (!permitidos.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const destino = ROLE_DESTINO[role];
  const response = NextResponse.json({ success: true, redirectTo: destino });
  response.cookies.set("role_override", role, {
    path: "/",
    maxAge: 60 * 60 * 8,
    httpOnly: false,
    sameSite: "lax",
  });

  return response;
}

export async function DELETE() {
  const { user, rol } = await getProfileRole();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const destino =
    rol === "taller"
      ? "/produccion/kanban"
      : esAdminRol(rol)
        ? "/admin"
        : "/";

  const response = NextResponse.json({ success: true, redirectTo: destino });
  response.cookies.set("role_override", "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}
