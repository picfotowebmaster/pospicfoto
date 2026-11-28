import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarTicketPorCorreo } from "@/lib/services/email";
import { crearOReutilizarEnlace } from "@/lib/services/enlacesCompartidos";
import { resolverBaseUrl, urlTicketCompartido } from "@/lib/utils/baseUrl";
import type { EntidadEmisora, Pedido } from "@/lib/supabase/types";

const ROLES_PERMITIDOS = ["mostrador", "admin", "superadmin", "contador"];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SELECT_COMPLETO = "*, detalle_pedidos(*), pagos_pedido(*)";
const SELECT_BASICO = "*, detalle_pedidos(*)";

type AdminClient = ReturnType<typeof createAdminClient>;
type ColumnaPedido = "numero_pedido" | "id";

interface ResultadoBusqueda {
  pedido: Pedido | null;
  error: string | null;
}

async function buscarPedido(
  admin: AdminClient,
  columna: ColumnaPedido,
  valor: string,
): Promise<ResultadoBusqueda> {
  const consultar = (select: string) =>
    admin
      .from("pedidos")
      .select(select)
      .eq(columna, valor)
      .maybeSingle();

  const { data, error } = await consultar(SELECT_COMPLETO);
  if (!error) {
    return { pedido: (data as unknown as Pedido) ?? null, error: null };
  }

  console.error(
    `No se pudo consultar el pedido por ${columna} con pagos_pedido; se reintenta sin el detalle de pagos:`,
    error,
  );

  const { data: basico, error: errorBasico } = await consultar(SELECT_BASICO);
  if (errorBasico) {
    return { pedido: null, error: errorBasico.message };
  }

  return { pedido: (basico as unknown as Pedido) ?? null, error: null };
}

async function buscarPedidosDeFactura(
  admin: AdminClient,
  pedido: Pedido,
): Promise<Pedido[]> {
  const factura = pedido.factura_numero;
  if (!factura || factura === pedido.numero_pedido) return [pedido];

  const { data, error } = await admin
    .from("pedidos")
    .select(SELECT_COMPLETO)
    .eq("factura_numero", factura)
    .order("created_at", { ascending: true });

  if (!error && data && data.length > 0) {
    return data as unknown as Pedido[];
  }

  if (error) {
    console.error(
      "No se pudieron consultar los pedidos de la factura con pagos_pedido; se reintenta sin el detalle de pagos:",
      error,
    );
  }

  const { data: basico, error: errorBasico } = await admin
    .from("pedidos")
    .select(SELECT_BASICO)
    .eq("factura_numero", factura)
    .order("created_at", { ascending: true });

  if (errorBasico) {
    console.error("No se pudieron consultar los pedidos de la factura:", errorBasico);
    return [pedido];
  }

  return (basico as unknown as Pedido[]) ?? [pedido];
}

export async function POST(request: NextRequest) {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!profile || !ROLES_PERMITIDOS.includes(profile.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { id?: string; email?: string; incluirEnlace?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const id = body?.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const admin = createAdminClient();

  const porNumero = await buscarPedido(admin, "numero_pedido", id);
  if (porNumero.error) {
    return NextResponse.json(
      { error: `No se pudo consultar el pedido: ${porNumero.error}` },
      { status: 500 },
    );
  }

  let pedido = porNumero.pedido;

  if (!pedido && UUID_RE.test(id)) {
    const porId = await buscarPedido(admin, "id", id);
    if (porId.error) {
      return NextResponse.json(
        { error: `No se pudo consultar el pedido: ${porId.error}` },
        { status: 500 },
      );
    }
    pedido = porId.pedido;
  }

  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  let pedidos = await buscarPedidosDeFactura(admin, pedido);

  const cajeroIds = [
    ...new Set(
      pedidos
        .map((p) => p.cajero_id)
        .filter((valor): valor is string => Boolean(valor)),
    ),
  ];
  if (cajeroIds.length > 0) {
    const { data: vendedores } = await admin
      .from("profiles")
      .select("id, nombre")
      .in("id", cajeroIds);
    const nombres = new Map(
      (vendedores ?? []).map((v) => [v.id, v.nombre?.trim() || null]),
    );
    pedidos = pedidos.map((p) => ({
      ...p,
      vendedor_nombre: p.cajero_id ? nombres.get(p.cajero_id) ?? null : null,
    }));
  }

  const emailOverride =
    typeof body.email === "string" ? body.email.trim() : "";
  const email =
    emailOverride ||
    pedido.cliente_email ||
    pedidos.find((p) => p.cliente_email)?.cliente_email;

  if (!email) {
    return NextResponse.json(
      { error: "El pedido no tiene correo del cliente" },
      { status: 400 },
    );
  }

  if (emailOverride && !EMAIL_RE.test(emailOverride)) {
    return NextResponse.json(
      { error: "Correo electrónico inválido" },
      { status: 400 },
    );
  }

  const emisores = new Map<string, EntidadEmisora>();
  const entidadIds = [
    ...new Set(
      pedidos
        .map((p) => p.entidad_emisora_id)
        .filter((valor): valor is string => Boolean(valor)),
    ),
  ];
  if (entidadIds.length > 0) {
    const { data } = await admin
      .from("entidades_emisoras")
      .select("*")
      .in("id", entidadIds);
    for (const emisor of (data ?? []) as EntidadEmisora[]) {
      emisores.set(emisor.id, emisor);
    }
  }

  try {
    const baseUrl = resolverBaseUrl(request.nextUrl.origin);
    let urlTicket: string | null = null;
    if (body.incluirEnlace) {
      const enlace = await crearOReutilizarEnlace(pedido.id, user.id);
      urlTicket = urlTicketCompartido(request.nextUrl.origin, enlace.token);
    }

    await enviarTicketPorCorreo({
      to: email,
      pedidos,
      emisores,
      baseUrl,
      urlTicket,
    });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error al enviar ticket por correo:", err);
    return NextResponse.json(
      { error: `No se pudo enviar el ticket: ${detalle}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, email });
}
