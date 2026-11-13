import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  MOTIVOS_CANCELACION_PEDIDO,
  type MotivoCancelacionPedido,
} from "@/lib/utils/cancelacion";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MOTIVOS = MOTIVOS_CANCELACION_PEDIDO.map((motivo) => motivo.value);

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

  let body: { id?: string; motivo?: string; notas?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const id = body?.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const motivo = body?.motivo;
  if (!motivo || !MOTIVOS.includes(motivo as MotivoCancelacionPedido)) {
    return NextResponse.json(
      { error: "Motivo de cancelación inválido" },
      { status: 400 },
    );
  }

  const column = UUID_RE.test(id) ? "id" : "numero_pedido";
  const { data: pedido, error: fetchErr } = await supabase
    .from("pedidos")
    .select("id")
    .eq(column, id)
    .single();

  if (fetchErr || !pedido) {
    return NextResponse.json(
      { error: "Pedido no encontrado" },
      { status: 404 },
    );
  }

  const { data, error } = await supabase.rpc("cancelar_venta", {
    p_pedido_id: pedido.id,
    p_motivo: motivo,
    p_notas: body?.notas?.trim() || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, ...(data as object) });
}
