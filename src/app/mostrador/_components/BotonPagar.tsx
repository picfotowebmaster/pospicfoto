"use client";

import React from "react";
import { Button } from "@/components/ui/Button";

interface BotonPagarProps {
  onClick: () => Promise<void>;
  cargando: boolean;
  valido: boolean;
}

export function BotonPagar({ onClick, cargando, valido }: BotonPagarProps) {
  return (
    <Button
      size="lg"
      className="w-full"
      onClick={onClick}
      disabled={!valido || cargando}
    >
      {cargando ? "Procesando..." : `PAGAR`}
    </Button>
  );
}
