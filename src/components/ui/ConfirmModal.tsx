"use client";

import React, { useEffect, useRef } from "react";
import { Button } from "./Button";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onCancel();
      };
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKey);
        document.body.style.overflow = "";
      };
    }
  }, [open, onCancel]);

  if (!open) return null;

  const variantStyles = {
    danger: "bg-red-600 hover:bg-red-700",
    primary: "bg-blue-600 hover:bg-blue-700",
    warning: "bg-amber-600 hover:bg-amber-700",
  };

  const iconMap = {
    danger: "fa-triangle-exclamation",
    primary: "fa-circle-info",
    warning: "fa-circle-exclamation",
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 animate-[fadeIn_150ms_ease-out]"
        onClick={onCancel}
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 animate-[scaleIn_200ms_ease-out] border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            variant === "danger" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
            variant === "warning" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
            "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          }`}>
            <i className={`fas ${iconMap[variant]} text-lg`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer ${variantStyles[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
