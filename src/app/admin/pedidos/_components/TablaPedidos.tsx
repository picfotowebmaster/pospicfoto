"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ESTADOS_PEDIDO, AREAS_PRODUCCION_DATA } from "@/lib/utils/constantes";
import { actualizarEstadoPedido, cancelarVenta, actualizarPedido } from "@/lib/services/pedidos";
import { useAuth } from "@/lib/hooks/useAuth";
import { ModalCancelarPedido } from "@/components/pedidos/ModalCancelarPedido";
import { puedeCancelarPedido, type MotivoCancelacionPedido } from "@/lib/utils/cancelacion";
import { crearComentario } from "@/lib/services/comentarios";
import { supabase } from "@/lib/supabase/client";
import { pedidoPagado } from "@/lib/utils/fiscal";
import {
  indexarVendedores,
  nombreVendedor,
  type Vendedor,
} from "@/lib/services/vendedores";
import { PedidoDetailModal } from "./PedidoDetailModal";
import type { Pedido, Atributo, AtributoValor, MetodoPago, RutaProduccion, LineaPedidoDraft } from "@/lib/supabase/types";

const COLOR_PAGO: Record<string, string> = {
  Efectivo: "bg-emerald-500",
  Tarjeta: "bg-blue-500",
  Transferencia: "bg-purple-500",
  Depósito: "bg-amber-500",
};

function formatearFecha(fecha: string): string {
  const d = new Date(fecha + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

interface TablaPedidosProps {
  pedidos: Pedido[];
  vendedores: Vendedor[];
  atributosPool: (Atributo & { valores: AtributoValor[] })[];
  onEstadoCambiado: () => void;
}

export function TablaPedidos({ pedidos, vendedores, atributosPool, onEstadoCambiado }: TablaPedidosProps) {
  const { showError, showSuccess } = useToast();
  const { profile } = useAuth();
  const nombresVendedores = useMemo(
    () => indexarVendedores(vendedores),
    [vendedores],
  );
  const [pedidoModalId, setPedidoModalId] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [facturando, setFacturando] = useState<string | null>(null);
  const [enviandoTicket, setEnviandoTicket] = useState<string | null>(null);
  const [pedidoCancelar, setPedidoCancelar] = useState<Pedido | null>(null);
  const [override, setOverride] = useState<{
    pedidoId: string;
    nuevoEstado: string;
    anterior: string;
  } | null>(null);
  const [motivoOverride, setMotivoOverride] = useState("");
  const [aplicandoOverride, setAplicandoOverride] = useState(false);
  const [ordenCampo, setOrdenCampo] = useState<"numero_pedido" | "cliente_nombre" | "fecha_entrega" | "total">("fecha_entrega");
  const [ordenDir, setOrdenDir] = useState<"asc" | "desc">("desc");

  function toggleOrden(campo: typeof ordenCampo) {
    if (ordenCampo === campo) {
      setOrdenDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setOrdenCampo(campo);
      setOrdenDir("asc");
    }
  }

  const indicador = (campo: typeof ordenCampo) =>
    ordenCampo === campo ? (
      <i className={`fas fa-sort-${ordenDir === "asc" ? "up" : "down"} text-[10px]`} />
    ) : (
      <i className="fas fa-sort text-[10px] opacity-30" />
    );

  const pedidosOrdenados = useMemo(() => {
    const lista = [...pedidos];
    lista.sort((a, b) => {
      let cmp = 0;
      if (ordenCampo === "total") cmp = a.total - b.total;
      else if (ordenCampo === "fecha_entrega")
        cmp = `${a.fecha_entrega}T${a.hora_entrega}`.localeCompare(`${b.fecha_entrega}T${b.hora_entrega}`);
      else if (ordenCampo === "numero_pedido")
        cmp = (a.numero_pedido || "").localeCompare(b.numero_pedido || "");
      else cmp = a.cliente_nombre.localeCompare(b.cliente_nombre);
      return ordenDir === "asc" ? cmp : -cmp;
    });
    return lista;
  }, [pedidos, ordenCampo, ordenDir]);

  const totales = useMemo(
    () =>
      pedidos.reduce(
        (acc, p) => ({
          total: acc.total + (p.total || 0),
          anticipo: acc.anticipo + (p.anticipo || 0),
        }),
        { total: 0, anticipo: 0 },
      ),
    [pedidos],
  );

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [aplicandoBulk, setAplicandoBulk] = useState(false);

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const todosSeleccionados =
    pedidosOrdenados.length > 0 && pedidosOrdenados.every((p) => seleccionados.has(p.id));

  function toggleTodos() {
    setSeleccionados((prev) => {
      if (todosSeleccionados) return new Set();
      const next = new Set(prev);
      pedidosOrdenados.forEach((p) => next.add(p.id));
      return next;
    });
  }

  async function aplicarBulkEntregar() {
    setAplicandoBulk(true);
    let ok = 0;
    let fail = 0;
    for (const id of seleccionados) {
      try {
        await actualizarEstadoPedido(id, "entregado");
        ok++;
      } catch {
        fail++;
      }
    }
    setAplicandoBulk(false);
    setConfirmBulk(false);
    setSeleccionados(new Set());
    if (ok > 0) showSuccess(`${ok} pedidos marcados como entregados`);
    if (fail > 0) showError(`${fail} pedidos no se pudieron actualizar`);
    onEstadoCambiado();
  }

  function solicitarCambioEstado(pedidoId: string, nuevoEstado: string, anterior: string) {
    setMotivoOverride("");
    setOverride({ pedidoId, nuevoEstado, anterior });
  }

  async function aplicarOverride() {
    if (!override) return;
    setAplicandoOverride(true);
    const { pedidoId, nuevoEstado, anterior } = override;
    try {
      await actualizarEstadoPedido(pedidoId, nuevoEstado);
      try {
        const { data } = await supabase.auth.getUser();
        const autor = data.user?.id;
        if (autor) {
          await crearComentario({
            pedidoId,
            autorId: autor,
            tipo: "incidencia",
            texto: `Cambio manual de estado: ${anterior} → ${nuevoEstado}.${motivoOverride.trim() ? ` Motivo: ${motivoOverride.trim()}` : ""}`,
          });
        }
      } catch {
        /* el registro del motivo es best-effort */
      }
      showSuccess("Estado actualizado");
      setOverride(null);
      onEstadoCambiado();
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      showError("Error al cambiar estado del pedido.");
    } finally {
      setAplicandoOverride(false);
    }
  }

  async function handleCancelar(pedidoId: string) {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (pedido) setPedidoCancelar(pedido);
  }

  async function confirmarCancelacion({
    motivo,
    notas,
  }: {
    motivo: MotivoCancelacionPedido;
    notas: string;
  }) {
    if (!pedidoCancelar) return;
    setCancelando(pedidoCancelar.id);
    try {
      await cancelarVenta(pedidoCancelar.id, { motivo, notas });
      showSuccess("Venta cancelada.");
      setPedidoCancelar(null);
      onEstadoCambiado();
    } catch (err) {
      const mensaje =
        err instanceof Error ? err.message : "Error al cancelar la venta.";
      showError(mensaje);
      throw err;
    } finally {
      setCancelando(null);
    }
  }

  async function handleFacturar(pedidoId: string) {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return;
    setFacturando(pedidoId);
    try {
      const res = await fetch("/api/facturacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pedido.numero_pedido || pedido.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || "Error al emitir la factura");
      } else if (data.emailEnviado) {
        showSuccess(`Factura emitida y enviada a ${pedido.cliente_email}`);
        onEstadoCambiado();
      } else if (pedido.cliente_email) {
        showSuccess("Factura emitida, pero no se pudo enviar el correo (revisa los logs).");
        onEstadoCambiado();
      } else {
        showSuccess("Factura emitida correctamente");
        onEstadoCambiado();
      }
    } catch {
      showError("Error de conexión al emitir la factura");
    } finally {
      setFacturando(null);
    }
  }

  async function handleEnviarTicket(pedidoId: string) {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return;
    if (!pedido.cliente_email) {
      showError("El pedido no tiene correo del cliente. Agrégalo en Editar.");
      return;
    }
    setEnviandoTicket(pedidoId);
    try {
      const res = await fetch("/api/ticket/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pedido.numero_pedido || pedido.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || "Error al enviar el ticket");
      } else {
        showSuccess(`Ticket enviado a ${pedido.cliente_email}`);
      }
    } catch {
      showError("Error de conexión al enviar el ticket");
    } finally {
      setEnviandoTicket(null);
    }
  }

  async function handleGuardarEdicion(
    pedidoId: string,
    data: {
      cliente_nombre: string;
      cliente_telefono: string;
      cliente_email: string;
      fecha_entrega: string;
      hora_entrega: string;
      requiere_correccion: boolean;
      subtotal: number;
      anticipo: number;
      total: number;
      metodo_pago: MetodoPago;
      ruta: RutaProduccion;
      lineas: LineaPedidoDraft[];
    },
  ) {
    await actualizarPedido(pedidoId, data);
    setEditando(null);
    onEstadoCambiado();
  }

  const pedidoModal = pedidos.find((p) => p.id === pedidoModalId) ?? null;
  const vendedorModal = pedidoModal
    ? nombreVendedor(pedidoModal.cajero_id, nombresVendedores)
    : "Sin vendedor";
  const cobradoPorModal =
    pedidoModal?.saldo_cobrado
      ? nombreVendedor(pedidoModal.saldo_cobrado_por, nombresVendedores)
      : null;

  return (
    <div className="overflow-x-auto">
      {seleccionados.size > 0 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
          <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
            {seleccionados.size} seleccionado(s)
          </span>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="success" onClick={() => setConfirmBulk(true)}>
              <i className="fas fa-check mr-1" />
              Marcar entregado
            </Button>
            <button
              type="button"
              onClick={() => setSeleccionados(new Set())}
              className="text-xs text-blue-700 dark:text-blue-300 underline cursor-pointer"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 px-2 w-8">
              <input
                type="checkbox"
                checked={todosSeleccionados}
                onChange={toggleTodos}
                className="cursor-pointer rounded"
                aria-label="Seleccionar todos"
              />
            </th>
            <th className="py-2 px-3 font-medium text-gray-500 w-[140px]">
              <button type="button" onClick={() => toggleOrden("numero_pedido")} className="inline-flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                Pedido {indicador("numero_pedido")}
              </button>
            </th>
            <th className="py-2 px-3 font-medium text-gray-500">
              <button type="button" onClick={() => toggleOrden("cliente_nombre")} className="inline-flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                Cliente {indicador("cliente_nombre")}
              </button>
            </th>
            <th className="py-2 px-3 font-medium text-gray-500 hidden md:table-cell">
              Teléfono
            </th>
            <th className="py-2 px-3 font-medium text-gray-500 hidden lg:table-cell">
              Vendedor
            </th>
            <th className="py-2 px-3 font-medium text-gray-500">
              <button type="button" onClick={() => toggleOrden("fecha_entrega")} className="inline-flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                Entrega {indicador("fecha_entrega")}
              </button>
            </th>
            <th className="py-2 px-3 font-medium text-gray-500">
              <button type="button" onClick={() => toggleOrden("total")} className="inline-flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                Total {indicador("total")}
              </button>
            </th>
            <th className="py-2 px-3 font-medium text-gray-500 hidden sm:table-cell">
              Anticipo
            </th>
            <th className="py-2 px-3 font-medium text-gray-500">Pago</th>
            <th className="py-2 px-3 font-medium text-gray-500">Área</th>
            <th className="py-2 px-3 font-medium text-gray-500">Estado</th>
            <th className="py-2 px-3 font-medium text-gray-500 text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {pedidosOrdenados.map((p) => (
            <PedidoFila
              key={p.id}
              pedido={p}
              vendedorNombre={nombreVendedor(p.cajero_id, nombresVendedores)}
              cambiando={aplicandoOverride && override?.pedidoId === p.id}
              cancelando={cancelando === p.id}
              facturando={facturando === p.id}
              onAbrirDetalle={() => {
                setPedidoModalId(p.id);
                setEditando(null);
              }}
              onEditar={() => {
                setPedidoModalId(p.id);
                setEditando(p.id);
              }}
              onCambiarEstado={(estado) => solicitarCambioEstado(p.id, estado, p.estado)}
              onCancelar={() => handleCancelar(p.id)}
              puedeCancelar={
                puedeCancelarPedido(p, {
                  rol: profile?.rol ?? null,
                  sucursal_id: profile?.sucursal_id ?? null,
                }).permitido
              }
              onFacturar={() => handleFacturar(p.id)}
              enviandoTicket={enviandoTicket === p.id}
              onEnviarTicket={() => handleEnviarTicket(p.id)}
              seleccionado={seleccionados.has(p.id)}
              onToggleSeleccion={() => toggleSeleccion(p.id)}
            />
          ))}
          {pedidos.length === 0 && (
            <tr>
              <td colSpan={12} className="py-8 text-center text-gray-400 dark:text-gray-500">
                No se encontraron pedidos.
              </td>
            </tr>
          )}
        </tbody>
        {pedidos.length > 0 && (
          <tfoot>
            <tr className="border-t border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200">
              <td className="py-2 px-3" colSpan={5}>
                Totales ({pedidos.length} en página)
              </td>
              <td className="py-2 px-3">${totales.total.toFixed(2)}</td>
              <td className="py-2 px-3 hidden sm:table-cell">${totales.anticipo.toFixed(2)}</td>
              <td colSpan={5} />
            </tr>
          </tfoot>
        )}
      </table>
      {override && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70"
            onClick={() => setOverride(null)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-5 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Cambiar estado del pedido
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {ESTADOS_PEDIDO.find((e) => e.value === override.anterior)?.label ?? override.anterior}
              {" → "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {ESTADOS_PEDIDO.find((e) => e.value === override.nuevoEstado)?.label ?? override.nuevoEstado}
              </span>
            </p>

            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-4 mb-1">
              Motivo del cambio (opcional)
            </label>
            <textarea
              value={motivoOverride}
              onChange={(e) => setMotivoOverride(e.target.value)}
              rows={3}
              placeholder="Explica el motivo del cambio manual de estado..."
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              El cambio quedará registrado en el historial del pedido.
            </p>

            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" size="sm" onClick={() => setOverride(null)} disabled={aplicandoOverride}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={aplicarOverride} disabled={aplicandoOverride}>
                {aplicandoOverride ? (
                  <i className="fas fa-spinner animate-spin" />
                ) : (
                  <i className="fas fa-check mr-1" />
                )}
                Aplicar cambio
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmBulk}
        title="Marcar como entregados"
        message={`¿Marcar ${seleccionados.size} pedido(s) como entregados? Se registrará el movimiento de salida.`}
        confirmLabel={aplicandoBulk ? "Procesando..." : "Sí, entregar"}
        cancelLabel="Cancelar"
        variant="primary"
        onConfirm={aplicarBulkEntregar}
        onCancel={() => setConfirmBulk(false)}
      />

      <ModalCancelarPedido
        pedido={pedidoCancelar}
        perfil={{
          rol: profile?.rol ?? null,
          sucursal_id: profile?.sucursal_id ?? null,
        }}
        onClose={() => setPedidoCancelar(null)}
        onConfirm={confirmarCancelacion}
      />
      <PedidoDetailModal
        pedido={pedidoModal}
        open={pedidoModal !== null}
        editando={editando === pedidoModalId}
        facturando={pedidoModalId !== null && facturando === pedidoModalId}
        vendedorNombre={vendedorModal}
        cobradoPorNombre={cobradoPorModal}
        atributosPool={atributosPool}
        onClose={() => {
          setPedidoModalId(null);
          setEditando(null);
        }}
        onIniciarEdicion={() => setEditando(pedidoModalId)}
        onCancelarEdicion={() => setEditando(null)}
        onFacturar={() => {
          if (pedidoModalId) handleFacturar(pedidoModalId);
        }}
        puedeGestionarReembolso={
          profile?.rol === "admin" || profile?.rol === "superadmin"
        }
        onReembolsado={onEstadoCambiado}
        onGuardarEdicion={(data) =>
          pedidoModal ? handleGuardarEdicion(pedidoModal.id, data) : Promise.resolve()
        }
      />
    </div>
  );
}

function PedidoFila({
  pedido,
  vendedorNombre,
  cambiando,
  cancelando,
  facturando,
  enviandoTicket,
  onAbrirDetalle,
  onEditar,
  onCambiarEstado,
  onCancelar,
  puedeCancelar,
  onFacturar,
  onEnviarTicket,
  seleccionado,
  onToggleSeleccion,
}: {
  pedido: Pedido;
  vendedorNombre: string;
  cambiando: boolean;
  cancelando: boolean;
  facturando: boolean;
  enviandoTicket: boolean;
  onAbrirDetalle: () => void;
  onEditar: () => void;
  onCambiarEstado: (estado: string) => void;
  onCancelar: () => void;
  puedeCancelar: boolean;
  onFacturar: () => void;
  onEnviarTicket: () => void;
  seleccionado: boolean;
  onToggleSeleccion: () => void;
}) {
  const pagado = pedidoPagado(pedido);
  const tieneRfc = Boolean(pedido.cliente_rfc?.trim());
  const enGlobal = Boolean(pedido.factura_global_id);

  return (
    <tr
      onClick={onAbrirDetalle}
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer"
    >
      <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={seleccionado}
          onChange={onToggleSeleccion}
          className="cursor-pointer rounded"
          aria-label={`Seleccionar ${pedido.numero_pedido || pedido.cliente_nombre}`}
        />
      </td>
      <td className="py-2 px-3 text-gray-900 dark:text-gray-100 font-mono text-xs font-medium">
        {pedido.numero_pedido || "\u2014"}
      </td>
      <td className="py-2 px-3 text-gray-900 dark:text-gray-100 font-medium">
        {pedido.cliente_nombre}
        {pedido.requiere_correccion && (
          <span className="ml-1.5 text-orange-500 text-xs" title="Requiere corrección">
            <i className="fas fa-circle text-[6px] align-middle" />
          </span>
        )}
      </td>
      <td className="py-2 px-3 text-gray-500 hidden md:table-cell dark:text-gray-400">
        {pedido.cliente_telefono || "\u2014"}
      </td>
      <td className="py-2 px-3 text-gray-600 hidden lg:table-cell dark:text-gray-400">
        {vendedorNombre}
      </td>
      <td className="py-2 px-3 text-gray-700 dark:text-gray-300 text-xs">
        <div>{formatearFecha(pedido.fecha_entrega)}</div>
        <div className="text-gray-400 dark:text-gray-500">{pedido.hora_entrega.slice(0, 5)}</div>
      </td>
      <td className="py-2 px-3 text-gray-900 dark:text-gray-100 font-medium">
        ${pedido.total.toFixed(2)}
      </td>
      <td className="py-2 px-3 text-gray-600 hidden sm:table-cell dark:text-gray-400">
        ${pedido.anticipo.toFixed(2)}
      </td>
      <td className="py-2 px-3">
        <Badge color={COLOR_PAGO[pedido.metodo_pago] || "bg-gray-500"}>
          {pedido.metodo_pago}
        </Badge>
      </td>
      <td className="py-2 px-3">
        <AreaBadge area={pedido.area_actual} />
      </td>
      <td className="py-2 px-3">
        <EstadoBadge estado={pedido.estado} />
      </td>
      <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-2">
          <a
            href={`/mostrador/ticket/${pedido.numero_pedido || pedido.id}`}
            className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
            title="Ver ticket"
          >
            Ticket
          </a>
          <button
            type="button"
            onClick={onEnviarTicket}
            disabled={enviandoTicket}
            className="text-xs rounded px-1.5 py-0.5 transition-colors cursor-pointer disabled:opacity-50 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            title="Enviar ticket por correo"
          >
            {enviandoTicket ? "..." : "Enviar Ticket"}
          </button>
          {pedido.estado !== "cancelado" && (
            <button
              type="button"
              onClick={onEditar}
              className="text-xs rounded px-1.5 py-0.5 transition-colors cursor-pointer text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
              title="Editar pedido"
            >
              Editar
            </button>
          )}
          {pedido.estado === "entregado" &&
            (pedido.factura_uuid ? (
              <>
                {pedido.factura_pdf_url && (
                  <a
                    href={pedido.factura_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="Descargar factura PDF"
                  >
                    PDF
                  </a>
                )}
                {pedido.factura_xml_url && (
                  <a
                    href={pedido.factura_xml_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="Ver XML"
                  >
                    XML
                  </a>
                )}
              </>
            ) : enGlobal ? (
              <span
                className="text-xs text-indigo-600 dark:text-indigo-400"
                title="Incluido en la factura global del periodo"
              >
                Global
              </span>
            ) : pagado && tieneRfc ? (
              <button
                type="button"
                onClick={onFacturar}
                disabled={facturando}
                className="text-xs rounded px-1.5 py-0.5 transition-colors cursor-pointer disabled:opacity-50 text-green-600 hover:text-green-800 hover:bg-green-50"
                title="Emitir factura"
              >
                {facturando ? "..." : "Facturar"}
              </button>
            ) : (
              <span
                className="text-xs text-gray-400 dark:text-gray-500 cursor-not-allowed"
                title={
                  pagado
                    ? "Sin RFC: se incluirá en la factura global"
                    : "Se factura al liquidar el saldo"
                }
              >
                {pagado ? "Sin RFC" : "Sin pago"}
              </span>
            ))}
          <select
            value={pedido.estado}
            disabled={cambiando}
            onChange={(e) => {
              if (e.target.value !== pedido.estado) {
                onCambiarEstado(e.target.value);
              }
            }}
            className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-600 cursor-pointer"
            title="Cambiar estado"
          >
            {ESTADOS_PEDIDO.filter((e) => e.value !== "cancelado").map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
          {puedeCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              disabled={cancelando}
              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded px-1.5 py-0.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Cancelar venta"
            >
              {cancelando ? "..." : "Cancelar"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const def = ESTADOS_PEDIDO.find((e) => e.value === estado);
  const color = def ? def.color.replace("bg-", "bg-").replace("-500", "-100") : "bg-gray-100";
  const textoColor = def
    ? def.color.replace("bg-", "text-").replace("-500", "-700")
    : "text-gray-700";
  const label = def?.label ?? estado;

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color} ${textoColor}`}>
      {label}
    </span>
  );
}

function AreaBadge({ area }: { area: string }) {
  const def = AREAS_PRODUCCION_DATA.find((a) => a.id === area);
  const color = def
    ? def.color.replace("-500", "-50").replace("bg-", "bg-")
    : "bg-gray-50";
  const textoColor = def
    ? def.color.replace("-500", "-700").replace("bg-", "text-")
    : "text-gray-700";
  const borderColor = def
    ? def.color.replace("-500", "-400").replace("bg-", "border-")
    : "border-gray-300";
  const label = def?.nombre ?? area;

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${color} ${textoColor} ${borderColor}`}>
      {label}
    </span>
  );
}
