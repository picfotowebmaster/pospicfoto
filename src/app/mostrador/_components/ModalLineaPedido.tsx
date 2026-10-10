"use client";

import { Button } from "@/components/ui/Button";
import type { Catalogo } from "@/lib/services/catalogo";
import type {
  Atributo,
  AtributoValor,
  LineaPedidoDraft,
  RutaProduccion,
} from "@/lib/supabase/types";
import { LineaPedido } from "./LineaPedido";

interface ModalLineaPedidoProps {
  open: boolean;
  atributosPool: (Atributo & { valores: AtributoValor[] })[];
  onSave: (linea: LineaPedidoDraft) => void;
  onCancel: () => void;
  editData?: LineaPedidoDraft;
  rutaDefault: RutaProduccion;
  catalogo?: Catalogo;
}

export function ModalLineaPedido({
  open,
  atributosPool,
  onSave,
  onCancel,
  editData,
  rutaDefault,
  catalogo,
}: ModalLineaPedidoProps) {
  if (!open) return null;

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="linea-pedido-modal-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
          <h2
            id="linea-pedido-modal-title"
            className="text-lg font-bold text-gray-900 dark:text-gray-100"
          >
            {editData ? "Editar producto" : "Agregar producto"}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Cerrar"
            onClick={onCancel}
          >
            <i className="fas fa-times" />
          </Button>
        </div>
        <LineaPedido
          key={editData?.id ?? "nueva"}
          id={editData?.id || ""}
          atributosPool={atributosPool}
          onSave={onSave}
          onCancel={onCancel}
          editData={editData}
          rutaDefault={rutaDefault}
          catalogo={catalogo}
        />
      </div>
    </div>
  );
}
