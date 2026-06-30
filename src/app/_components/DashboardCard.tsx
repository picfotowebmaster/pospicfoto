import Link from "next/link";

interface DashboardCardProps {
  titulo: string;
  valor: string | number;
  color?: string;
  href?: string;
  subtitulo?: string;
}

export function DashboardCard({
  titulo,
  valor,
  color = "bg-blue-500",
  href,
  subtitulo,
}: DashboardCardProps) {
  const contenido = (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-1 hover:shadow-md transition-shadow">
      {subtitulo && (
        <p className="text-xs text-gray-400">{subtitulo}</p>
      )}
      <span className={`w-2 h-2 rounded-full ${color} mb-1`} />
      <span className="text-2xl font-bold text-gray-900">{valor}</span>
      <span className="text-sm text-gray-500">{titulo}</span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {contenido}
      </Link>
    );
  }

  return contenido;
}
