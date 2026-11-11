"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePedidoActual } from "@/lib/hooks/usePedidoActual";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { FormCliente } from "./_components/FormCliente";
import { ModalLineaPedido } from "./_components/ModalLineaPedido";
import { enviarPushArea } from "@/lib/services/notifications";
import { TablaLineas } from "./_components/TablaLineas";
import { ResumenPago } from "./_components/ResumenPago";
import { BotonPagar } from "./_components/BotonPagar";
import { ModalConfirmarPedido } from "./_components/ModalConfirmarPedido";
import { Button } from "@/components/ui/Button";
import { crearPedidoAgrupado } from "@/lib/services/pedidos";
import { supabase } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { NOMBRE_EMPRESA } from "@/lib/utils/constantes";
import type { Catalogo } from "@/lib/services/catalogo";
import { useOffline } from "@/lib/offline/useOffline";
import { useOfflineSync } from "@/lib/offline/useOfflineSync";
import { queueOrder, getQueueCount } from "@/lib/offline/orderQueue";
import { loadCatalog, refreshCatalog } from "@/lib/offline/catalogSync";
import {
  emparejarEntidad,
  fetchEntidadEmisora,
  fetchEntidadPorMarcaSucursal,
} from "@/lib/services/entidadesEmisoras";
import { facturacionHabilitada } from "@/lib/config/features";
import OfflineIndicator from "../_components/OfflineIndicator";
import { OfflineTicket } from "./_components/OfflineTicket";
import RoleSwitcher from "@/app/_components/RoleSwitcher";
import type {
  Atributo,
  AtributoValor,
  EntidadEmisora,
  LineaPedidoDraft,
} from "@/lib/supabase/types";
import type { TicketPedido } from "@/components/ui/TicketTemplate";
type AtributoConValores = Atributo & { valores: AtributoValor[] };

function MostradorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, profile, signOut } = useAuth();
  const { showError, showSuccess } = useToast();
  const sucursalId = profile?.sucursal_id ?? "";
  const [entidad, setEntidad] = useState<EntidadEmisora | null>(null);
  const entidadEmisoraId = profile?.entidad_emisora_id ?? entidad?.id ?? "";
  const pedido = usePedidoActual(
    sucursalId,
    entidadEmisoraId,
    entidad?.marca_id ?? profile?.marca_id ?? "",
  );
  const { isOnline } = useOffline();
  useOfflineSync({ cajeroId: session?.user.id, isOnline });
  const [atributosPool, setAtributosPool] = useState<AtributoConValores[]>([]);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [mostrandoLinea, setMostrandoLinea] = useState(false);
  const [editandoLinea, setEditandoLinea] = useState<LineaPedidoDraft | null>(null);
  const [pagarCargando, setPagarCargando] = useState(false);
  const [mensajeDescartado, setMensajeDescartado] = useState(false);
  const [ticketBusqueda, setTicketBusqueda] = useState("");
  const [buscandoTicket, setBuscandoTicket] = useState(false);
  const [sucursalNombre, setSucursalNombre] = useState("");
  const [ticketOffline, setTicketOffline] = useState<{
    pedido: TicketPedido;
    emisor: EntidadEmisora;
  } | null>(null);
  const [marcas, setMarcas] = useState<{ id: string; nombre: string; codigo: string }[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [confirmando, setConfirmando] = useState(false);
  const [refrescandoCatalogo, setRefrescandoCatalogo] = useState(false);
  const refrescandoRef = useRef<Promise<void> | null>(null);

  const refrescarCatalogo = useCallback(
    (opciones?: { silencioso?: boolean }): Promise<void> => {
      if (!isOnline) return Promise.resolve();
      if (refrescandoRef.current) return refrescandoRef.current;

      setRefrescandoCatalogo(true);
      const promesa = (async () => {
        try {
          const { atributos, catalogo } = await refreshCatalog();
          setAtributosPool(atributos);
          setCatalogo(catalogo);
          if (!opciones?.silencioso) showSuccess("Catálogo actualizado.");
        } catch (err) {
          showError(
            err instanceof Error
              ? `No se pudo actualizar el catálogo: ${err.message}`
              : "No se pudo actualizar el catálogo.",
          );
        } finally {
          refrescandoRef.current = null;
          setRefrescandoCatalogo(false);
        }
      })();
      refrescandoRef.current = promesa;
      return promesa;
    },
    [isOnline, showError, showSuccess],
  );

  const mensajeParam = searchParams.get("mensaje");
  const mensajeError = mensajeDescartado
    ? ""
    : mensajeParam === "acceso_denegado"
      ? "No tienes permisos para acceder a esa sección."
      : mensajeParam === "perfil_no_encontrado"
        ? "Tu perfil de usuario no fue encontrado. Contacta al administrador."
        : "";

  useEffect(() => {
    loadCatalog(isOnline).then((cached) => {
      if (cached.atributos) setAtributosPool(cached.atributos as AtributoConValores[]);
      if (cached.catalogo) {
        setCatalogo((prev) => prev ?? (cached.catalogo as Catalogo));
      }
      if (cached.marcas) {
        setMarcas(cached.marcas as { id: string; nombre: string; codigo: string }[]);
      }
      if (cached.sucursales && sucursalId) {
        const sucs = cached.sucursales as { id: string; nombre: string; codigo: string }[];
        const found = sucs.find((s) => s.id === sucursalId);
        if (found) setSucursalNombre(found.nombre);
      }
      if (cached.entidades) {
        const entidades = cached.entidades as EntidadEmisora[];
        const found =
          entidades.find((e) => e.id === profile?.entidad_emisora_id) ??
          emparejarEntidad(entidades, profile?.marca_id, sucursalId);
        if (found) setEntidad(found);
      }
    }).catch(() => {});
  }, [isOnline, sucursalId, profile?.entidad_emisora_id, profile?.marca_id]);

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
    let ignore = false;
    (async () => {
      try {
        let data = await fetchEntidadEmisora(profile?.entidad_emisora_id);
        if (!data && profile?.marca_id && sucursalId) {
          data = await fetchEntidadPorMarcaSucursal(
            profile.marca_id,
            sucursalId,
          );
        }
        if (!ignore) setEntidad(data);
      } catch {
        if (!ignore) setEntidad(null);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [profile?.entidad_emisora_id, profile?.marca_id, sucursalId]);

  useEffect(() => {
    if (!isOnline) return;
    void refrescarCatalogo({ silencioso: true });
    supabase
      .from("marcas")
      .select("id, nombre, codigo")
      .then(({ data }: { data: unknown }) => {
        if (data) setMarcas(data as { id: string; nombre: string; codigo: string }[]);
      })
      .catch(() => {});
  }, [isOnline, refrescarCatalogo]);

  useEffect(() => {
    let ultimo = 0;
    function alVolver() {
      if (document.visibilityState !== "visible" || !isOnline) return;
      const ahora = Date.now();
      if (ahora - ultimo < 60_000) return;
      ultimo = ahora;
      void refrescarCatalogo({ silencioso: true });
    }
    window.addEventListener("focus", alVolver);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.removeEventListener("focus", alVolver);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [isOnline, refrescarCatalogo]);

  const restoreDraft = pedido.restoreDraft;
  useEffect(() => {
    restoreDraft();
  }, [restoreDraft]);

  useEffect(() => {
    getQueueCount().then(setQueueCount).catch(() => {});
    const interval = setInterval(() => {
      getQueueCount().then(setQueueCount).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleAgregarLinea() {
    await refrescarCatalogo({ silencioso: true });
    setEditandoLinea(null);
    setMostrandoLinea(true);
  }

  async function handleEditarLinea(linea: LineaPedidoDraft) {
    await refrescarCatalogo({ silencioso: true });
    setEditandoLinea(linea);
    setMostrandoLinea(true);
  }

  function handleSaveLinea(linea: LineaPedidoDraft) {
    if (editandoLinea) {
      pedido.eliminarLinea(editandoLinea.id);
    }
    pedido.agregarLinea({
      producto_nombre: linea.producto_nombre,
      cantidad: linea.cantidad,
      precio_unitario: linea.precio_unitario,
      precio_lista: linea.precio_lista ?? null,
      descuento_id: linea.descuento_id ?? null,
      descuento_nombre: linea.descuento_nombre ?? null,
      descuento_tipo: linea.descuento_tipo ?? null,
      descuento_valor: linea.descuento_valor ?? null,
      descuento_monto: linea.descuento_monto ?? null,
      atributos: linea.atributos,
      ruta: linea.ruta,
      categoria_id: linea.categoria_id ?? null,
      producto_id: linea.producto_id ?? null,
    });
    setMostrandoLinea(false);
    setEditandoLinea(null);
  }

  async function handlePagar() {
    if (!session?.user.id) {
      showError("Sesión expirada. Inicia sesión nuevamente.");
      router.push("/auth/login");
      return;
    }
    if (!entidad) {
      showError(
        "Tu usuario no tiene una razón social / sucursal asignada. Contacta al super administrador.",
      );
      return;
    }
    setPagarCargando(true);

    const requiereCorreccion = pedido.lineas.some(
      (l) =>
        (l.atributos["Corrección de Color"] || "").trim().toLowerCase() === "si",
    );

    const draft = {
      cliente_nombre: pedido.cliente.nombre,
      cliente_telefono: pedido.cliente.telefono,
      cliente_email: pedido.cliente.email,
      requiere_factura:
        facturacionHabilitada() && pedido.cliente.requiereFactura,
      cliente_rfc: facturacionHabilitada() ? pedido.cliente.rfc : "",
      cliente_razon_social: facturacionHabilitada()
        ? pedido.cliente.razonSocial
        : "",
      cliente_regimen_fiscal: facturacionHabilitada()
        ? pedido.cliente.regimenFiscal
        : "",
      cliente_uso_cfdi: facturacionHabilitada()
        ? pedido.cliente.usoCfdi
        : "",
      cliente_cp_fiscal: facturacionHabilitada()
        ? pedido.cliente.cpFiscal
        : "",
      fecha_entrega: pedido.cliente.fechaEntrega,
      hora_entrega: pedido.cliente.horaEntrega,
      requiere_correccion: requiereCorreccion,
      lineas: pedido.lineas,
      subtotal: pedido.subtotal,
      anticipo: pedido.anticipo,
      total: pedido.total,
      metodo_pago: pedido.metodoPago,
      sucursal_id: sucursalId,
      marca_id: pedido.marcaId,
      entidad_emisora_id: entidad.id,
    };

    if (!isOnline) {
      try {
        const queueId = await queueOrder(
          draft as unknown as Parameters<typeof queueOrder>[0],
        );

        const ahora = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const fechaRecepcion = `${ahora.getFullYear()}-${pad(
          ahora.getMonth() + 1,
        )}-${pad(ahora.getDate())}`;
        const horaRecepcion = `${pad(ahora.getHours())}:${pad(
          ahora.getMinutes(),
        )}`;
        const sufijo = queueId.split("_").pop()?.toUpperCase() ?? "LOCAL";

        const offlinePedido: TicketPedido = {
          id: queueId,
          numero_pedido: `OFF-${fechaRecepcion.replace(/-/g, "")}-${sufijo}`,
          cliente_nombre: draft.cliente_nombre,
          cliente_telefono: draft.cliente_telefono || null,
          fecha_recepcion: fechaRecepcion,
          hora_recepcion: horaRecepcion,
          fecha_entrega: draft.fecha_entrega,
          hora_entrega: draft.hora_entrega,
          subtotal: draft.subtotal,
          anticipo: draft.anticipo,
          total: draft.total,
          metodo_pago: draft.metodo_pago,
          detalle_pedidos: draft.lineas.map((linea, index) => ({
            id: `${queueId}-${index}`,
            producto_nombre: linea.producto_nombre,
            cantidad: linea.cantidad,
            importe_linea: linea.cantidad * linea.precio_unitario,
            atributos: linea.atributos,
          })),
        };

        setTicketOffline({ pedido: offlinePedido, emisor: entidad });
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
      const result = await crearPedidoAgrupado(draft, session.user.id);
      enviarPushArea({
        title: "Nuevo pedido",
        body: `${pedido.cliente.nombre} · ${result.facturaNumero}`,
        area: "mostrador",
        tag: "nuevo-pedido",
      });
      pedido.limpiar();
      router.push(`/mostrador/ticket/${result.facturaNumero}`);
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

  if (ticketOffline) {
    return (
      <OfflineTicket
        pedido={ticketOffline.pedido}
        emisor={ticketOffline.emisor}
        onClose={() => setTicketOffline(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size={32} className="shrink-0" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{NOMBRE_EMPRESA}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sistema de Punto de Venta</p>
          </div>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refrescarCatalogo()}
            disabled={refrescandoCatalogo}
          >
            <i
              className={`fas ${
                refrescandoCatalogo ? "fa-spinner fa-spin" : "fa-sync-alt"
              } mr-1.5`}
            />
            <span className="hidden sm:inline">
              {refrescandoCatalogo ? "Actualizando..." : "Actualizar catálogo"}
            </span>
          </Button>
          <OfflineIndicator />
          <ThemeToggle />
          <RoleSwitcher />
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
                type="button"
                onClick={() => setMensajeDescartado(true)}
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
          email={pedido.cliente.email}
          fechaEntrega={pedido.cliente.fechaEntrega}
          horaEntrega={pedido.cliente.horaEntrega}
          requiereFactura={pedido.cliente.requiereFactura}
          rfc={pedido.cliente.rfc}
          razonSocial={pedido.cliente.razonSocial}
          regimenFiscal={pedido.cliente.regimenFiscal}
          usoCfdi={pedido.cliente.usoCfdi}
          cpFiscal={pedido.cliente.cpFiscal}
          onNombreChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, nombre: v })
          }
          onTelefonoChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, telefono: v })
          }
          onEmailChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, email: v })
          }
          onFechaEntregaChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, fechaEntrega: v })
          }
          onHoraEntregaChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, horaEntrega: v })
          }
          onRequiereFacturaChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, requiereFactura: v })
          }
          onRfcChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, rfc: v })
          }
          onRazonSocialChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, razonSocial: v })
          }
          onRegimenFiscalChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, regimenFiscal: v })
          }
          onUsoCfdiChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, usoCfdi: v })
          }
          onCpFiscalChange={(v) =>
            pedido.setCliente({ ...pedido.cliente, cpFiscal: v })
          }
        />

        <div className="bg-white rounded-xl shadow p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Razón social / Sucursal
              </label>
              <input
                type="text"
                value={
                  entidad?.nombre_comercial || sucursalNombre || "No asignada"
                }
                readOnly
                className="w-full border border-gray-200 bg-gray-50 text-gray-700 rounded-lg px-2.5 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Marca
              </label>
              <input
                type="text"
                value={
                  marcas.find((m) => m.id === entidad?.marca_id)?.nombre ||
                  "No asignada"
                }
                readOnly
                className="w-full border border-gray-200 bg-gray-50 text-gray-700 rounded-lg px-2.5 py-1.5 text-sm"
              />
            </div>
          </div>
          {!entidad && (
            <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg px-3 py-2">
              Tu usuario no tiene una razón social / sucursal asignada. No
              podrás emitir tickets hasta que el super administrador la asigne.
            </div>
          )}
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
              onClick={async () => setConfirmando(true)}
              cargando={pagarCargando}
              valido={pedido.valido}
            />
            {!pedido.valido && pedido.pendientes.length > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p className="font-medium mb-1">Para habilitar el pago falta:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {pedido.pendientes.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
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

      <ModalLineaPedido
        open={mostrandoLinea}
        atributosPool={atributosPool}
        onSave={handleSaveLinea}
        onCancel={() => {
          setMostrandoLinea(false);
          setEditandoLinea(null);
        }}
        editData={editandoLinea ?? undefined}
        rutaDefault={pedido.rutaDefault}
        catalogo={catalogo ?? undefined}
        onRefrescarCatalogo={() => void refrescarCatalogo()}
      />

      <ModalConfirmarPedido
        open={confirmando}
        clienteNombre={pedido.cliente.nombre}
        telefono={pedido.cliente.telefono}
        requiereFactura={pedido.cliente.requiereFactura}
        rfc={pedido.cliente.rfc}
        razonSocial={pedido.cliente.razonSocial}
        fechaEntrega={pedido.cliente.fechaEntrega}
        horaEntrega={pedido.cliente.horaEntrega}
        lineas={pedido.lineas}
        subtotal={pedido.subtotal}
        anticipo={pedido.anticipo}
        total={pedido.total}
        metodoPago={pedido.metodoPago}
        cargando={pagarCargando}
        onConfirm={() => {
          handlePagar().finally(() => setConfirmando(false));
        }}
        onCancel={() => setConfirmando(false)}
      />
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
