import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  construirReporteContable,
  type PedidoReporteContable,
  type RangoReporte,
} from "../src/lib/utils/reportesContables";
import { fechaNegocio } from "../src/lib/utils/fechas";

const CAMPOS =
  "id, numero_pedido, cliente_nombre, cliente_rfc, cajero_id, sucursal_id, marca_id, fecha_recepcion, estado, subtotal, anticipo, total, metodo_pago, saldo_cobrado, saldo_metodo_pago, saldo_cobrado_en, saldo_cobrado_por, reembolso_estado, reembolso_monto, reembolso_realizado_en, reembolso_realizado_por, factura_folio, factura_uuid, factura_estado, factura_fecha, pagos_pedido(tipo, metodo_pago, monto, cobrado_por, cobrado_en)";

const CAMPOS_COBERTURA =
  "id, numero_pedido, estado, anticipo, total, saldo_cobrado, pagos_pedido(tipo, monto)";

const OFFSET = "-06:00";
const LOTE = 1000;
const LOTE_IDS = 200;

function cargarEnvLocal() {
  try {
    for (const linea of readFileSync(".env.local", "utf8").split("\n")) {
      const texto = linea.trim();
      if (!texto || texto.startsWith("#")) continue;
      const separador = texto.indexOf("=");
      if (separador === -1) continue;
      const clave = texto.slice(0, separador).trim();
      let valor = texto.slice(separador + 1).trim();
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1);
      }
      if (!process.env[clave]) process.env[clave] = valor;
    }
  } catch {
    // Sin .env.local: se usan las variables del entorno.
  }
}

function arg(nombre: string): string | undefined {
  const indice = process.argv.indexOf(`--${nombre}`);
  if (indice === -1) return undefined;
  return process.argv[indice + 1];
}

function round2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function money(valor: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(valor);
}

function rangoMesActual(): RangoReporte {
  const hoy = fechaNegocio(new Date());
  const [anio, mes] = hoy.split("-");
  const ultimoDia = new Date(Number(anio), Number(mes), 0).getDate();
  return {
    desde: `${anio}-${mes}-01`,
    hasta: `${anio}-${mes}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

function dentroDeRango(fecha: string, rango: RangoReporte): boolean {
  return fecha !== "" && fecha >= rango.desde && fecha <= rango.hasta;
}

function prefijoTienda(numeroPedido?: string | null): string {
  const partes = (numeroPedido ?? "").split("-");
  if (partes[1] === "CUB") return "Cuba";
  if (partes[1] === "PAL") return "Palma";
  return "Sin tienda";
}

const inicioDia = (fecha: string) => `${fecha}T00:00:00${OFFSET}`;
const finDia = (fecha: string) => `${fecha}T23:59:59.999${OFFSET}`;

async function main() {
  cargarEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (revisa .env.local).",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rango: RangoReporte =
    arg("desde") && arg("hasta")
      ? { desde: arg("desde")!, hasta: arg("hasta")! }
      : rangoMesActual();
  const sucursalFiltro = arg("sucursal") ?? null;
  const marcaFiltro = arg("marca") ?? null;

  console.log(
    `Verificación de reportes · ${rango.desde} → ${rango.hasta}` +
      (sucursalFiltro ? ` · sucursal ${sucursalFiltro}` : "") +
      (marcaFiltro ? ` · marca ${marcaFiltro}` : ""),
  );

  // 1) Catálogos legibles con service_role (migración 080)
  const { data: sucursales, error: errorSucursales } = await supabase
    .from("sucursales")
    .select("id, nombre");
  const { data: marcas, error: errorMarcas } = await supabase
    .from("marcas")
    .select("id, nombre");

  const catalogosOk = !errorSucursales && !errorMarcas;
  console.log(
    `\n[1] Catálogos service_role: ${
      catalogosOk ? "OK" : "FALLA"
    }${errorSucursales ? ` (sucursales: ${errorSucursales.message})` : ""}${
      errorMarcas ? ` (marcas: ${errorMarcas.message})` : ""
    }`,
  );

  const nombresSucursales = new Map<string, string>(
    (sucursales ?? []).map((s) => [s.id as string, s.nombre as string]),
  );
  const nombresMarcas = new Map<string, string>(
    (marcas ?? []).map((m) => [m.id as string, m.nombre as string]),
  );

  // 2) Cobertura de pagos_pedido (migración 079)
  const todos: {
    id: string;
    numero_pedido: string | null;
    estado: string | null;
    anticipo: number | null;
    total: number | null;
    saldo_cobrado: boolean | null;
    pagos_pedido: { tipo: string; monto: number }[] | null;
  }[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("pedidos")
      .select(CAMPOS_COBERTURA)
      .range(offset, offset + LOTE - 1);
    if (error) throw error;
    const lote = (data ?? []) as unknown as typeof todos;
    todos.push(...lote);
    if (lote.length < LOTE) break;
    offset += LOTE;
  }

  let faltaAnticipo = 0;
  let faltaSaldo = 0;
  let montoAnticipoFaltante = 0;
  let montoSaldoFaltante = 0;
  for (const pedido of todos) {
    if (pedido.estado === "cancelado") continue;
    const pagos = pedido.pagos_pedido ?? [];
    const tieneAnticipo = pagos.some((p) => p.tipo === "anticipo");
    const tieneSaldo = pagos.some((p) => p.tipo === "saldo");
    const anticipo = Number(pedido.anticipo ?? 0);
    const total = Number(pedido.total ?? 0);
    const saldo = Math.max(0, round2(total - anticipo));

    if (!tieneAnticipo && anticipo > 0.01) {
      faltaAnticipo += 1;
      montoAnticipoFaltante = round2(montoAnticipoFaltante + anticipo);
    }
    if (!tieneSaldo && pedido.saldo_cobrado && saldo > 0.01) {
      faltaSaldo += 1;
      montoSaldoFaltante = round2(montoSaldoFaltante + saldo);
    }
  }

  const coberturaOk = faltaAnticipo === 0 && faltaSaldo === 0;
  console.log(
    `[2] Cobertura pagos_pedido: ${coberturaOk ? "OK" : "PENDIENTE"}` +
      (faltaAnticipo > 0
        ? ` · ${faltaAnticipo} anticipos sin registro (${money(montoAnticipoFaltante)})`
        : "") +
      (faltaSaldo > 0
        ? ` · ${faltaSaldo} saldos sin registro (${money(montoSaldoFaltante)})`
        : ""),
  );

  // 3) Datos del reporte
  async function obtenerPorActividad(): Promise<PedidoReporteContable[]> {
    const pedidos: PedidoReporteContable[] = [];
    let pos = 0;
    while (true) {
      let consulta = supabase
        .from("pedidos")
        .select(CAMPOS)
        .or(
          `and(fecha_recepcion.gte.${rango.desde},fecha_recepcion.lte.${rango.hasta}),and(saldo_cobrado_en.gte.${inicioDia(rango.desde)},saldo_cobrado_en.lte.${finDia(rango.hasta)}),and(reembolso_realizado_en.gte.${inicioDia(rango.desde)},reembolso_realizado_en.lte.${finDia(rango.hasta)})`,
        );
      if (sucursalFiltro) consulta = consulta.eq("sucursal_id", sucursalFiltro);
      if (marcaFiltro) consulta = consulta.eq("marca_id", marcaFiltro);
      const { data, error } = await consulta
        .order("fecha_recepcion", { ascending: true })
        .range(pos, pos + LOTE - 1);
      if (error) throw error;
      const lote = (data ?? []) as unknown as PedidoReporteContable[];
      pedidos.push(...lote);
      if (lote.length < LOTE) break;
      pos += LOTE;
    }
    return pedidos;
  }

  async function obtenerIdsConPagos(): Promise<string[]> {
    const ids = new Set<string>();
    let pos = 0;
    while (true) {
      let consulta = supabase
        .from("pagos_pedido")
        .select("pedido_id, pedidos!inner(sucursal_id, marca_id)")
        .gte("cobrado_en", inicioDia(rango.desde))
        .lte("cobrado_en", finDia(rango.hasta));
      if (sucursalFiltro) consulta = consulta.eq("pedidos.sucursal_id", sucursalFiltro);
      if (marcaFiltro) consulta = consulta.eq("pedidos.marca_id", marcaFiltro);
      const { data, error } = await consulta.range(pos, pos + LOTE - 1);
      if (error) throw error;
      const lote = (data ?? []) as unknown as { pedido_id: string }[];
      for (const pago of lote) ids.add(pago.pedido_id);
      if (lote.length < LOTE) break;
      pos += LOTE;
    }
    return [...ids];
  }

  async function obtenerPorIds(ids: string[]): Promise<PedidoReporteContable[]> {
    const pedidos: PedidoReporteContable[] = [];
    for (let i = 0; i < ids.length; i += LOTE_IDS) {
      let consulta = supabase
        .from("pedidos")
        .select(CAMPOS)
        .in("id", ids.slice(i, i + LOTE_IDS));
      if (sucursalFiltro) consulta = consulta.eq("sucursal_id", sucursalFiltro);
      if (marcaFiltro) consulta = consulta.eq("marca_id", marcaFiltro);
      const { data, error } = await consulta.range(0, LOTE_IDS - 1);
      if (error) throw error;
      pedidos.push(...((data ?? []) as unknown as PedidoReporteContable[]));
    }
    return pedidos;
  }

  const pedidos = await obtenerPorActividad();
  const idsConPagos = await obtenerIdsConPagos();
  const incluidos = new Set(pedidos.map((p) => p.id));
  const faltantes = idsConPagos.filter((id) => !incluidos.has(id));
  if (faltantes.length > 0) {
    pedidos.push(...(await obtenerPorIds(faltantes)));
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nombre");
  const nombresVendedores = new Map<string, string>(
    (profiles ?? []).map((p) => [p.id as string, (p.nombre as string) ?? "Sin nombre"]),
  );

  const reporte = construirReporteContable(pedidos, rango, "", {
    nombresSucursales,
    nombresMarcas,
    nombresVendedores,
  });

  // 4) Conciliación: registrado + fallback legacy − reembolsos == reportado
  let registrado = 0;
  let legacy = 0;
  let reembolsos = 0;
  for (const pedido of pedidos) {
    if (pedido.estado === "cancelado") continue;
    const pagos = pedido.pagos_pedido ?? [];
    const anticipos = pagos.filter(
      (p) => p.tipo === "anticipo" && Number(p.monto) > 0.01,
    );
    const saldos = pagos.filter(
      (p) => p.tipo === "saldo" && Number(p.monto) > 0.01,
    );

    for (const pago of [...anticipos, ...saldos]) {
      const dia = fechaNegocio(pago.cobrado_en ?? "");
      if (dentroDeRango(dia, rango)) registrado = round2(registrado + Number(pago.monto));
    }

    const anticipo = Number(pedido.anticipo ?? 0);
    if (anticipos.length === 0 && anticipo > 0.01) {
      const dia = fechaNegocio(pedido.fecha_recepcion);
      if (dentroDeRango(dia, rango)) legacy = round2(legacy + anticipo);
    }

    const total = Number(pedido.total ?? 0);
    const saldo = Math.max(0, round2(total - anticipo));
    if (saldos.length === 0 && pedido.saldo_cobrado && saldo > 0.01) {
      const dia = fechaNegocio(pedido.saldo_cobrado_en ?? pedido.fecha_recepcion);
      if (dentroDeRango(dia, rango)) legacy = round2(legacy + saldo);
    }

    const reembolso = Number(pedido.reembolso_monto ?? 0);
    if (reembolso > 0.01 && pedido.reembolso_estado === "realizado") {
      const dia = fechaNegocio(pedido.reembolso_realizado_en ?? "");
      if (dentroDeRango(dia, rango)) reembolsos = round2(reembolsos + reembolso);
    }
  }

  const esperado = round2(registrado + legacy - reembolsos);
  const diferencia = round2(esperado - reporte.totalCobrado);
  const conciliacionOk = diferencia === 0;

  console.log(
    `[3] Conciliación cobrado: ${conciliacionOk ? "OK" : "FALLA"}` +
      ` · registrado ${money(registrado)} + legacy ${money(legacy)} − reembolsos ${money(reembolsos)}` +
      ` = ${money(esperado)} vs reporte ${money(reporte.totalCobrado)}` +
      (conciliacionOk ? "" : ` (dif ${money(diferencia)})`),
  );

  console.log("\n================ RESUMEN DEL REPORTE ================");
  console.log(
    `Pedidos: ${reporte.totalPedidos} · Vendido: ${money(reporte.totalVendido)} · Cobrado: ${money(reporte.totalCobrado)} · Saldo pendiente: ${money(reporte.saldoPendiente)} · Reembolsos: ${money(reporte.totalReembolsado)} · Ticket prom.: ${money(reporte.ticketPromedio)}`,
  );

  const tiendas = new Map<
    string,
    { pedidos: number; vendido: number; cobrado: number }
  >();
  const entradaTienda = (nombre: string) => {
    const actual = tiendas.get(nombre) ?? { pedidos: 0, vendido: 0, cobrado: 0 };
    tiendas.set(nombre, actual);
    return actual;
  };

  for (const pedido of pedidos) {
    if (pedido.estado === "cancelado") continue;
    if (!dentroDeRango(pedido.fecha_recepcion, rango)) continue;
    const nombre =
      nombresSucursales.get(pedido.sucursal_id ?? "") ??
      prefijoTienda(pedido.numero_pedido);
    const tienda = entradaTienda(nombre);
    tienda.pedidos += 1;
    tienda.vendido = round2(tienda.vendido + Number(pedido.total ?? 0));
  }
  for (const movimiento of reporte.movimientos) {
    const nombre =
      nombresSucursales.get(movimiento.sucursalId ?? "") ??
      prefijoTienda(movimiento.numeroPedido);
    const tienda = entradaTienda(nombre);
    tienda.cobrado = round2(tienda.cobrado + movimiento.importe);
  }

  console.log("\nPor tienda:");
  for (const [nombre, t] of [...tiendas.entries()].sort()) {
    console.log(
      `  - ${nombre}: ${t.pedidos} pedidos, vendido ${money(t.vendido)}, cobrado ${money(t.cobrado)}`,
    );
  }

  console.log("\nPor vendedor:");
  for (const v of reporte.porVendedor) {
    console.log(
      `  - ${v.vendedorNombre}: ${v.pedidos} pedidos, vendido ${money(v.vendido)}, cobrado ${money(v.cobrado)}`,
    );
  }

  console.log("\nPor cobrador:");
  for (const c of reporte.porCobrador) {
    console.log(
      `  - ${c.cobradorNombre}: ${c.movimientos} movs, cobrado ${money(c.cobrado)}`,
    );
  }

  console.log("\nPor método:");
  for (const m of reporte.cobradoPorMetodo) {
    console.log(`  - ${m.metodo_pago}: ${m.count} movs, ${money(m.total)}`);
  }

  const ok = catalogosOk && coberturaOk && conciliacionOk;
  console.log(
    `\nResultado: ${ok ? "TODO OK" : "REVISAR"} ` +
      `(catálogos ${catalogosOk ? "OK" : "FALLA"}, cobertura ${
        coberturaOk ? "OK" : "PENDIENTE"
      }, conciliación ${conciliacionOk ? "OK" : "FALLA"})`,
  );

  process.exitCode = ok ? 0 : 1;
}

main().catch((error) => {
  console.error("Error al verificar reportes:", error);
  process.exit(1);
});
