"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "error" | "success" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  entering: boolean;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = `gt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message, entering: false }]);

    requestAnimationFrame(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, entering: true } : t)),
      );
    });

    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  const showError = useCallback((message: string) => showToast("error", message), [showToast]);
  const showSuccess = useCallback((message: string) => showToast("success", message), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
      {children}
      <div className="fixed bottom-4 right-4 z-60 flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const bg =
            toast.type === "error"
              ? "bg-red-50 border-red-500 text-red-800"
              : toast.type === "success"
                ? "bg-green-50 border-green-500 text-green-800"
                : "bg-blue-50 border-blue-500 text-blue-800";

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl shadow-lg border-l-4 p-3 w-80 transition-all duration-300 ${
                toast.entering ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              } ${bg}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{toast.message}</p>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-current opacity-50 hover:opacity-100 cursor-pointer shrink-0 leading-none text-lg"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
