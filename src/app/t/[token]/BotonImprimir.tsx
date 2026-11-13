"use client";

import { Button } from "@/components/ui/Button";

export function BotonImprimir() {
  return (
    <Button size="sm" variant="primary" onClick={() => window.print()}>
      <i className="fas fa-print mr-1" />
      Imprimir
    </Button>
  );
}
