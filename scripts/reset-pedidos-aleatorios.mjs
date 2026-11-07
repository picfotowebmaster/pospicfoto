import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const CANTIDAD_PEDIDOS = 20;
const UUID_CERO = "00000000-0000-0000-0000-000000000000";

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const money = (n) => Math.round(n * 100) / 100;
const pad = (n) => String(n).padStart(2, "0");
const fechaISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const horaISO = (h, m) => `${pad(h)}:${pad(m)}:00`;

function fechaConOffset(dias) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d;
}

function horaAleatoria(minHora, maxHora) {
  return horaISO(randInt(minHora, maxHora), pick([0, 15, 30, 45]));
}

function isoConOffsetHoras(fechaBase, horas) {
  const d = new Date(`${fechaBase}T12:00:00-06:00`);
  d.setHours(d.getHours() + horas);
  return d.toISOString();
}

async function main() {
  console.log("Leyendo pedidos actuales...");

  const { data: pedidosActuales, error: errorPedidos } = await supabase
    .from("pedidos")
    .select("*, detalle_pedidos(*)")
    .order("created_at", { ascending: true });

  if (errorPedidos) throw errorPedidos;

  const backupDir = join(process.cwd(), "..", "pospicfoto-backups");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = join(
    backupDir,
    `pedidos-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(
    backupPath,
    JSON.stringify(
      { generadoEn: new Date().toISOString(), pedidos: pedidosActuales ?? [] },
      null,
      2,
    ),
  );
  console.log(`Respaldo guardado en: ${backupPath}`);

  const clientesMap = new Map();
  for (const pedido of pedidosActuales ?? []) {
    if (!pedido.cliente_nombre?.trim()) continue;
    const clave = [
      pedido.cliente_nombre.trim(),
      (pedido.cliente_telefono || "").trim(),
      (pedido.cliente_email || "").trim(),
    ].join("|");
    clientesMap.set(clave, {
      nombre: pedido.cliente_nombre.trim(),
      telefono: (pedido.cliente_telefono || "").trim(),
      email: (pedido.cliente_email || "").trim(),
    });
  }

  const clientes = [...clientesMap.values()];
  console.log(`Clientes recuperados de pedidos: ${clientes.length}`);

  const [
    { data: entidades, error: errorEntidades },
    { data: productos, error: errorProductos },
    { data: perfiles, error: errorPerfiles },
    { data: atributos, error: errorAtributos },
    { data: valores, error: errorValores },
  ] = await Promise.all([
    supabase
      .from("entidades_emisoras")
      .select("id, codigo, nombre_comercial, marca_id, sucursal_id")
      .eq("activo", true),
    supabase
      .from("productos")
      .select("id, nombre, ruta, categoria_id")
      .eq("activo", true),
    supabase.from("profiles").select("id, rol").in("rol", [
      "mostrador",
      "admin",
      "superadmin",
    ]),
    supabase.from("atributos").select("id, nombre").eq("activo", true),
    supabase.from("atributo_valores").select("atributo_id, valor"),
  ]);

  for (const [nombre, error] of [
    ["entidades_emisoras", errorEntidades],
    ["productos", errorProductos],
    ["perfiles", errorPerfiles],
    ["atributos", errorAtributos],
    ["atributo_valores", errorValores],
  ]) {
    if (error) throw new Error(`${nombre}: ${error.message}`);
  }

  if (!entidades?.length) throw new Error("No hay entidades emisoras activas.");
  if (!productos?.length) throw new Error("No hay productos activos.");

  const valoresPorAtributo = new Map();
  for (const valor of valores ?? []) {
    if (!valoresPorAtributo.has(valor.atributo_id)) {
      valoresPorAtributo.set(valor.atributo_id, []);
    }
    valoresPorAtributo.get(valor.atributo_id).push(valor.valor);
  }
  const atributosConValores = (atributos ?? []).filter((a) =>
    valoresPorAtributo.get(a.id)?.length,
  );

  const clientesFallback = [
    { nombre: "Cliente Mostrador", telefono: "5512345678", email: "" },
    { nombre: "Cliente Frecuente", telefono: "5523456789", email: "" },
    { nombre: "Cliente Nuevo", telefono: "5534567890", email: "" },
  ];
  const poolClientes = clientes.length ? clientes : clientesFallback;
  const poolBarajado = [...poolClientes].sort(() => Math.random() - 0.5);

  console.log("Eliminando pedidos existentes...");
  const { error: errorDelete } = await supabase
    .from("pedidos")
    .delete()
    .neq("id", UUID_CERO);
  if (errorDelete) {
    throw new Error(`Error al eliminar pedidos: ${errorDelete.message}`);
  }
  console.log("  pedidos: limpio (detalle, movimientos y comentarios en cascada)");

  const estados = [
    "pendiente",
    "pendiente",
    "pendiente",
    "en_taller",
    "en_taller",
    "en_taller",
    "en_taller",
    "en_corte",
    "listo",
    "listo",
    "entregado",
    "entregado",
    "cancelado",
  ];

  const areaPorEstado = {
    pendiente: "mostrador",
    en_taller: null,
    en_corte: "corte",
    listo: "listo",
    entregado: "entregado",
    cancelado: "mostrador",
  };

  const areasTaller = [
    "diseno",
    "impresion",
    "laminado",
    "montaje",
    "books",
    "bastidores",
    "marcos",
    "taller",
  ];

  const insertados = [];

  for (let i = 0; i < CANTIDAD_PEDIDOS; i++) {
    const entidad = pick(entidades);
    const [marcaCodigo, sucursalCodigo] = entidad.codigo.split("_");
    if (!marcaCodigo || !sucursalCodigo || !entidad.marca_id || !entidad.sucursal_id) {
      throw new Error(`Entidad ${entidad.codigo} sin marca o sucursal válida.`);
    }

    const cliente = poolBarajado[i % poolBarajado.length];
    const estado = pick(estados);
    const ruta = pick(["R1", "R1", "R1", "R2", "R3", "R4"]);

    const productosRuta = productos.filter((p) => p.ruta === ruta);
    const poolProductos = productosRuta.length ? productosRuta : productos;
    const cantidadLineas = randInt(1, 3);
    const seleccionados = [];
    const usados = new Set();

    while (seleccionados.length < cantidadLineas) {
      const producto = pick(poolProductos);
      if (usados.has(producto.id)) continue;
      usados.add(producto.id);

      const cantidad = randInt(1, 4);
      const precioUnitario = money(randInt(40, 900));
      const atributosLinea = {};
      if (atributosConValores.length) {
        const cantidadAtributos = randInt(1, Math.min(2, atributosConValores.length));
        const atributosUsados = new Set();
        for (let j = 0; j < cantidadAtributos; j++) {
          const atributo = pick(atributosConValores);
          if (atributosUsados.has(atributo.id)) continue;
          atributosUsados.add(atributo.id);
          const valor = pick(valoresPorAtributo.get(atributo.id));
          atributosLinea[atributo.nombre] = valor;
        }
      }

      seleccionados.push({
        producto_id: producto.id,
        categoria_id: producto.categoria_id,
        producto_nombre: producto.nombre,
        cantidad,
        precio_unitario: precioUnitario,
        importe_linea: money(cantidad * precioUnitario),
        atributos: atributosLinea,
      });
    }

    const subtotal = money(
      seleccionados.reduce((suma, l) => suma + l.importe_linea, 0),
    );
    const porcentajeAnticipo = pick([0, 70, 70, 100, 100]);
    const anticipo = money((subtotal * porcentajeAnticipo) / 100);
    const total = subtotal;
    const pagado = anticipo >= total;

    const esEntregado = estado === "entregado";
    const esCancelado = estado === "cancelado";

    const offsetRecepcion = esEntregado
      ? -randInt(4, 30)
      : esCancelado
        ? -randInt(1, 15)
        : -randInt(0, 7);
    const offsetEntrega = esEntregado
      ? -randInt(0, 2)
      : randInt(1, 10);

    const fechaRecepcion = fechaISO(fechaConOffset(offsetRecepcion));
    const fechaEntrega = fechaISO(fechaConOffset(offsetEntrega));
    const horaRecepcion = horaAleatoria(9, 18);
    const horaEntrega = horaAleatoria(10, 19);
    const metodoPago = pick(["Efectivo", "Tarjeta", "Transferencia"]);
    const requiereCorreccion = Math.random() < 0.12;
    const prioridad = Math.random() < 0.15 ? "urgente" : "normal";
    const cajeroId = perfiles?.length ? pick(perfiles).id : null;
    const areaActual =
      areaPorEstado[estado] || pick(areasTaller);
    const fechaPagoTotal = pagado
      ? isoConOffsetHoras(fechaRecepcion, randInt(1, 48))
      : null;

    const { data: numeroPedido, error: errorNumero } = await supabase.rpc(
      "generar_numero_pedido",
      {
        marca_codigo: marcaCodigo,
        sucursal_codigo: sucursalCodigo,
      },
    );
    if (errorNumero) throw errorNumero;

    const { data: pedido, error: errorInsert } = await supabase
      .from("pedidos")
      .insert({
        numero_pedido: numeroPedido,
        cajero_id: cajeroId,
        cliente_nombre: cliente.nombre,
        cliente_telefono: cliente.telefono || null,
        cliente_email: cliente.email || null,
        fecha_recepcion: fechaRecepcion,
        hora_recepcion: horaRecepcion,
        fecha_entrega: fechaEntrega,
        hora_entrega: horaEntrega,
        requiere_correccion: requiereCorreccion,
        estado,
        area_actual: areaActual,
        ruta,
        subtotal,
        anticipo,
        total,
        metodo_pago: metodoPago,
        sucursal_id: entidad.sucursal_id,
        marca_id: entidad.marca_id,
        entidad_emisora_id: entidad.id,
        prioridad,
        notas: null,
        saldo_cobrado: pagado,
        saldo_metodo_pago: pagado ? metodoPago : null,
        saldo_cobrado_en: fechaPagoTotal,
        fecha_pago_total: fechaPagoTotal,
        created_at: `${fechaRecepcion}T${horaRecepcion}-06:00`,
        updated_at: new Date().toISOString(),
      })
      .select("id, numero_pedido")
      .single();

    if (errorInsert) throw errorInsert;

    const { error: errorDetalle } = await supabase
      .from("detalle_pedidos")
      .insert(
        seleccionados.map((linea) => ({
          pedido_id: pedido.id,
          producto_nombre: linea.producto_nombre,
          cantidad: linea.cantidad,
          precio_unitario: linea.precio_unitario,
          importe_linea: linea.importe_linea,
          atributos: linea.atributos,
          categoria_id: linea.categoria_id,
          producto_id: linea.producto_id,
        })),
      );

    if (errorDetalle) throw errorDetalle;

    insertados.push({
      numero: pedido.numero_pedido,
      cliente: cliente.nombre,
      entidad: entidad.nombre_comercial,
      estado,
      subtotal,
      anticipo,
      metodoPago,
      lineas: seleccionados.length,
    });
  }

  console.log(`\nPedidos creados: ${insertados.length}`);
  console.table(insertados);
}

main().catch((err) => {
  console.error("\nError:", err.message || err);
  process.exit(1);
});
