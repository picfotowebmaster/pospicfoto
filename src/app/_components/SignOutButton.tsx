"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const { signOut, cargando } = useAuth();

  return (
    <Button variant="ghost" size="sm" onClick={signOut} disabled={cargando}>
      Salir
    </Button>
  );
}
