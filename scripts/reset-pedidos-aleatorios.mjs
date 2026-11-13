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

const CANTIDAD_PEDIDOS = 50;
const UUID_CERO = "00000000-0000-0000-0000-000000000000";

const CAJEROS_EMAILS = ["firefoxlyly@gmail.com", "jesus@picfoto.mx"];

const CLIENTES = [
  {
    nombre: "Jessica Herrera León",
    telefono: "525666653146",
    email: "jessgreen.hleon@gmail.com",
  },
  {
    nombre: "Liliana Esquivel Rivera",
    telefono: "524494531729",
    email: "firefoxlyly@gmail.com",
  },
  {
    nombre: "Baldemar Menchaca",
    telefono: "5545204518",
    email: "bmgconstruccionesei@gmail.com",
  },
  {
    nombre: "Raul Contreras",
    telefono: "525521503391",
    email: "contreras.mandujano@gmail.com",
  },
  {
    nombre: "Jesús López Velázquez",
    telefono: "525568032061",
    email: "jesuslv2412@hotmail.com",
  },
  {
    nombre: "Angélica Jardinez Maldonado",
    telefono: "525624452007",
    email: "angelica.ajm64@gmail.com",
  },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const money = (n) => Math.round(n * 100) / 100;
const pad = (n) => String(n).padStart(2, "0");
const fechaISO = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(d);
const horaISO = (h, m) => `${pad(h)}:${pad(m)}:00`;

function fechaConOffset(dias) {
  const hoyMexico = fechaISO(new Date());
  const d = new Date(`${hoyMexico}T12:00:00-06:00`);
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

  const { data: clientesActuales, error: errorClientesActuales } = await supabase
    .from("clientes")
    .select("*");

  if (errorClientesActuales) throw errorClientesActuales;

  const backupDir = join(process.cwd(), "..", "pospicfoto-backups");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = join(
    backupDir,
    `pedidos-clientes-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(
    backupPath,
    JSON.stringify(
      {
        generadoEn: new Date().toISOString(),
        pedidos: pedidosActuales ?? [],
        clientes: clientesActuales ?? [],
      },
      null,
      2,
    ),
  );
  console.log(`Respaldo guardado en: ${backupPath}`);
  console.log(
    `Pedidos: ${pedidosActuales?.length ?? 0} · Clientes: ${clientesActuales?.length ?? 0}`,
  );

  const { data: authData, error: authError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 500 });

  if (authError) throw authError;

  const cajeros = CAJEROS_EMAILS.map((email) => {
    const usuario = (authData?.users ?? []).find((u) => u.email === email);
    if (!usuario) throw new Error(`No existe el usuario ${email}`);
    return { id: usuario.id, email };
  });

  console.log(
    "Cajeros asignados:",
    cajeros.map((c) => c.email).join(" · "),
  );

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
    supabase
      .from("profiles")
      .select("id, rol")
      .in(
        "id",
        cajeros.map((c) => c.id),
      ),
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

  const perfilesPorId = new Map((perfiles ?? []).map((p) => [p.id, p]));
  for (const cajero of cajeros) {
    if (!perfilesPorId.has(cajero.id)) {
      throw new Error(`No se encontró el perfil de ${cajero.email}`);
    }
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

  console.log("Eliminando pedidos y clientes existentes...");
  const { error: errorDeletePedidos } = await supabase
    .from("pedidos")
    .delete()
    .neq("id", UUID_CERO);
  if (errorDeletePedidos) {
    throw new Error(
      `Error al eliminar pedidos: ${errorDeletePedidos.message}`,
    );
  }
  console.log("  pedidos: limpio (detalle, movimientos y comentarios en cascada)");

  const { error: errorDeleteClientes } = await supabase
    .from("clientes")
    .delete()
    .neq("id", UUID_CERO);
  if (errorDeleteClientes) {
    throw new Error(
      `Error al eliminar clientes: ${errorDeleteClientes.message}`,
    );
  }
  console.log("  clientes: limpio");

  const { data: clientesCreados, error: errorClientes } = await supabase
    .from("clientes")
    .insert(CLIENTES)
    .select("id, nombre, telefono, email");
  if (errorClientes) {
    throw new Error(`Error al crear clientes: ${errorClientes.message}`);
  }
  console.log(`  clientes creados: ${clientesCreados.length}`);

  const poolBarajado = [...clientesCreados].sort(() => Math.random() - 0.5);

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
    const cajeroId = cajeros[i % cajeros.length].id;
    const areaActual =
      areaPorEstado[estado] || pick(areasTaller);
    const fechaPagoTotal = pagado
      ? isoConOffsetHoras(fechaRecepcion, randInt(1, 48))
      : null;
    const creadoEn = `${fechaRecepcion}T${horaRecepcion}-06:00`;

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
        cliente_id: cliente.id,
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
        saldo_cobrado_por: pagado ? cajeroId : null,
        fecha_pago_total: fechaPagoTotal,
        created_at: creadoEn,
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
      clienteId: cliente.id,
      entidad: entidad.nombre_comercial,
      estado,
      subtotal,
      anticipo,
      total,
      metodoPago,
      creadoEn,
      lineas: seleccionados.length,
    });
  }

  const statsPorCliente = new Map();
  for (const pedido of insertados) {
    const actual = statsPorCliente.get(pedido.clienteId) ?? {
      pedidos: 0,
      total: 0,
      ultimo: pedido.creadoEn,
    };
    actual.pedidos += 1;
    if (pedido.estado !== "cancelado") actual.total += pedido.total;
    if (pedido.creadoEn > actual.ultimo) actual.ultimo = pedido.creadoEn;
    statsPorCliente.set(pedido.clienteId, actual);
  }

  for (const [clienteId, stats] of statsPorCliente) {
    const { error: errorStats } = await supabase
      .from("clientes")
      .update({
        pedidos_count: stats.pedidos,
        total_gastado: money(stats.total),
        last_order_at: stats.ultimo,
      })
      .eq("id", clienteId);
    if (errorStats) {
      throw new Error(
        `Error al actualizar estadísticas del cliente: ${errorStats.message}`,
      );
    }
  }

  console.log(`\nPedidos creados: ${insertados.length}`);
  console.table(
    insertados.map((pedido) => ({
      numero: pedido.numero,
      cliente: pedido.cliente,
      entidad: pedido.entidad,
      estado: pedido.estado,
      subtotal: pedido.subtotal,
      anticipo: pedido.anticipo,
      metodoPago: pedido.metodoPago,
      lineas: pedido.lineas,
    })),
  );

  console.log("\nClientes:");
  console.table(
    clientesCreados.map((cliente) => {
      const stats = statsPorCliente.get(cliente.id);
      return {
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        email: cliente.email,
        pedidos: stats?.pedidos ?? 0,
        total_gastado: money(stats?.total ?? 0),
      };
    }),
  );
}

main().catch((err) => {
  console.error("\nError:", err.message || err);
  process.exit(1);
});
