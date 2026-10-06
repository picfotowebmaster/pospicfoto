import { describe, it, expect } from "vitest";
import { derivarNotificacion } from "./notificaciones";

const AHORA = 1_700_000_000_000;

describe("derivarNotificacion", () => {
  it("genera notificación de nuevo pedido en INSERT", () => {
    const n = derivarNotificacion(
      {
        eventType: "INSERT",
        new: { id: "p1", cliente_nombre: "Ana", area_actual: "diseno" },
      },
      AHORA,
    );
    expect(n?.tipo).toBe("nuevo");
    expect(n?.pedidoId).toBe("p1");
    expect(n?.titulo).toContain("Ana");
    expect(n?.area).toBe("diseno");
    expect(n?.leida).toBe(false);
  });

  it("genera corrección cuando se activa requiere_correccion", () => {
    const n = derivarNotificacion(
      {
        eventType: "UPDATE",
        new: { id: "p1", cliente_nombre: "Ana", requiere_correccion: true, motivo_correccion: "Color" },
        old: { requiere_correccion: false },
      },
      AHORA,
    );
    expect(n?.tipo).toBe("correccion");
    expect(n?.detalle).toBe("Color");
  });

  it("genera prioridad cuando pasa a urgente", () => {
    const n = derivarNotificacion(
      {
        eventType: "UPDATE",
        new: { id: "p1", cliente_nombre: "Ana", prioridad: "urgente", area_actual: "impresion" },
        old: { prioridad: "normal" },
      },
      AHORA,
    );
    expect(n?.tipo).toBe("prioridad");
  });

  it("genera cobro cuando se marca saldo_cobrado", () => {
    const n = derivarNotificacion(
      {
        eventType: "UPDATE",
        new: { id: "p1", cliente_nombre: "Ana", saldo_cobrado: true, total: 500, anticipo: 200, saldo_metodo_pago: "Tarjeta" },
        old: { saldo_cobrado: false },
      },
      AHORA,
    );
    expect(n?.tipo).toBe("saldo");
    expect(n?.detalle).toContain("300.00");
  });

  it("genera asignación cuando cambia asignado_a", () => {
    const n = derivarNotificacion(
      {
        eventType: "UPDATE",
        new: { id: "p1", cliente_nombre: "Ana", asignado_a: "u1" },
        old: { asignado_a: null },
      },
      AHORA,
    );
    expect(n?.tipo).toBe("asignado");
  });

  it("devuelve null en UPDATE sin cambios relevantes", () => {
    const n = derivarNotificacion(
      {
        eventType: "UPDATE",
        new: { id: "p1", cliente_nombre: "Ana" },
        old: { cliente_nombre: "Ana" },
      },
      AHORA,
    );
    expect(n).toBeNull();
  });

  it("devuelve null sin id", () => {
    expect(derivarNotificacion({ eventType: "INSERT", new: {} }, AHORA)).toBeNull();
  });
});
