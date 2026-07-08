import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardCard } from "./_components/DashboardCard";
import { SignOutButton } from "./_components/SignOutButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AREAS_PRODUCCION_DATA, ESTADOS_PEDIDO } from "@/lib/utils/constantes";
import Link from "next/link";

const ROLES_PRODUCCION = [
  "diseno", "impresion", "laminado", "montaje", "books", "bastidores", "marcos",
  "taller", "corte", "admin", "superadmin",
];

const formatearMoneda = (monto: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(monto);

const formatearFecha = (fecha: Date) =>
  fecha.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  const rol = (profile as { rol?: string } | null)?.rol ?? null;
  const esProduccion = rol ? ROLES_PRODUCCION.includes(rol) : false;
  const esAdmin = rol === "admin" || rol === "superadmin";

  const today = new Date().toISOString().split("T")[0];

  const [pedidosHoyRes, ingresosHoyRes, pendientesRes, estadoRes] = await Promise.all([
    supabase
      .from("pedidos")
      .select("*", { count: "exact", head: true })
      .eq("fecha_recepcion", today),
    supabase
      .from("pedidos")
      .select("total")
      .eq("fecha_recepcion", today),
    supabase
      .from("pedidos")
      .select("area_actual")
      .neq("estado", "entregado"),
    supabase
      .from("pedidos")
      .select("estado"),
  ]);

  const pedidosHoy = pedidosHoyRes.count ?? 0;

  const ingresosHoy = (ingresosHoyRes.data ?? []).reduce(
    (sum, row) => sum + (row.total ?? 0),
    0,
  );

  const pendientesPorArea: Record<string, number> = {};
  for (const row of pendientesRes.data ?? []) {
    const area = (row as { area_actual: string | null }).area_actual;
    if (area) pendientesPorArea[area] = (pendientesPorArea[area] ?? 0) + 1;
  }

  const estadoPorEstado: Record<string, number> = {};
  for (const row of estadoRes.data ?? []) {
    const est = (row as { estado: string | null }).estado;
    if (est) estadoPorEstado[est] = (estadoPorEstado[est] ?? 0) + 1;
  }

  const areasPendientes = AREAS_PRODUCCION_DATA.filter((a) => a.id !== "entregado");

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">PIC PHOTO &mdash; Dashboard</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{formatearFecha(new Date())}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-300">{user.email}</span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <DashboardCard titulo="Pedidos de hoy" valor={pedidosHoy} color="bg-blue-500" />
          <DashboardCard titulo="Ingresos de hoy" valor={formatearMoneda(ingresosHoy)} color="bg-green-500" />
        </div>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Pendientes por &aacute;rea
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {areasPendientes.map((area) => {
              const count = pendientesPorArea[area.id] ?? 0;
              return (
                <DashboardCard
                  key={area.id}
                  titulo={area.nombre}
                  valor={count}
                  color={area.color}
                  href={count > 0 ? "/produccion/kanban" : undefined}
                />
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Estado de producci&oacute;n
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ESTADOS_PEDIDO.map((estado) => {
              const count = estadoPorEstado[estado.value] ?? 0;
              return (
                <DashboardCard
                  key={estado.value}
                  titulo={estado.label}
                  valor={count}
                  color={estado.color}
                />
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Navegaci&oacute;n r&aacute;pida
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/mostrador"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Nuevo Pedido
            </Link>
            {esProduccion && (
              <Link
                href="/produccion/kanban"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Kanban Producci&oacute;n
              </Link>
            )}
            {esAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Administraci&oacute;n
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
