import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { supabase } from "@/lib/supabase/client";
import {
  crearPedido,
  crearPedidoAgrupado,
  validarPreciosLineas,
  PrecioDesactualizadoError,
  fetchPedido,
  fetchPedidosPorEstado,
  cancelarVenta,
  listarPedidos,
  actualizarPedido,
  actualizarPrioridad,
  asignarPedido,
  actualizarNotas,
  actualizarCorreccion,
  buscarClientes,
  liquidarSaldo,
  liquidarSaldoConPagos,
  contarPedidos,
} from "./pedidos";
import type { PedidoDraft } from "@/lib/supabase/types";

vi.mock("@/lib/services/historial", () => ({
  upsertHistorial: vi.fn().mockResolvedValue({ id: "h1", nombre: "", atributos: {}, veces_usado: 1, ultimo_uso: "" }),
}));

const mockDraft: PedidoDraft = {
  cliente_nombre: "Juan Perez",
  cliente_telefono: "5512345678",
  fecha_entrega: "2026-07-26",
  hora_entrega: "14:00",
  requiere_correccion: false,
  lineas: [{ id: "l1", producto_nombre: "Foto 4x6", cantidad: 10, precio_unitario: 15, atributos: {}, ruta: "R1" }],
  subtotal: 150,
  anticipo: 105,
  total: 150,
  metodo_pago: "Efectivo",
  ruta: "R1",
  sucursal_id: "s1",
  marca_id: "m1",
};

function qb(terminalMethod: string | null = null, data: unknown = null, error: Error | null = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "insert", "update", "delete", "eq", "neq", "gt", "gte", "lt", "lte", "ilike", "in", "is", "or", "order", "limit", "range", "single", "maybeSingle"];
  for (const m of methods) {
    builder[m] = terminalMethod === m
      ? vi.fn().mockResolvedValue(error ? { data, error } : { data, error: null })
      : vi.fn().mockReturnThis();
  }
  if (terminalMethod && !methods.includes(terminalMethod)) {
    builder[terminalMethod] = vi.fn().mockResolvedValue(error ? { data, error } : { data, error: null });
  }
  return builder;
}

function mockFrom(impl: (table: string) => ReturnType<typeof supabase.from>) {
  vi.mocked(supabase.from).mockImplementation((table: unknown) => impl(table as string));
}

describe("crearPedido", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea pedido exitosamente", async () => {
    mockFrom((table: string) => {
      if (table === "marcas") return qb("single", { codigo: "PIC" }) as ReturnType<typeof supabase.from>;
      if (table === "sucursales") return qb("single", { codigo: "PAL" }) as ReturnType<typeof supabase.from>;
      if (table === "pedidos") return qb("single", { id: "p1", numero_pedido: "PIC-PAL-00042" }) as ReturnType<typeof supabase.from>;
      return qb(null, null) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.rpc).mockResolvedValue({ data: "PIC-PAL-00042", error: null });

    const result = await crearPedido(mockDraft, "cajero-1");
    expect(result).toBe("PIC-PAL-00042");
  });

  it("registra anticipo dividido y usa el método dominante", async () => {
    const pedidosBuilder = qb("single", {
      id: "p1",
      numero_pedido: "PIC-PAL-00042",
    });
    const pagosInsert = vi.fn().mockResolvedValue({ error: null });

    mockFrom((table: string) => {
      if (table === "marcas")
        return qb("single", { codigo: "PIC" }) as ReturnType<typeof supabase.from>;
      if (table === "sucursales")
        return qb("single", { codigo: "PAL" }) as ReturnType<typeof supabase.from>;
      if (table === "pedidos")
        return pedidosBuilder as ReturnType<typeof supabase.from>;
      if (table === "pagos_pedido")
        return { insert: pagosInsert } as unknown as ReturnType<typeof supabase.from>;
      return qb(null, null) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: "PIC-PAL-00042",
      error: null,
    });

    await crearPedido(
      {
        ...mockDraft,
        anticipo: 70,
        pagos_anticipo: [
          { metodo: "Efectivo", monto: 30 },
          { metodo: "Tarjeta", monto: 40 },
        ],
      },
      "cajero-1",
    );

    expect(pedidosBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ metodo_pago: "Tarjeta", anticipo: 70 }),
    );
    expect(pagosInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        pedido_id: "p1",
        tipo: "anticipo",
        metodo_pago: "Efectivo",
        monto: 30,
      }),
      expect.objectContaining({
        pedido_id: "p1",
        tipo: "anticipo",
        metodo_pago: "Tarjeta",
        monto: 40,
      }),
    ]);
  });

  it("bloquea a mostrador que intenta vender otra marca", async () => {
    mockFrom((table: string) => {
      if (table === "profiles") {
        return qb("maybeSingle", {
          rol: "mostrador",
          marca_id: "m1",
          sucursal_id: "s1",
        }) as ReturnType<typeof supabase.from>;
      }
      if (table === "marcas") return qb("single", { codigo: "FRX" }) as ReturnType<typeof supabase.from>;
      if (table === "sucursales") return qb("single", { codigo: "PAL" }) as ReturnType<typeof supabase.from>;
      return qb(null, null) as ReturnType<typeof supabase.from>;
    });

    await expect(
      crearPedido({ ...mockDraft, marca_id: "m2" }, "cajero-1"),
    ).rejects.toThrow("Solo puedes vender la marca asignada");
  });

  it("permite a mostrador vender su marca y sucursal", async () => {
    mockFrom((table: string) => {
      if (table === "profiles") {
        return qb("maybeSingle", {
          rol: "mostrador",
          marca_id: "m1",
          sucursal_id: "s1",
        }) as ReturnType<typeof supabase.from>;
      }
      if (table === "marcas") return qb("single", { codigo: "PIC" }) as ReturnType<typeof supabase.from>;
      if (table === "sucursales") return qb("single", { codigo: "PAL" }) as ReturnType<typeof supabase.from>;
      if (table === "pedidos") return qb("single", { id: "p1", numero_pedido: "PIC-PAL-00042" }) as ReturnType<typeof supabase.from>;
      return qb(null, null) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.rpc).mockResolvedValue({ data: "PIC-PAL-00042", error: null });

    await expect(crearPedido(mockDraft, "cajero-1")).resolves.toBe(
      "PIC-PAL-00042",
    );
  });

  it("usa la fecha y hora de recepción del draft", async () => {
    const pedidoBuilders: ReturnType<typeof qb>[] = [];
    mockFrom((table: string) => {
      if (table === "marcas") return qb("single", { codigo: "PIC" }) as ReturnType<typeof supabase.from>;
      if (table === "sucursales") return qb("single", { codigo: "PAL" }) as ReturnType<typeof supabase.from>;
      if (table === "pedidos") {
        const builder = qb("single", { id: "p1", numero_pedido: "PIC-PAL-00042" });
        pedidoBuilders.push(builder);
        return builder as ReturnType<typeof supabase.from>;
      }
      return qb(null, null) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.rpc).mockResolvedValue({ data: "PIC-PAL-00042", error: null });

    await crearPedido(
      {
        ...mockDraft,
        fecha_recepcion: "2026-11-12",
        hora_recepcion: "18:59:00",
      },
      "cajero-1",
    );

    expect(pedidoBuilders[0]?.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        fecha_recepcion: "2026-11-12",
        hora_recepcion: "18:59:00",
      }),
    );
  });

  it("lanza error si marca no encontrada", async () => {
    mockFrom(() => qb("single", null) as ReturnType<typeof supabase.from>);
    await expect(crearPedido(mockDraft, "cajero-1")).rejects.toThrow("Marca o sucursal no encontrada");
  });

  it("lanza error si RPC falla", async () => {
    mockFrom((table: string) => {
      if (table === "marcas") return qb("single", { codigo: "PIC" }) as ReturnType<typeof supabase.from>;
      return qb("single", { codigo: "PAL" }) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error("RPC error") });
    await expect(crearPedido(mockDraft, "cajero-1")).rejects.toThrow("RPC error");
  });

  it("deriva marca, sucursal y entidad emisora desde la entidad asignada", async () => {
    const pedidoBuilders: ReturnType<typeof qb>[] = [];
    mockFrom((table: string) => {
      if (table === "entidades_emisoras") {
        return qb("maybeSingle", {
          id: "e-frx",
          marca_id: "m-frx",
          sucursal_id: "s-cub",
        }) as ReturnType<typeof supabase.from>;
      }
      if (table === "marcas") return qb("single", { codigo: "FRX" }) as ReturnType<typeof supabase.from>;
      if (table === "sucursales") return qb("single", { codigo: "CUB" }) as ReturnType<typeof supabase.from>;
      if (table === "pedidos") {
        const builder = qb("single", {
          id: "p1",
          numero_pedido: "FRX-CUB-00001",
        });
        pedidoBuilders.push(builder);
        return builder as ReturnType<typeof supabase.from>;
      }
      return qb(null, null) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: "FRX-CUB-00001",
      error: null,
    });

    const result = await crearPedido(
      { ...mockDraft, entidad_emisora_id: "e-frx" },
      "cajero-1",
    );

    expect(result).toBe("FRX-CUB-00001");
    expect(pedidoBuilders[0]?.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        entidad_emisora_id: "e-frx",
        marca_id: "m-frx",
        sucursal_id: "s-cub",
      }),
    );
  });

  it("lanza error si insert falla", async () => {
    mockFrom((table: string) => {
      if (table === "marcas") return qb("single", { codigo: "PIC" }) as ReturnType<typeof supabase.from>;
      if (table === "sucursales") return qb("single", { codigo: "PAL" }) as ReturnType<typeof supabase.from>;
      if (table === "pedidos") return qb("single", null, new Error("Insert error")) as ReturnType<typeof supabase.from>;
      return qb(null, null) as ReturnType<typeof supabase.from>;
    });
    vi.mocked(supabase.rpc).mockResolvedValue({ data: "PIC-PAL-00042", error: null });
    await expect(crearPedido(mockDraft, "cajero-1")).rejects.toThrow("Insert error");
  });
});

describe("crearPedidoAgrupado", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usa un folio de venta propio y un número de pedido por ruta", async () => {
    let insertos = 0;
    const numeros = ["PIC-CUB-01000", "PIC-CUB-01001"];

    mockFrom((table: string) => {
      if (table === "marcas")
        return qb("single", { codigo: "PIC" }) as ReturnType<typeof supabase.from>;
      if (table === "sucursales")
        return qb("single", { codigo: "CUB" }) as ReturnType<typeof supabase.from>;
      if (table === "pedidos") {
        const numero = numeros[insertos] ?? `PIC-CUB-01${insertos}`;
        insertos += 1;
        return qb("single", {
          id: `p${insertos}`,
          numero_pedido: numero,
        }) as ReturnType<typeof supabase.from>;
      }
      return qb(null, null) as ReturnType<typeof supabase.from>;
    });

    let siguientePedido = 1000;
    vi.mocked(supabase.rpc).mockImplementation(((
      fn: string,
    ) => {
      if (fn === "generar_folio_venta") {
        return Promise.resolve({ data: "VTA-PIC-CUB-00001", error: null });
      }
      if (fn === "generar_numero_pedido") {
        const data = `PIC-CUB-0${siguientePedido}`;
        siguientePedido += 1;
        return Promise.resolve({ data, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }) as never);

    const resultado = await crearPedidoAgrupado(
      {
        cliente_nombre: "Ana",
        cliente_telefono: "5551234567",
        fecha_entrega: "2026-12-01",
        hora_entrega: "10:00",
        requiere_correccion: false,
        lineas: [
          {
            id: "l1",
            producto_nombre: "Foto 4x6",
            cantidad: 1,
            precio_unitario: 100,
            atributos: {},
            ruta: "R1",
          },
          {
            id: "l2",
            producto_nombre: "Marco 8x10",
            cantidad: 1,
            precio_unitario: 200,
            atributos: {},
            ruta: "R2",
          },
        ],
        subtotal: 300,
        anticipo: 100,
        total: 300,
        metodo_pago: "Efectivo",
        sucursal_id: "s1",
        marca_id: "m1",
      },
      "cajero-1",
    );

    expect(resultado.facturaNumero).toBe("VTA-PIC-CUB-00001");
    expect(resultado.pedidoIds).toHaveLength(2);

    const llamadas = vi.mocked(supabase.rpc).mock.calls as unknown as [
      string,
      unknown,
    ][];
    const foliosVenta = llamadas.filter(
      ([fn]) => fn === "generar_folio_venta",
    );
    const numerosPedido = llamadas.filter(
      ([fn]) => fn === "generar_numero_pedido",
    );

    expect(foliosVenta).toEqual([
      [
        "generar_folio_venta",
        { marca_codigo: "PIC", sucursal_codigo: "CUB" },
      ],
    ]);
    expect(numerosPedido).toHaveLength(2);
    for (const llamada of numerosPedido) {
      expect(llamada[1]).toEqual({
        marca_codigo: "PIC",
        sucursal_codigo: "CUB",
      });
    }
  });
});

describe("validarPreciosLineas", () => {
  beforeEach(() => vi.clearAllMocks());

  const lineaBase = {
    id: "l1",
    producto_nombre: "Foto 4x6",
    cantidad: 1,
    precio_unitario: 100,
    precio_lista: 100,
    descuento_id: null,
    atributos: {},
    valores_ids: ["v1"],
    ruta: "R1" as const,
    producto_id: "p1",
  };

  it("no lanza si el precio es el mismo", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: 100,
      error: null,
    } as never);

    await expect(validarPreciosLineas([lineaBase])).resolves.toBeUndefined();
    expect(supabase.rpc).toHaveBeenCalledWith("precio_actual", {
      p_producto_id: "p1",
      p_valores_ids: ["v1"],
    });
  });

  it("lanza PrecioDesactualizadoError si el precio cambió", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: 120,
      error: null,
    } as never);

    await expect(
      validarPreciosLineas([lineaBase]),
    ).rejects.toBeInstanceOf(PrecioDesactualizadoError);
  });

  it("lanza si la combinación ya no tiene precio", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: null,
    } as never);

    await expect(
      validarPreciosLineas([lineaBase]),
    ).rejects.toBeInstanceOf(PrecioDesactualizadoError);
  });

  it("no valida precios manuales", async () => {
    await validarPreciosLineas([{ ...lineaBase, precio_unitario: 80 }]);

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("no valida líneas sin valores_ids", async () => {
    await validarPreciosLineas([{ ...lineaBase, valores_ids: null }]);

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("no bloquea si la RPC falla", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: new Error("rpc"),
    } as never);

    await expect(validarPreciosLineas([lineaBase])).resolves.toBeUndefined();
  });
});

describe("fetchPedido", () => {
  const mockPedido = { id: "abc-123-uuid", numero_pedido: "PIC-PAL-00042", cliente_nombre: "Juan", detalle_pedidos: [] };

  it("busca por UUID", async () => {
    vi.mocked(supabase.from).mockReturnValue(qb("single", mockPedido) as ReturnType<typeof supabase.from>);
    expect(await fetchPedido("abc-123-uuid-1234-567890abcdef")).toEqual(mockPedido);
  });

  it("busca por numero_pedido", async () => {
    const eq = vi.fn().mockReturnThis();
    const builder = { ...qb("single", mockPedido), eq };
    vi.mocked(supabase.from).mockReturnValue(builder as ReturnType<typeof supabase.from>);
    const result = await fetchPedido("PIC-PAL-00042");
    expect(eq).toHaveBeenCalledWith("numero_pedido", "PIC-PAL-00042");
    expect(result).toEqual(mockPedido);
  });

  it("lanza error si falla", async () => {
    vi.mocked(supabase.from).mockReturnValue(qb("single", null, new Error("Not found")) as ReturnType<typeof supabase.from>);
    await expect(fetchPedido("abc-def-uuid")).rejects.toThrow("Not found");
  });
});

describe("fetchPedidosPorEstado", () => {
  it("retorna pedidos", async () => {
    const b = qb(null, [{ id: "1" }]);
    b.order = vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [{ id: "1" }], error: null }) });
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    expect(await fetchPedidosPorEstado(["pendiente"])).toEqual([{ id: "1" }]);
  });

  it("lanza error", async () => {
    const b = qb();
    b.order = vi.fn().mockReturnValue({ order: vi.fn().mockRejectedValue(new Error("DB error")) });
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    await expect(fetchPedidosPorEstado(["pendiente"])).rejects.toThrow("DB error");
  });
});

describe("cancelarVenta", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function respuestaOk(cancelados = 1, autorizadoPor: string | null = null) {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, cancelados, autorizadoPor }),
    });
  }

  it("envía la cancelación al API", async () => {
    respuestaOk();

    await expect(
      cancelarVenta("p1", { motivo: "cliente_cancela", notas: "Prueba" }),
    ).resolves.toEqual({ cancelados: 1, autorizadoPor: null });

    expect(fetchMock).toHaveBeenCalledWith("/api/pedidos/cancelar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.any(String),
    });

    expect(
      JSON.parse(fetchMock.mock.calls[0][1].body as string),
    ).toEqual({
      id: "p1",
      motivo: "cliente_cancela",
      notas: "Prueba",
    });
  });

  it("incluye las credenciales del admin cuando se autoriza", async () => {
    respuestaOk();

    await cancelarVenta("p1", {
      motivo: "otro",
      autorizacion: { adminId: "admin-1", password: "secreta" },
    });

    expect(
      JSON.parse(fetchMock.mock.calls[0][1].body as string),
    ).toMatchObject({
      id: "p1",
      motivo: "otro",
      adminId: "admin-1",
      adminPassword: "secreta",
    });
  });

  it("devuelve quién autorizó la cancelación", async () => {
    respuestaOk(1, "admin@correo.com");

    await expect(
      cancelarVenta("p1", { motivo: "otro" }),
    ).resolves.toEqual({ cancelados: 1, autorizadoPor: "admin@correo.com" });
  });

  it("bloquea la cancelación sin conexión", async () => {
    const onLine = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    try {
      await expect(cancelarVenta("p1", { motivo: "otro" })).rejects.toThrow(
        "Sin conexión",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      onLine.mockRestore();
    }
  });

  it("traduce errores de red", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(cancelarVenta("p1", { motivo: "otro" })).rejects.toThrow(
      "No se pudo conectar",
    );
  });

  it("propaga errores del API", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Credenciales de administrador inválidas" }),
    });

    await expect(cancelarVenta("p1", { motivo: "otro" })).rejects.toThrow(
      "Credenciales de administrador inválidas",
    );
  });
});

describe("listarPedidos", () => {
  it("pagina con hasMore", async () => {
    const mockPedidos = Array.from({ length: 15 }, (_, i) => ({ id: `p${i}`, cliente_nombre: `C${i}`, detalle_pedidos: [] }));
    const b = qb();
    b.order = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ range: vi.fn().mockResolvedValue({ data: mockPedidos, error: null }) }) });
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    const result = await listarPedidos({ pagina: 1, porPagina: 10 });
    expect(result.pedidos).toHaveLength(10);
    expect(result.hasMore).toBe(true);
  });

  it("hasMore false", async () => {
    const mockPedidos = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, cliente_nombre: `C${i}`, detalle_pedidos: [] }));
    const b = qb();
    b.order = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ range: vi.fn().mockResolvedValue({ data: mockPedidos, error: null }) }) });
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    const result = await listarPedidos({ pagina: 1, porPagina: 20 });
    expect(result.pedidos).toHaveLength(5);
    expect(result.hasMore).toBe(false);
  });

  it("filtra por vendedor", async () => {
    const b = qb();
    b.order = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ range: vi.fn().mockResolvedValue({ data: [], error: null }) }) });
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);

    await listarPedidos({ pagina: 1, porPagina: 20, vendedorId: "v1" });

    expect(b.eq).toHaveBeenCalledWith("cajero_id", "v1");
  });

  it("filtra pedidos sin vendedor", async () => {
    const b = qb();
    b.order = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ range: vi.fn().mockResolvedValue({ data: [], error: null }) }) });
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);

    await listarPedidos({ pagina: 1, porPagina: 20, vendedorId: "sin_vendedor" });

    expect(b.is).toHaveBeenCalledWith("cajero_id", null);
  });
});

describe("actualizarPedido", () => {
  it("reemplaza lineas", async () => {
    mockFrom((table: string) => {
      if (table === "pedidos") return qb("eq", null) as ReturnType<typeof supabase.from>;
      if (table === "detalle_pedidos") return qb("eq", null) as ReturnType<typeof supabase.from>;
      return qb(null, null) as ReturnType<typeof supabase.from>;
    });

    await actualizarPedido("p1", {
      cliente_nombre: "Updated", fecha_entrega: "2026-08-01", hora_entrega: "10:00",
      requiere_correccion: true, subtotal: 200, anticipo: 140, total: 200,
      metodo_pago: "Tarjeta", ruta: "R2",
      lineas: [{ id: "l1", producto_nombre: "P", cantidad: 1, precio_unitario: 200, atributos: {}, ruta: "R2" }],
    });
    expect(supabase.from).toHaveBeenCalled();
  });
});

describe("colaboración de pedidos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("actualizarPrioridad hace update con la prioridad", async () => {
    const b = qb("eq", null);
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    await actualizarPrioridad("p1", "urgente");
    expect(b.update).toHaveBeenCalledWith({ prioridad: "urgente" });
    expect(b.eq).toHaveBeenCalledWith("id", "p1");
  });

  it("actualizarPrioridad lanza error de supabase", async () => {
    vi.mocked(supabase.from).mockReturnValue(qb("eq", null, new Error("boom")) as ReturnType<typeof supabase.from>);
    await expect(actualizarPrioridad("p1", "urgente")).rejects.toThrow("boom");
  });

  it("asignarPedido permite liberar con null", async () => {
    const b = qb("eq", null);
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    await asignarPedido("p1", null);
    expect(b.update).toHaveBeenCalledWith({ asignado_a: null });
  });

  it("actualizarNotas convierte vacío a null", async () => {
    const b = qb("eq", null);
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    await actualizarNotas("p1", "   ");
    expect(b.update).toHaveBeenCalledWith({ notas: null });
  });

  it("actualizarCorreccion normaliza motivo al quitar", async () => {
    const b = qb("eq", null);
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    await actualizarCorreccion("p1", false, "motivo viejo");
    expect(b.update).toHaveBeenCalledWith({
      requiere_correccion: false,
      motivo_correccion: null,
    });
  });

  it("actualizarCorreccion guarda motivo al activar", async () => {
    const b = qb("eq", null);
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    await actualizarCorreccion("p1", true, "Color incorrecto");
    expect(b.update).toHaveBeenCalledWith({
      requiere_correccion: true,
      motivo_correccion: "Color incorrecto",
    });
  });
});

describe("buscarClientes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna vacío con menos de 2 caracteres", async () => {
    const result = await buscarClientes("a");
    expect(result).toEqual([]);
  });

  it("consulta la RPC y mapea resultados", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        {
          id: "c1",
          nombre: "Ana",
          telefono: "5551111111",
          email: null,
          last_order_at: null,
          pedidos_count: 3,
        },
      ],
      error: null,
    } as never);

    const result = await buscarClientes("55");
    expect(supabase.rpc).toHaveBeenCalledWith("buscar_clientes", {
      p_q: "55",
      p_limit: 8,
    });
    expect(result).toEqual([
      {
        id: "c1",
        nombre: "Ana",
        telefono: "5551111111",
        email: null,
        last_order_at: null,
        pedidos_count: 3,
      },
    ]);
  });

  it("usa la búsqueda local si la RPC falla", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: new Error("db"),
    } as never);
    const result = await buscarClientes("55");
    expect(result).toEqual([]);
  });
});

describe("liquidarSaldo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marca el saldo como cobrado con método y cobrador", async () => {
    const b = qb("maybeSingle", { id: "p1" });
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    await liquidarSaldo("p1", "Tarjeta", "usuario-1");
    expect(b.update).toHaveBeenCalledWith(
      expect.objectContaining({
        saldo_cobrado: true,
        saldo_metodo_pago: "Tarjeta",
        saldo_cobrado_por: "usuario-1",
      }),
    );
    expect(b.eq).toHaveBeenCalledWith("id", "p1");
    expect(b.eq).toHaveBeenCalledWith("saldo_cobrado", false);
  });

  it("rechaza una doble liquidación", async () => {
    const b = qb("maybeSingle", null);
    vi.mocked(supabase.from).mockReturnValue(b as ReturnType<typeof supabase.from>);
    await expect(liquidarSaldo("p1", "Efectivo", null)).rejects.toThrow(
      "El saldo ya fue cobrado o el pedido no existe.",
    );
  });
});

describe("liquidarSaldoConPagos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("envía los pagos divididos al RPC", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

    await liquidarSaldoConPagos(
      "p1",
      [
        { metodo: "Efectivo", monto: 30 },
        { metodo: "Tarjeta", monto: 20 },
      ],
      "usuario-1",
    );

    expect(supabase.rpc).toHaveBeenCalledWith("registrar_pagos_saldo", {
      p_pedido_id: "p1",
      p_pagos: [
        { metodo: "Efectivo", monto: 30 },
        { metodo: "Tarjeta", monto: 20 },
      ],
      p_cobrado_por: "usuario-1",
    });
  });

  it("propaga el error del RPC", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: new Error("La suma de pagos no coincide con el saldo"),
    });

    await expect(
      liquidarSaldoConPagos("p1", [{ metodo: "Efectivo", monto: 10 }], null),
    ).rejects.toThrow("La suma de pagos no coincide con el saldo");
  });
});

describe("contarPedidos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve el conteo exacto", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({ count: 42, error: null }),
    } as unknown as ReturnType<typeof supabase.from>);

    const total = await contarPedidos({});
    expect(total).toBe(42);
  });

  it("devuelve 0 si count es null", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({ count: null, error: null }),
    } as unknown as ReturnType<typeof supabase.from>);

    const total = await contarPedidos({});
    expect(total).toBe(0);
  });

  it("propaga error de supabase", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({ count: null, error: new Error("db") }),
    } as unknown as ReturnType<typeof supabase.from>);

    await expect(contarPedidos({})).rejects.toThrow("db");
  });
});
