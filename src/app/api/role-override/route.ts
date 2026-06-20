import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const ROLES_DESTINO: Record<string, string> = {
  mostrador: "/mostrador",
  diseno: "/produccion/kanban",
  impresion: "/produccion/kanban",
  laminado: "/produccion/kanban",
  montaje: "/produccion/kanban",
  books: "/produccion/kanban",
  bastidores: "/produccion/kanban",
  marcos: "/produccion/kanban",
  taller: "/produccion/kanban",
  corte: "/produccion/kanban",
};

export async function POST(request: NextRequest) {
  const { role, redirectTo } = await request.json();

  if (!role || !ROLES_DESTINO[role]) {
    return NextResponse.json(
      { error: "Rol inválido" },
      { status: 400 }
    );
  }

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
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "superadmin"].includes(profile.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const destino = redirectTo || ROLES_DESTINO[role];
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
  const response = NextResponse.json({ success: true, redirectTo: "/admin" });
  response.cookies.set("role_override", "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}
