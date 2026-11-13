import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase/client";
import {
  actualizarClienteAdmin,
  filasCsvCompras,
  listarClientesAdmin,
  listarComprasCliente,
  resumirCompras,
  type CompraCliente,
} from "./clientesAdmin";

function compra(overrides: Partial<CompraCliente> = {}): CompraCliente {
  return {
    id: "p1",
    numero_pedido: "PIC-PAL-00001",
    cliente_nombre: "Jessica Herrera",
    fecha_recepcion: "2026-11-10",
    hora_recepcion: "10:00",
    fecha_entrega: "2026-11-11",
    hora_entrega: "12:00",
    estado: "entregado",
    metodo_pago: "Efectivo",
    subtotal: 100,
    anticipo: 50,
    total: 100,
    saldo_cobrado: false,
    saldo_metodo_pago: null,
    saldo_cobrado_en: null,
    detalle_pedidos: [
      {
        id: "d1",
        pedido_id: "p1",
        producto_nombre: "Foto 4x6",
        cantidad: 2,
        precio_unitario: 50,
        importe_linea: 100,
        atributos: {},
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listarClientesAdmin", () => {
  it("consulta por búsqueda con paginación", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        {
          id: "c1",
          nombre: "Jessica Herrera León",
          telefono: "5512345678",
          email: "jess@correo.com",
          notas: null,
          rfc: null,
          last_order_at: "2026-11-10T10:00:00.000Z",
          pedidos_count: 3,
          total_gastado: "300.00",
          total: 1,
        },
      ],
      error: null,
    });

    const resultado = await listarClientesAdmin({
      busqueda: "  Jess  ",
      pagina: 2,
      porPagina: 20,
    });

    expect(supabase.rpc).toHaveBeenCalledWith("listar_clientes_admin", {
      p_q: "Jess",
      p_limit: 20,
      p_offset: 20,
    });
    expect(resultado.total).toBe(1);
    expect(resultado.clientes[0]).toMatchObject({
      id: "c1",
      nombre: "Jessica Herrera León",
      pedidos_count: 3,
      total_gastado: 300,
    });
  });

  it("devuelve total cero sin resultados", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null });

    const resultado = await listarClientesAdmin({
      busqueda: "",
      pagina: 1,
      porPagina: 20,
    });

    expect(resultado).toEqual({ clientes: [], total: 0 });
  });

  it("propaga errores de la RPC", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: new Error("falló"),
    });

    await expect(
      listarClientesAdmin({ busqueda: "", pagina: 1, porPagina: 20 }),
    ).rejects.toThrow("falló");
  });
});

describe("actualizarClienteAdmin", () => {
  it("envía los datos a la RPC", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        {
          id: "c1",
          nombre: "Jessica Herrera León",
          telefono: "5512345678",
          email: "jess@correo.com",
          notas: "Cliente frecuente",
          rfc: "XAXX010101000",
          last_order_at: null,
          pedidos_count: 0,
          total_gastado: 0,
        },
      ],
      error: null,
    });

    const resultado = await actualizarClienteAdmin({
      id: "c1",
      nombre: "Jessica Herrera León",
      telefono: "5512345678",
      email: "jess@correo.com",
      notas: "Cliente frecuente",
      rfc: "XAXX010101000",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("actualizar_cliente", {
      p_id: "c1",
      p_nombre: "Jessica Herrera León",
      p_telefono: "5512345678",
      p_email: "jess@correo.com",
      p_notas: "Cliente frecuente",
      p_rfc: "XAXX010101000",
    });
    expect(resultado.nombre).toBe("Jessica Herrera León");
  });
});

describe("listarComprasCliente", () => {
  it("filtra por cliente y rango de fechas", async () => {
    const datos = [compra()];
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: datos, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(
      builder as unknown as ReturnType<typeof supabase.from>,
    );

    const resultado = await listarComprasCliente({
      clienteId: "c1",
      desde: "2026-11-01",
      hasta: "2026-11-30",
    });

    expect(supabase.from).toHaveBeenCalledWith("pedidos");
    expect(builder.eq).toHaveBeenCalledWith("cliente_id", "c1");
    expect(builder.gte).toHaveBeenCalledWith("fecha_recepcion", "2026-11-01");
    expect(builder.lte).toHaveBeenCalledWith("fecha_recepcion", "2026-11-30");
    expect(resultado).toEqual(datos);
  });
});

describe("resumirCompras", () => {
  it("excluye cancelados y calcula totales", () => {
    const resumen = resumirCompras([
      compra({ id: "p1", total: 100, fecha_recepcion: "2026-11-01" }),
      compra({ id: "p2", total: 200, fecha_recepcion: "2026-11-05" }),
      compra({
        id: "p3",
        total: 999,
        estado: "cancelado",
        fecha_recepcion: "2026-11-06",
      }),
    ]);

    expect(resumen.totalCompras).toBe(2);
    expect(resumen.totalGastado).toBe(300);
    expect(resumen.ticketPromedio).toBe(150);
    expect(resumen.ultimaCompra).toBe("2026-11-05");
  });

  it("devuelve ceros sin compras válidas", () => {
    expect(resumirCompras([])).toEqual({
      totalCompras: 0,
      totalGastado: 0,
      ticketPromedio: 0,
      ultimaCompra: null,
    });
  });
});

describe("filasCsvCompras", () => {
  it("genera encabezado y detalle de productos", () => {
    const filas = filasCsvCompras([compra()]);

    expect(filas[0]).toContain("Pedido");
    expect(filas[1]).toEqual([
      "PIC-PAL-00001",
      "2026-11-10",
      "10:00",
      "2026-11-11 12:00",
      "entregado",
      "Efectivo",
      "100.00",
      "50.00",
      "100.00",
      "50.00",
      "2x Foto 4x6",
    ]);
  });

  it("no muestra saldo pendiente si ya fue cobrado", () => {
    const filas = filasCsvCompras([compra({ saldo_cobrado: true })]);
    expect(filas[1][9]).toBe("0.00");
  });
});
