"use client";

import { useState, useCallback, useRef } from "react";
import {
  isBluetoothAvailable,
  discoverPrinter,
  connectPrinter,
  printTicket,
  buildTicketCommands,
  type EscPosBuilder,
} from "@/lib/services/thermalPrinter";

type PrinterStatus = "idle" | "discovering" | "connecting" | "connected" | "printing" | "error";

interface TicketData {
  numeroPedido: string;
  cliente: string;
  telefono?: string;
  fechaRecepcion: string;
  horaRecepcion: string;
  fechaEntrega: string;
  horaEntrega: string;
  metodoPago: string;
  subtotal: number;
  anticipo: number;
  total: number;
  lineas: { nombre: string; cantidad: number; importe: number; atributos?: Record<string, string> }[];
}

export function useThermalPrinter() {
  const [status, setStatus] = useState<PrinterStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const deviceRef = useRef<BluetoothDevice | null>(null);

  const connected = status === "connected";

  const connect = useCallback(async () => {
    if (!isBluetoothAvailable()) {
      setError("Web Bluetooth no disponible. Usa Chrome o Edge.");
      setStatus("error");
      return;
    }

    try {
      setStatus("discovering");
      setError(null);
      const device = await discoverPrinter();
      setDeviceName(device.name || "Impresora térmica");
      deviceRef.current = device;

      device.addEventListener("gattserverdisconnected", () => {
        setStatus("idle");
        setDeviceName(null);
        characteristicRef.current = null;
      });

      setStatus("connecting");
      const characteristic = await connectPrinter(device);
      characteristicRef.current = characteristic;
      setStatus("connected");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al conectar impresora";
      setError(message);
      setStatus("error");
    }
  }, []);

  const disconnect = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    characteristicRef.current = null;
    deviceRef.current = null;
    setStatus("idle");
    setDeviceName(null);
    setError(null);
  }, []);

  const print = useCallback(async (ticketData: TicketData) => {
    const char = characteristicRef.current;
    if (!char) {
      setError("No hay impresora conectada");
      setStatus("error");
      return;
    }

    try {
      setStatus("printing");
      setError(null);

      await printTicket(char, (builder: EscPosBuilder) => {
        buildTicketCommands(builder, ticketData);
      });

      setStatus("connected");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al imprimir";
      setError(message);
      setStatus("error");
    }
  }, []);

  const retry = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return {
    status,
    error,
    deviceName,
    connected,
    connect,
    disconnect,
    print,
    retry,
    bluetoothAvailable: isBluetoothAvailable(),
  };
}
