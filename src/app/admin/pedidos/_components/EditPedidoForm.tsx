"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TablaLineas } from "@/app/mostrador/_components/TablaLineas";
import { LineaPedido } from "@/app/mostrador/_components/LineaPedido";
import { RUTAS_PRODUCCION, METODOS_PAGO } from "@/lib/utils/constantes";
import { generarIdLocal } from "@/lib/utils/calculos";
import type {
  Pedido,
  LineaPedidoDraft,
  Atributo,
  AtributoValor,
  MetodoPago,
  RutaProduccion,
} from "@/lib/supabase/types";

type AtributoConValores = Atributo & { valores: AtributoValor[] };

interface EditPedidoFormProps {
  pedido: Pedido;
  atributosPool: AtributoConValores[];
  onSave: (data: {
    cliente_nombre: string;
    cliente_telefono: string;
    fecha_entrega: string;
    hora_entrega: string;
    requiere_correccion: boolean;
    subtotal: number;
    anticipo: number;
    total: number;
    metodo_pago: MetodoPago;
    ruta: RutaProduccion;
    lineas: LineaPedidoDraft[];
  }) => Promise<void>;
  onCancel: () => void;
}

function detalleALinea(d: Pedido["detalle_pedidos"]): LineaPedidoDraft[] {
  return (d ?? []).map((item) => ({
    id: item.id,
    producto_nombre: item.producto_nombre,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    atributos: item.atributos,
  }));
}

export function EditPedidoForm({
  pedido,
  atributosPool,
  onSave,
  onCancel,
}: EditPedidoFormProps) {
  const [nombre, setNombre] = useState(pedido.cliente_nombre);
  const [telefono, setTelefono] = useState(pedido.cliente_telefono || "");
  const [fechaEntrega, setFechaEntrega] = useState(pedido.fecha_entrega);
  const [horaEntrega, setHoraEntrega] = useState(pedido.hora_entrega);
  const [requiereCorreccion, setRequiereCorreccion] = useState(pedido.requiere_correccion);
  const [ruta, setRuta] = useState<RutaProduccion>((pedido.ruta as RutaProduccion) || "R1");
  const [subtotal, setSubtotal] = useState(pedido.subtotal);
  const [anticipo, setAnticipo] = useState(pedido.anticipo);
  const [total, setTotal] = useState(pedido.total);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(pedido.metodo_pago);
  const [lineas, setLineas] = useState<LineaPedidoDraft[]>(detalleALinea(pedido.detalle_pedidos));
  const [mostrandoFormLinea, setMostrandoFormLinea] = useState(false);
  const [editandoLinea, setEditandoLinea] = useState<LineaPedidoDraft | null>(null);
  const [guardando, setGuardando] = useState(false);

  function handleAgregarLinea() {
    setEditandoLinea(null);
    setMostrandoFormLinea(true);
  }

  function handleEditarLinea(linea: LineaPedidoDraft) {
    setEditandoLinea(linea);
    setMostrandoFormLinea(true);
  }

  function handleEliminarLinea(id: string) {
    setLineas((prev) => prev.filter((l) => l.id !== id));
  }

  function handleSaveLinea(linea: LineaPedidoDraft) {
    if (editandoLinea) {
      setLineas((prev) => prev.map((l) => (l.id === editandoLinea.id ? linea : l)));
    } else {
      setLineas((prev) => [...prev, { ...linea, id: linea.id || generarIdLocal() }]);
    }
    setMostrandoFormLinea(false);
    setEditandoLinea(null);
  }

  async function handleGuardar() {
    setGuardando(true);
    try {
      await onSave({
        cliente_nombre: nombre,
        cliente_telefono: telefono,
        fecha_entrega: fechaEntrega,
        hora_entrega: horaEntrega,
        requiere_correccion: requiereCorreccion,
        subtotal,
        anticipo,
        total,
        metodo_pago: metodoPago,
        ruta,
        lineas,
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="px-6 py-3 space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Datos del Cliente
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Teléfono
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Fecha de Entrega *
            </label>
            <input
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Hora de Entrega *
            </label>
            <input
              type="time"
              value={horaEntrega}
              onChange={(e) => setHoraEntrega(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={requiereCorreccion}
            onChange={(e) => setRequiereCorreccion(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Requiere Corrección de Color</span>
        </label>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Ruta y Pago
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Ruta
            </label>
            <select
              value={ruta}
              onChange={(e) => setRuta(e.target.value as RutaProduccion)}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {RUTAS_PRODUCCION.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Método de Pago
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {METODOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Subtotal ($)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={subtotal || ""}
              onChange={(e) => setSubtotal(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Anticipo ($)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={anticipo || ""}
              onChange={(e) => setAnticipo(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Total ($)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={total || ""}
              onChange={(e) => setTotal(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Productos ({lineas.length})
          </h4>
          <Button
            size="sm"
            onClick={handleAgregarLinea}
            disabled={mostrandoFormLinea}
          >
            + Agregar
          </Button>
        </div>

        <TablaLineas
          lineas={lineas}
          onEditar={handleEditarLinea}
          onEliminar={handleEliminarLinea}
        />

        {mostrandoFormLinea && (
          <div className="mt-3">
            <LineaPedido
              id={editandoLinea?.id || ""}
              atributosPool={atributosPool}
              onSave={handleSaveLinea}
              onCancel={() => {
                setMostrandoFormLinea(false);
                setEditandoLinea(null);
              }}
              editData={editandoLinea || undefined}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleGuardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </div>
  );
}
