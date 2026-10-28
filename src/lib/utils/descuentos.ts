import type { Descuento, TipoDescuento } from "@/lib/supabase/types";

export interface DescuentoAplicado {
  descuento_id: string;
  descuento_nombre: string;
  descuento_tipo: TipoDescuento;
  descuento_valor: number;
  descuento_monto: number;
  precio_final: number;
}

export function esTablaDescuentosFaltante(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: string; message?: string };
  return (
    code === "PGRST205" ||
    Boolean(message?.toLowerCase().includes("descuentos"))
  );
}

export function fechaHoyMexico(fecha = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

export function estaVigente(descuento: Descuento, fechaISO: string): boolean {
  if (!descuento.activo) return false;
  return fechaISO >= descuento.fecha_inicio && fechaISO <= descuento.fecha_fin;
}

export function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function calcularMonto(
  precioBase: number,
  descuento: Descuento,
): number {
  if (!Number.isFinite(precioBase) || precioBase <= 0.01) return 0;

  const bruto =
    descuento.tipo === "porcentaje"
      ? precioBase * (descuento.valor / 100)
      : descuento.valor;

  const tope = Math.max(0, precioBase - 0.01);
  return redondear2(Math.min(Math.max(0, bruto), tope));
}

export function resolverDescuento(
  producto: { id: string; categoria_id: string },
  precioBase: number,
  descuentos: Descuento[],
  fechaISO = fechaHoyMexico(),
): DescuentoAplicado | null {
  if (!Number.isFinite(precioBase) || precioBase <= 0.01) return null;

  const vigentes = descuentos.filter(
    (d) =>
      d.activo &&
      estaVigente(d, fechaISO) &&
      ((d.alcance === "producto" && d.producto_id === producto.id) ||
        (d.alcance === "categoria" &&
          d.categoria_id === producto.categoria_id)),
  );

  const propios = vigentes.filter(
    (d) => d.alcance === "producto" && d.producto_id === producto.id,
  );
  const candidatos =
    propios.length > 0
      ? propios
      : vigentes.filter(
          (d) =>
            d.alcance === "categoria" &&
            d.categoria_id === producto.categoria_id,
        );

  if (candidatos.length === 0) return null;

  const evaluados = candidatos
    .map((descuento) => ({
      descuento,
      monto: calcularMonto(precioBase, descuento),
    }))
    .filter((x) => x.monto > 0)
    .sort((a, b) => {
      if (b.monto !== a.monto) return b.monto - a.monto;
      const fechaA = a.descuento.created_at ?? "";
      const fechaB = b.descuento.created_at ?? "";
      if (fechaB !== fechaA) return fechaB.localeCompare(fechaA);
      return b.descuento.id.localeCompare(a.descuento.id);
    });

  const ganador = evaluados[0];
  if (!ganador) return null;

  return {
    descuento_id: ganador.descuento.id,
    descuento_nombre: ganador.descuento.nombre,
    descuento_tipo: ganador.descuento.tipo,
    descuento_valor: ganador.descuento.valor,
    descuento_monto: ganador.monto,
    precio_final: redondear2(precioBase - ganador.monto),
  };
}
