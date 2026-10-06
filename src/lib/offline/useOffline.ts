"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

let online =
  typeof window !== "undefined" && typeof navigator !== "undefined"
    ? navigator.onLine
    : true;

function emit() {
  for (const listener of listeners) listener();
}

function setOnline(value: boolean) {
  if (online !== value) {
    online = value;
    emit();
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);

  const onOnline = () => setOnline(true);
  const onOffline = () => setOnline(false);

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

function getSnapshot() {
  return online;
}

// Valor fijo para SSR e hidratación: evita el mismatch servidor/cliente.
function getServerSnapshot() {
  return true;
}

export function useOffline() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const checkNow = useCallback(() => {
    online = typeof navigator !== "undefined" ? navigator.onLine : true;
    emit();
  }, []);

  return { isOnline, checkNow };
}
