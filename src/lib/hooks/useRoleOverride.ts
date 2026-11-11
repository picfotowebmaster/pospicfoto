"use client";

import { useSyncExternalStore } from "react";
import { getRoleOverrideCookie } from "@/lib/utils/roles";

function subscribe() {
  return () => {};
}

export function useRoleOverride(): string | null {
  return useSyncExternalStore(
    subscribe,
    getRoleOverrideCookie,
    () => null,
  );
}
