"use client";

import React from "react";
import { Tooltip } from "@/components/ui/Tooltip";

interface NotificationBellProps {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  loading: boolean;
  onToggle: () => void;
}

export function NotificationBell({
  supported,
  permission,
  subscribed,
  loading,
  onToggle,
}: NotificationBellProps) {
  if (!supported) return null;

  const icon =
    permission === "denied"
      ? "fa-bell-slash"
      : subscribed
        ? "fa-bell"
        : "fa-bell";

  const tooltip =
    permission === "denied"
      ? "Notificaciones bloqueadas por el navegador"
      : subscribed
        ? "Desactivar notificaciones push"
        : "Activar notificaciones push";

  const activeClass = subscribed
    ? "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
    : permission === "denied"
      ? "text-gray-300 dark:text-gray-600"
      : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800";

  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        onClick={onToggle}
        disabled={loading || permission === "denied"}
        className={`text-sm cursor-pointer leading-none select-none p-1.5 rounded-lg transition-colors relative ${activeClass} disabled:cursor-not-allowed`}
      >
        {loading ? (
          <i className="fas fa-spinner animate-spin" />
        ) : (
          <i className={`fas ${icon}`} />
        )}
        {subscribed && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-gray-900" />
        )}
      </button>
    </Tooltip>
  );
}
