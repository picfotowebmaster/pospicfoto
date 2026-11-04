import { supabase } from "../supabase/client";
import type { ClienteFiscal, DatosFiscalesPedido } from "../supabase/types";

type DatosFiscalesGuardables = DatosFiscalesPedido & {
  email?: string;
  telefono?: string;
};

export async function guardarClienteFiscal(
  datos: DatosFiscalesGuardables,
): Promise<void> {
  const rfc = datos.cliente_rfc?.trim().toUpperCase();
  if (!datos.requiere_factura || !rfc) return;

  const { error } = await supabase.from("clientes_fiscales").upsert(
    {
      rfc,
      razon_social: datos.cliente_razon_social?.trim() ?? "",
      regimen_fiscal: datos.cliente_regimen_fiscal || null,
      uso_cfdi: datos.cliente_uso_cfdi || null,
      cp_fiscal: datos.cliente_cp_fiscal || null,
      email: datos.email?.trim() || null,
      telefono: datos.telefono?.trim() || null,
    },
    { onConflict: "rfc" },
  );

  if (error) throw error;
}

export async function buscarClienteFiscal(
  telefono: string,
  email: string,
): Promise<ClienteFiscal | null> {
  const tel = telefono.trim();
  const correo = email.trim();

  if (tel) {
    const { data, error } = await supabase
      .from("clientes_fiscales")
      .select("*")
      .eq("telefono", tel)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as ClienteFiscal;
  }

  if (correo) {
    const { data, error } = await supabase
      .from("clientes_fiscales")
      .select("*")
      .eq("email", correo)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as ClienteFiscal;
  }

  return null;
}
