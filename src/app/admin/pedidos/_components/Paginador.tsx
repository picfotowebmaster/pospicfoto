"use client";

interface PaginadorProps {
  pagina: number;
  hasMore: boolean;
  onChange: (pagina: number) => void;
}

export function Paginador({ pagina, hasMore, onChange }: PaginadorProps) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button
        onClick={() => onChange(pagina - 1)}
        disabled={pagina <= 1}
        className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        Anterior
      </button>
      <span className="text-xs text-gray-600">Página {pagina}</span>
      <button
        onClick={() => onChange(pagina + 1)}
        disabled={!hasMore}
        className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        Siguiente
      </button>
    </div>
  );
}
