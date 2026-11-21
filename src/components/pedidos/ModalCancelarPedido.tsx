"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  MOTIVOS_CANCELACION_PEDIDO,
  montoPagadoPedido,
  puedeCancelarPedido,
  puedeIntentarCancelar,
  type MotivoCancelacionPedido,
  type PerfilCancelacion,
} from "@/lib/utils/cancelacion";
import type { Pedido } from "@/lib/supabase/types";

interface AutorizadorOpcion {
  id: string;
  nombre: string | null;
  email: string;
  rol: string;
}

interface ModalCancelarPedidoProps {
  pedido: Pedido | null;
  perfil: PerfilCancelacion;
  enLinea?: boolean;
  onClose: () => void;
  onConfirm: (opciones: {
    motivo: MotivoCancelacionPedido;
    notas: string;
    autorizacion?: { adminId: string; password: string };
  }) => Promise<void>;
}

const formatoMoneda = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function ModalCancelarPedido({
  pedido,
  perfil,
  enLinea = true,
  onClose,
  onConfirm,
}: ModalCancelarPedidoProps) {
  if (!pedido) return null;

  return (
    <ModalCancelarPedidoContent
      key={pedido.id}
      pedido={pedido}
      perfil={perfil}
      enLinea={enLinea}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function ModalCancelarPedidoContent({
  pedido,
  perfil,
  enLinea = true,
  onClose,
  onConfirm,
}: ModalCancelarPedidoProps & { pedido: Pedido }) {
  const [motivo, setMotivo] = useState<MotivoCancelacionPedido>("cliente_cancela");
  const [notas, setNotas] = useState("");
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [autorizadores, setAutorizadores] = useState<AutorizadorOpcion[]>([]);
  const [cargandoAutorizadores, setCargandoAutorizadores] = useState(true);
  const [errorAutorizadores, setErrorAutorizadores] = useState<string | null>(
    null,
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviando) onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [enviando, onClose]);

  const validacion = puedeCancelarPedido(pedido, perfil);
  const requiereAutorizacion = validacion.requiereAutorizacion === true;
  const permiso = puedeIntentarCancelar(validacion);
  const puedeCompletar = permiso && enLinea;
  const pagado = montoPagadoPedido(pedido);
  const numero = pedido.numero_pedido || pedido.id;
  const sinAutorizadores =
    requiereAutorizacion &&
    !cargandoAutorizadores &&
    !errorAutorizadores &&
    autorizadores.length === 0;
  const bloqueadoPorAutorizadores =
    requiereAutorizacion &&
    (cargandoAutorizadores || Boolean(errorAutorizadores) || sinAutorizadores);

  useEffect(() => {
    if (!requiereAutorizacion || !enLinea) return;

    let activo = true;

    fetch("/api/pedidos/cancelar/autorizadores", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as
          | { autorizadores?: AutorizadorOpcion[]; error?: string }
          | null;

        if (!res.ok) {
          throw new Error(
            data?.error || "No se pudieron cargar los administradores.",
          );
        }

        return data?.autorizadores ?? [];
      })
      .then((lista) => {
        if (!activo) return;
        setAutorizadores(lista);
        setErrorAutorizadores(null);
      })
      .catch((err) => {
        if (!activo) return;
        setErrorAutorizadores(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los administradores.",
        );
      })
      .finally(() => {
        if (activo) setCargandoAutorizadores(false);
      });

    return () => {
      activo = false;
    };
  }, [requiereAutorizacion, enLinea]);

  async function handleConfirm() {
    setError(null);

    if (!enLinea) {
      setError(
        "Sin conexión. Para cancelar una venta se requiere internet y autorización de un administrador o superadmin.",
      );
      return;
    }

    if (requiereAutorizacion) {
      if (cargandoAutorizadores) {
        setError("Cargando administradores. Espera un momento.");
        return;
      }

      if (errorAutorizadores) {
        setError(errorAutorizadores);
        return;
      }

      if (autorizadores.length === 0) {
        setError("No hay administradores disponibles para autorizar.");
        return;
      }

      if (!adminId) {
        setError("Selecciona al administrador que autoriza.");
        return;
      }
    }

    if (requiereAutorizacion && !adminPassword) {
      setError("El administrador debe escribir su contraseña.");
      return;
    }

    setEnviando(true);
    try {
      await onConfirm({
        motivo,
        notas,
        autorizacion: requiereAutorizacion
          ? { adminId, password: adminPassword }
          : undefined,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cancelar la venta.",
      );
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={() => {
          if (!enviando) onClose();
        }}
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            <i className="fas fa-times-circle text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Cancelar venta
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Se cancelará la venta completa <span className="font-mono">{numero}</span> de{" "}
              <span className="font-medium">{pedido.cliente_nombre}</span>.
            </p>
          </div>
        </div>

        {!permiso && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg px-3 py-2">
            <i className="fas fa-ban mr-1.5" />
            {validacion.razon}
          </div>
        )}

        {permiso && !enLinea && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg px-3 py-2">
            <i className="fas fa-wifi mr-1.5" />
            Sin conexión. Para cancelar una venta se requiere internet y
            autorización de un administrador o superadmin.
          </div>
        )}

        {puedeCompletar && pagado > 0 && (
          <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm rounded-lg px-3 py-2">
            <i className="fas fa-hand-holding-dollar mr-1.5" />
            Monto pagado: <strong>{formatoMoneda.format(pagado)}</strong>. Quedará
            como reembolso pendiente para admin/superadmin.
          </div>
        )}

        {requiereAutorizacion && enLinea && (
          <form
            autoComplete="off"
            onSubmit={(e) => e.preventDefault()}
            className="mt-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 space-y-3"
          >
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <i className="fas fa-user-shield mr-1.5" />
              Esta venta requiere autorización de un administrador o superadmin.
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Selecciona quién autoriza y pide que escriba su contraseña
              personalmente.
            </p>
            <div>
              <label
                htmlFor="admin-autorizador-cancelacion"
                className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
              >
                Administrador que autoriza
              </label>
              <select
                id="admin-autorizador-cancelacion"
                value={adminId}
                onChange={(e) => {
                  setAdminId(e.target.value);
                  setError(null);
                }}
                disabled={
                  enviando ||
                  cargandoAutorizadores ||
                  Boolean(errorAutorizadores) ||
                  autorizadores.length === 0
                }
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                <option value="">
                  {cargandoAutorizadores
                    ? "Cargando administradores…"
                    : "Selecciona un administrador"}
                </option>
                {autorizadores.map((autorizador) => (
                  <option key={autorizador.id} value={autorizador.id}>
                    {autorizador.nombre ? `${autorizador.nombre} — ` : ""}
                    {autorizador.email} ({autorizador.rol})
                  </option>
                ))}
              </select>
              {errorAutorizadores && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errorAutorizadores}
                </p>
              )}
              {sinAutorizadores && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  No hay administradores disponibles para autorizar.
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="admin-password-cancelacion"
                className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
              >
                Contraseña del administrador
              </label>
              <input
                id="admin-password-cancelacion"
                type="password"
                autoComplete="new-password"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setError(null);
                }}
                disabled={enviando}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                placeholder="Contraseña"
              />
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                Solo para uso del administrador.
              </p>
            </div>
          </form>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="motivo-cancelacion"
              className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
            >
              Motivo de cancelación
            </label>
            <select
              id="motivo-cancelacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoCancelacionPedido)}
              disabled={!puedeCompletar || enviando}
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            >
              {MOTIVOS_CANCELACION_PEDIDO.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="notas-cancelacion"
              className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
            >
              Notas (opcional)
            </label>
            <textarea
              id="notas-cancelacion"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={!puedeCompletar || enviando}
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              placeholder="Detalles adicionales de la cancelación"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={enviando}
          >
            No cancelar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            disabled={!puedeCompletar || bloqueadoPorAutorizadores || enviando}
          >
            {enviando ? "Cancelando..." : "Sí, cancelar venta"}
          </Button>
        </div>
      </div>
    </div>
  );
}
