import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarTicketPorCorreo } from "@/lib/services/email";
import type { Pedido } from "@/lib/supabase/types";

const ROLES_PERMITIDOS = ["mostrador", "admin", "superadmin", "contador"];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  let body: { id?: string };
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

  let pedido: Pedido | null = null;

  const { data: porNumero } = await admin
    .from("pedidos")
    .select("*, detalle_pedidos(*)")
    .eq("numero_pedido", id)
    .maybeSingle();

  if (porNumero) {
    pedido = porNumero as unknown as Pedido;
  } else if (UUID_RE.test(id)) {
    const { data: porId } = await admin
      .from("pedidos")
      .select("*, detalle_pedidos(*)")
      .eq("id", id)
      .maybeSingle();
    pedido = (porId as unknown as Pedido) ?? null;
  }

  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const email = pedido.cliente_email;
  if (!email) {
    return NextResponse.json(
      { error: "El pedido no tiene correo del cliente" },
      { status: 400 },
    );
  }

  try {
    await enviarTicketPorCorreo({ to: email, pedido });
  } catch (err) {
    console.error("Error al enviar ticket por correo:", err);
    return NextResponse.json(
      { error: "No se pudo enviar el ticket" },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, email });
}
