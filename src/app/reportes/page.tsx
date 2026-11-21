import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { puedeVerReportesCompletos, rutaInicioPorRol } from "@/lib/utils/roles";
import { ReportesContables } from "./_components/ReportesContables";

export default async function ReportesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, nombre, sucursal_id, marca_id")
    .eq("id", user.id)
    .single();

  const rol = (profile?.rol as string | null) ?? "mostrador";
  const sucursalId = (profile?.sucursal_id as string | null) ?? null;
  const marcaId = (profile?.marca_id as string | null) ?? null;
  const puedeVerTodo = puedeVerReportesCompletos(rol);
  const alcance = puedeVerTodo
    ? "global"
    : rol === "mostrador"
      ? "sucursal"
      : null;

  if (!alcance) {
    redirect(rutaInicioPorRol(rol));
  }

  let sucursalNombre: string | null = null;
  if (sucursalId) {
    const { data: sucursal } = await supabase
      .from("sucursales")
      .select("nombre")
      .eq("id", sucursalId)
      .maybeSingle();
    sucursalNombre = (sucursal?.nombre as string | null) ?? null;
  }

  let marcaNombre: string | null = null;
  if (marcaId) {
    const { data: marca } = await supabase
      .from("marcas")
      .select("nombre")
      .eq("id", marcaId)
      .maybeSingle();
    marcaNombre = (marca?.nombre as string | null) ?? null;
  }

  return (
    <ReportesContables
      rol={rol}
      puedeVerTodo={puedeVerTodo}
      sucursalId={puedeVerTodo ? null : sucursalId}
      sucursalNombre={puedeVerTodo ? null : sucursalNombre}
      marcaId={puedeVerTodo ? null : marcaId}
      marcaNombre={puedeVerTodo ? null : marcaNombre}
    />
  );
}
