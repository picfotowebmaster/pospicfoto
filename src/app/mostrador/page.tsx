"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePedidoActual } from "@/lib/hooks/usePedidoActual";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { FormCliente } from "./_components/FormCliente";
import { LineaPedido } from "./_components/LineaPedido";
import { TablaLineas } from "./_components/TablaLineas";
import { ResumenPago } from "./_components/ResumenPago";
import { BotonPagar } from "./_components/BotonPagar";
import { Button } from "@/components/ui/Button";
import { crearPedido } from "@/lib/services/pedidos";
import { supabase } from "@/lib/supabase/client";
import { RUTAS_PRODUCCION } from "@/lib/utils/constantes";
import { fetchAtributosConValores } from "@/lib/services/atributos";
import { useOffline } from "@/lib/offline/useOffline";
import { useOfflineSync } from "@/lib/offline/useOfflineSync";
import { queueOrder, getQueueCount } from "@/lib/offline/orderQueue";
import { loadCatalog } from "@/lib/offline/catalogSync";
import OfflineIndicator from "../_components/OfflineIndicator";
import type { Atributo, AtributoValor } from "@/lib/supabase/types";
import type { LineaPedidoDraft } from "@/lib/supabase/types";
type AtributoConValores = Atributo & { valores: AtributoValor[] };

function MostradorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, profile, signOut } = useAuth();
  const { showError, showSuccess } = useToast();
  const sucursalId = profile?.sucursal_id ?? "";
  const pedido = usePedidoActual(sucursalId);
  const { isOnline } = useOffline();
  useOfflineSync({ cajeroId: session?.user.id, isOnline });
  const [atributosPool, setAtributosPool] = useState<AtributoConValores[]>([]);
  const [mostrandoLinea, setMostrandoLinea] = useState(false);
  const [editandoLinea, setEditandoLinea] = useState<LineaPedidoDraft | null>(null);
  const [pagarCargando, setPagarCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [ticketBusqueda, setTicketBusqueda] = useState("");
  const [buscandoTicket, setBuscandoTicket] = useState(false);
  const [sucursalNombre, setSucursalNombre] = useState("");
  const [marcas, setMarcas] = useState<{ id: string; nombre: string; codigo: string }[]>([]);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const mensaje = searchParams.get("mensaje");
    if (mensaje === "acceso_denegado") {
      setMensajeError("No tienes permisos para acceder a esa sección.");
    } else if (mensaje === "perfil_no_encontrado") {
      setMensajeError("Tu perfil de usuario no fue encontrado. Contacta al administrador.");
    }
  }, [searchParams]);

  useEffect(() => {
    loadCatalog(isOnline).then((cached) => {
      if (cached.atributos) setAtributosPool(cached.atributos as AtributoConValores[]);
      if (cached.marcas) {
        setMarcas(cached.marcas as { id: string; nombre: string; codigo: string }[]);
      }
      if (cached.sucursales && sucursalId) {
        const sucs = cached.sucursales as { id: string; nombre: string; codigo: string }[];
        const found = sucs.find((s) => s.id === sucursalId);
        if (found) setSucursalNombre(found.nombre);
      }
    }).catch(() => {});
  }, [isOnline, sucursalId]);

  useEffect(() => {
    if (isOnline && sucursalId) {
      supabase
        .from("sucursales")
        .select("nombre")
        .eq("id", sucursalId)
        .single()
        .then(({ data }: { data: unknown }) => {
          if (data) setSucursalNombre((data as { nombre: string }).nombre);
        })
        .catch(() => {});
    }
  }, [isOnline, sucursalId]);

  useEffect(() => {
    if (isOnline) {
      fetchAtributosConValores()
        .then(setAtributosPool)
        .catch(() => {});
      supabase
        .from("marcas")
        .select("id, nombre, codigo")
        .then(({ data }: { data: unknown }) => {
          if (data) setMarcas(data as { id: string; nombre: string; codigo: string }[]);
        })
        .catch(() => {});
    }
  }, [isOnline]);

  useEffect(() => {
    pedido.restoreDraft();
  }, []);

  useEffect(() => {
    getQueueCount().then(setQueueCount).catch(() => {});
    const interval = setInterval(() => {
      getQueueCount().then(setQueueCount).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  function handleAgregarLinea() {
    setEditandoLinea(null);
    setMostrandoLinea(true);
  }

  function handleEditarLinea(linea: LineaPedidoDraft) {
    setEditandoLinea(linea);
    setMostrandoLinea(true);
  }

  function handleSaveLinea(linea: LineaPedidoDraft) {
    if (editandoLinea) {
      pedido.eliminarLinea(editandoLinea.id);
      pedido.agregarLinea({
        producto_nombre: linea.producto_nombre,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
        atributos: linea.atributos,
      });
    } else {
      pedido.agregarLinea({
        producto_nombre: linea.producto_nombre,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
        atributos: linea.atributos,
      });
    }
    setMostrandoLinea(false);
    setEditandoLinea(null);
  }

  async function handlePagar() {
    if (!session?.user.id) {
      showError("Sesión expirada. Inicia sesión nuevamente.");
      router.push("/auth/login");
      return;
    }
    setPagarCargando(true);

    const draft = {
      cliente_nombre: pedido.cliente.nombre,
      cliente_telefono: pedido.cliente.telefono,
      fecha_entrega: pedido.cliente.fechaEntrega,
      hora_entrega: pedido.cliente.horaEntrega,
      requiere_correccion: pedido.cliente.requiereCorreccion,
      lineas: pedido.lineas,
      subtotal: pedido.subtotal,
      anticipo: pedido.anticipo,
      total: pedido.total,
      metodo_pago: pedido.metodoPago,
      ruta: pedido.ruta,
      sucursal_id: sucursalId,
      marca_id: pedido.marcaId,
    };

    if (!isOnline) {
      try {
        await queueOrder(draft);
        pedido.limpiar();
        showSuccess("Pedido guardado localmente. Se sincronizará al reconectar.");
        setQueueCount((c) => c + 1);
      } catch (err) {
        console.error("Error al guardar pedido offline:", err);
        showError("Error al guardar el pedido localmente.");
      }
      setPagarCargando(false);
      return;
    }

    try {
      const numeroPedido = await crearPedido(draft, session.user.id);
      pedido.limpiar();
      router.push(`/mostrador/ticket/${numeroPedido}`);
    } catch (err) {
      console.error("Error al crear pedido:", err);
      showError("Error al crear el pedido. Intenta de nuevo.");
      setPagarCargando(false);
    }
  }

  async function handleBuscarTicket(e: React.FormEvent) {
    e.preventDefault();
    const query = ticketBusqueda.trim();
    if (!query) return;
    setBuscandoTicket(true);
    try {
      const { data } = await supabase
        .from("pedidos")
        .select("numero_pedido")
        .ilike("numero_pedido", `%${query}%`)
        .limit(2);
      if (!data || data.length === 0) {
        showError("No se encontró ningún pedido con ese ID.");
      } else {
        router.push(`/mostrador/ticket/${data[0].numero_pedido}`);
      }
    } catch (err) {
      console.error("Error buscando ticket:", err);
      showError("Error al buscar el ticket.");
    } finally {
      setBuscandoTicket(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">PIC PHOTO</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sistema de Punto de Venta</p>
        </div>
        <form onSubmit={handleBuscarTicket} className="flex items-center gap-1">
          <input
            type="text"
            value={ticketBusqueda}
            onChange={(e) => setTicketBusqueda(e.target.value)}
            placeholder="Buscar pedido (ej. PIC-PAL-00001)..."
            className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <Button type="submit" size="sm" variant="primary" disabled={buscandoTicket || !ticketBusqueda.trim()}>
            {buscandoTicket ? "..." : "Ir"}
          </Button>
        </form>
        <div className="flex items-center gap-3">
          <OfflineIndicator />
          <ThemeToggle />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {session?.user.email}
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Salir
          </Button>
        </div>
      </header>

      {mensajeError && (
        <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700 dark:text-red-300">{mensajeError}</p>
              <button
                onClick={() => setMensajeError("")}
                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold"
              >
                <i className="fas fa-times" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <FormCliente
          nombre={pedido.cliente.nombre}
          telefono={pedido.cliente.telefono}
          fechaEntrega={pedido.cliente.fechaEntrega}
          horaEntrega={pedido.cliente.horaEntrega}
          requiereCorreccion={pedido.cliente.requiereCorreccion}
          onNombreChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, nombre: v })
          }
          onTelefonoChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, telefono: v })
          }
          onFechaEntregaChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, fechaEntrega: v })
          }
          onHoraEntregaChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, horaEntrega: v })
          }
          onRequiereCorreccionChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, requiereCorreccion: v })
          }
        />

        <div className="bg-white rounded-xl shadow p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Sucursal
              </label>
              <input
                type="text"
                value={sucursalNombre || "No asignada"}
                readOnly
                className="w-full border border-gray-200 bg-gray-50 text-gray-700 rounded-lg px-2.5 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Marca <span className="text-red-400">*</span>
              </label>
              <select
                value={pedido.marcaId}
                onChange={(e) => pedido.setMarcaId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Seleccionar marca...</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
            Ruta de Producción
          </h3>
          <select
            value={pedido.ruta}
            onChange={(e) => pedido.setRuta(e.target.value as typeof pedido.ruta)}
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {RUTAS_PRODUCCION.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label} — {r.desc}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
              Productos ({pedido.lineas.length})
            </h3>
            <Button
              size="sm"
              onClick={handleAgregarLinea}
              disabled={mostrandoLinea}
            >
              + Agregar Producto
            </Button>
          </div>

          <TablaLineas
            lineas={pedido.lineas}
            onEditar={handleEditarLinea}
            onEliminar={pedido.eliminarLinea}
          />

          {mostrandoLinea && (
            <div className="mt-3">
              <LineaPedido
                id={editandoLinea?.id || ""}
                atributosPool={atributosPool}
                onSave={handleSaveLinea}
                onCancel={() => {
                  setMostrandoLinea(false);
                  setEditandoLinea(null);
                }}
                editData={editandoLinea || undefined}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResumenPago
            subtotal={pedido.subtotal}
            anticipo={pedido.anticipo}
            total={pedido.total}
            porcentajeAnticipo={pedido.porcentajeAnticipo}
            metodoPago={pedido.metodoPago}
            onPorcentajeChange={pedido.setPorcentajeAnticipo}
            onMetodoPagoChange={pedido.setMetodoPago}
          />

          <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-3">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
              Acción
            </h3>
            <BotonPagar
              onClick={handlePagar}
              cargando={pagarCargando}
              valido={pedido.valido}
            />
            {!isOnline && (
              <p className="text-xs text-amber-600 text-center">
                <i className="fas fa-cloud-upload-alt mr-1" />
                Modo offline — el pedido se guardará localmente
              </p>
            )}
            {queueCount > 0 && (
              <p className="text-xs text-blue-600 text-center">
                <i className="fas fa-clock mr-1" />
                {queueCount} pedido(s) pendiente(s) de sincronizar
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MostradorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Cargando punto de venta...</p></div>}>
      <MostradorContent />
    </Suspense>
  );
}
