import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { puedeVerReportesCompletos } from "@/lib/utils/roles";
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
    .select("rol, nombre")
    .eq("id", user.id)
    .single();

  const rol = (profile?.rol as string | null) ?? "mostrador";
  const nombre = (profile?.nombre as string | null) ?? "";

  return (
    <ReportesContables
      rol={rol}
      puedeVerTodo={puedeVerReportesCompletos(rol)}
      usuarioId={user.id}
      usuarioNombre={nombre}
    />
  );
}
