"use client";

interface PaginadorProps {
  pagina: number;
  hasMore: boolean;
  total?: number;
  porPagina?: number;
  onChange: (pagina: number) => void;
  onPorPaginaChange?: (n: number) => void;
}

const OPCIONES_POR_PAGINA = [10, 20, 50, 100];

export function Paginador({
  pagina,
  hasMore,
  total,
  porPagina = 20,
  onChange,
  onPorPaginaChange,
}: PaginadorProps) {
  const totalPaginas = total && total > 0 ? Math.max(1, Math.ceil(total / porPagina)) : null;

  const btn =
    "px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-600 dark:text-gray-300";

  return (
    <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {typeof total === "number" ? `${total} pedido${total === 1 ? "" : "s"}` : ""}
      </div>

      <div className="flex items-center gap-2">
        {onPorPaginaChange && (
          <select
            value={porPagina}
            onChange={(e) => onPorPaginaChange(Number(e.target.value))}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Registros por página"
          >
            {OPCIONES_POR_PAGINA.map((n) => (
              <option key={n} value={n}>
                {n} / pág.
              </option>
            ))}
          </select>
        )}

        <button type="button" className={btn} onClick={() => onChange(1)} disabled={pagina <= 1} title="Primera">
          <i className="fas fa-angles-left" />
        </button>
        <button type="button" className={btn} onClick={() => onChange(pagina - 1)} disabled={pagina <= 1}>
          Anterior
        </button>
        <span className="text-xs text-gray-600 dark:text-gray-300 px-1">
          Página {pagina}
          {totalPaginas ? ` de ${totalPaginas}` : hasMore ? "+" : ""}
        </span>
        <button type="button" className={btn} onClick={() => onChange(pagina + 1)} disabled={!hasMore}>
          Siguiente
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => onChange(totalPaginas ?? pagina + 1)}
          disabled={!hasMore || (totalPaginas !== null && pagina >= totalPaginas)}
          title="Última"
        >
          <i className="fas fa-angles-right" />
        </button>
      </div>
    </div>
  );
}
