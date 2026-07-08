"use client";

const RUTA_LABELS: Record<string, string> = {
  R1: "Impresión",
  R2: "Marcos",
  R3: "Books",
  R4: "Laminado",
  "N/A": "General",
};

interface Props {
  data: { ruta: string; horas_promedio: number }[];
}

function formatearHoras(horas: number): string {
  if (horas === 0) return "—";
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return `${h}h ${m}m`;
}

export function TiempoProduccion({ data }: Props) {
  const totalHoras =
    data.length > 0
      ? data.reduce((s, d) => s + d.horas_promedio, 0) / data.length
      : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
        Tiempo en producción
      </h3>
      {data.length === 0 ? (
        <div className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm">
          Sin pedidos completados en este período
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="text-2xl">⏱</span>
              <div>
                <p className="text-xs text-gray-500">Promedio general</p>
                <p className="text-2xl font-bold text-blue-700">{formatearHoras(totalHoras)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.map((d) => (
              <div
                key={d.ruta}
                className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"
              >
                <p className="text-xs text-gray-400">{RUTA_LABELS[d.ruta] ?? d.ruta}</p>
                <p className="text-lg font-bold text-gray-700">{formatearHoras(d.horas_promedio)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
