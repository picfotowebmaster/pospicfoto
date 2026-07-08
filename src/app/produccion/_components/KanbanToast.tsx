"use client";

import { useEffect, useState } from "react";
import type { Pedido } from "@/lib/supabase/types";
import { AREAS_PRODUCCION_DATA } from "@/lib/utils/constantes";

export interface ToastItem {
  id: string;
  pedidoId: string;
  cliente: string;
  area: string;
  color: string;
  timestamp: number;
}

interface Props {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export function KanbanToast({ toasts, onRemove }: Props) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 50);
    const hideTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, 5000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [toast.id, onRemove]);

  const area = AREAS_PRODUCCION_DATA.find((a) => a.id === toast.area);
  const borderColor = toast.color.replace("bg-", "border-");

  return (
    <div
      className={`pointer-events-auto bg-white rounded-xl shadow-lg border-l-4 ${borderColor} p-3 w-72 transition-all duration-300 ${
        visible && !exiting
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0"
      }`}
    >
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
        <i className="fas fa-circle-info mr-1" />Nuevo pedido
      </p>
      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{toast.cliente}</p>
      <p className="text-xs text-gray-500 mt-0.5">{area?.nombre ?? toast.area}</p>
    </div>
  );
}

export function createToast(pedido: Pedido): ToastItem {
  const area = AREAS_PRODUCCION_DATA.find((a) => a.id === pedido.area_actual);
  return {
    id: `toast-${pedido.id}-${Date.now()}`,
    pedidoId: pedido.id,
    cliente: pedido.cliente_nombre,
    area: pedido.area_actual,
    color: area?.color ?? "bg-gray-500",
    timestamp: Date.now(),
  };
}
