"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const mql = window.matchMedia("(pointer: coarse)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

export function useCoarsePointer(): boolean {
  const getSnapshot = useCallback(
    () => window.matchMedia("(pointer: coarse)").matches,
    [],
  );
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
