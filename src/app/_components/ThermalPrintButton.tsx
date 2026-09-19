"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";

type PrinterStatus = "idle" | "discovering" | "connecting" | "connected" | "printing" | "error";

interface ThermalPrintButtonProps {
  status: PrinterStatus;
  error: string | null;
  deviceName: string | null;
  bluetoothAvailable: boolean;
  onConnect: () => void;
  onPrint: () => void;
  onDisconnect: () => void;
  onRetry: () => void;
  onBrowserPrint: () => void;
}

const STATUS_CONFIG: Record<PrinterStatus, { icon: string; label: string; color: string }> = {
  idle: { icon: "fa-bluetooth", label: "Conectar impresora", color: "text-gray-500" },
  discovering: { icon: "fa-search", label: "Buscando...", color: "text-blue-500" },
  connecting: { icon: "fa-spinner fa-spin", label: "Conectando...", color: "text-blue-500" },
  connected: { icon: "fa-bluetooth-b", label: "Conectada", color: "text-green-500" },
  printing: { icon: "fa-spinner fa-spin", label: "Imprimiendo...", color: "text-blue-500" },
  error: { icon: "fa-exclamation-triangle", label: "Error", color: "text-red-500" },
};

export function ThermalPrintButton({
  status,
  error,
  deviceName,
  bluetoothAvailable,
  onConnect,
  onPrint,
  onDisconnect,
  onRetry,
  onBrowserPrint,
}: ThermalPrintButtonProps) {
  const config = STATUS_CONFIG[status];

  if (!bluetoothAvailable) {
    return (
      <div className="flex gap-2">
        <Tooltip content="Web Bluetooth no disponible en este navegador. Usa Chrome o Edge.">
          <Button
            variant="ghost"
            size="sm"
            className="opacity-50"
            disabled
          >
            <i className="fas fa-bluetooth mr-1 text-gray-300" />
            Impresora no disponible
          </Button>
        </Tooltip>
        <Button variant="ghost" size="sm" onClick={onBrowserPrint}>
          <i className="fas fa-print mr-1" />
          Imprimir (Navegador)
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        {status === "idle" && (
          <Button variant="primary" size="sm" onClick={onConnect}>
            <i className="fas fa-bluetooth mr-1" />
            Conectar impresora
          </Button>
        )}

        {status === "connected" && (
          <>
            <Button variant="success" size="sm" onClick={onPrint}>
              <i className="fas fa-print mr-1" />
              Imprimir (Térmica)
            </Button>
            <Button variant="ghost" size="sm" onClick={onDisconnect}>
              <i className="fas fa-bluetooth-b mr-1 text-green-500" />
              {deviceName || "Conectada"}
            </Button>
          </>
        )}

        {(status === "discovering" || status === "connecting") && (
          <Button variant="ghost" size="sm" disabled>
            <i className={`fas ${config.icon} mr-1 ${config.color}`} />
            {config.label}
          </Button>
        )}

        {status === "printing" && (
          <Button variant="ghost" size="sm" disabled>
            <i className="fas fa-spinner fa-spin mr-1 text-blue-500" />
            Imprimiendo...
          </Button>
        )}

        {status === "error" && (
          <>
            <Button variant="danger" size="sm" onClick={onRetry}>
              <i className="fas fa-redo mr-1" />
              Reintentar
            </Button>
            {error && (
              <span className="text-xs text-red-500 max-w-[200px] truncate">{error}</span>
            )}
          </>
        )}
      </div>

      {status !== "connected" && (
        <Button variant="ghost" size="sm" onClick={onBrowserPrint}>
          <i className="fas fa-print mr-1" />
          Imprimir (Navegador)
        </Button>
      )}
    </div>
  );
}
