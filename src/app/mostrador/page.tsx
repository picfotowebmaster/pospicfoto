"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePedidoActual } from "@/lib/hooks/usePedidoActual";
import { FormCliente } from "./_components/FormCliente";
import { LineaPedido } from "./_components/LineaPedido";
import { TablaLineas } from "./_components/TablaLineas";
import { ResumenPago } from "./_components/ResumenPago";
import { BotonPagar } from "./_components/BotonPagar";
import { Button } from "@/components/ui/Button";
import { crearPedido } from "@/lib/services/pedidos";
import { RUTAS_PRODUCCION } from "@/lib/utils/constantes";
// import { fetchAtributosConValores } from "@/lib/services/atributos";
// import type { Atributo, AtributoValor } from "@/lib/supabase/types";
import type { LineaPedidoDraft } from "@/lib/supabase/types";
// type AtributoConValores = Atributo & { valores: AtributoValor[] };

export default function MostradorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, signOut } = useAuth();
  const pedido = usePedidoActual();
  // const [atributosPool, setAtributosPool] = useState<AtributoConValores[]>([]);
  const [mostrandoLinea, setMostrandoLinea] = useState(false);
  const [editandoLinea, setEditandoLinea] = useState<LineaPedidoDraft | null>(null);
  const [pagarCargando, setPagarCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");

  useEffect(() => {
    // Mostrar mensaje de error si viene en query params
    const mensaje = searchParams.get("mensaje");
    if (mensaje === "acceso_denegado") {
      setMensajeError("No tienes permisos para acceder a esa sección.");
    } else if (mensaje === "perfil_no_encontrado") {
      setMensajeError("Tu perfil de usuario no fue encontrado. Contacta al administrador.");
    }
  }, [searchParams]);

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
      alert("Sesión expirada. Inicia sesión nuevamente.");
      router.push("/auth/login");
      return;
    }
    setPagarCargando(true);
    try {
      const pedidoId = await crearPedido(
        {
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
        },
        session.user.id,
      );
      pedido.limpiar();
      router.push(`/mostrador/ticket/${pedidoId}`);
    } catch (err) {
      console.error("Error al crear pedido:", err);
      alert("Error al crear el pedido. Intenta de nuevo.");
    } finally {
      setPagarCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">PIC PHOTO</h1>
          <p className="text-xs text-gray-500">Sistema de Punto de Venta</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {session?.user.email}
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Salir
          </Button>
        </div>
      </header>

      {mensajeError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-700">{mensajeError}</p>
              <button
                onClick={() => setMensajeError("")}
                className="text-red-500 hover:text-red-700 font-semibold"
              >
                ✕
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
          </div>
        </div>
      </div>
    </div>
  );
}
