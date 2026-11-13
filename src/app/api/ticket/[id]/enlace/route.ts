import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  crearOReutilizarEnlace,
  revocarEnlacesDePedido,
} from "@/lib/services/enlacesCompartidos";
import { urlTicketCompartido } from "@/lib/utils/baseUrl";

const ROLES_PERMITIDOS = ["mostrador", "admin", "superadmin", "contador"];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AdminClient = ReturnType<typeof createAdminClient>;

interface AutorizacionOk {
  userId: string;
}

async function autorizar(): Promise<
  AutorizacionOk | { error: NextResponse }
> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      error: NextResponse.json(
        { error: "Configuración de Supabase faltante" },
        { status: 500 },
      ),
    };
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
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!profile || !ROLES_PERMITIDOS.includes(profile.rol)) {
    return {
      error: NextResponse.json({ error: "No autorizado" }, { status: 403 }),
    };
  }

  return { userId: user.id };
}

async function resolverPedido(
  admin: AdminClient,
  id: string,
): Promise<{ id: string } | null> {
  const { data: porNumero } = await admin
    .from("pedidos")
    .select("id")
    .eq("numero_pedido", id)
    .maybeSingle();

  if (porNumero) return porNumero as { id: string };

  if (UUID_RE.test(id)) {
    const { data: porId } = await admin
      .from("pedidos")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (porId) return porId as { id: string };
  }

  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await autorizar();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const admin = createAdminClient();
  const pedido = await resolverPedido(admin, id);

  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  try {
    const enlace = await crearOReutilizarEnlace(pedido.id, auth.userId);

    return NextResponse.json({
      success: true,
      token: enlace.token,
      expiresAt: enlace.expires_at,
      url: urlTicketCompartido(request.nextUrl.origin, enlace.token),
    });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error al generar enlace de ticket:", err);
    return NextResponse.json(
      { error: `No se pudo generar el enlace: ${detalle}` },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await autorizar();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const admin = createAdminClient();
  const pedido = await resolverPedido(admin, id);

  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  try {
    await revocarEnlacesDePedido(pedido.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error al revocar enlace de ticket:", err);
    return NextResponse.json(
      { error: `No se pudo revocar el enlace: ${detalle}` },
      { status: 500 },
    );
  }
}
