"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { actualizarClienteAdmin } from "@/lib/services/clientesAdmin";
import { normalizarRfc } from "@/lib/utils/fiscal";
import type { Cliente } from "@/lib/supabase/types";

interface EditarClienteModalProps {
  cliente: Cliente | null;
  onClose: () => void;
  onGuardado: (cliente: Cliente) => void;
}

interface FormularioCliente {
  nombre: string;
  telefono: string;
  email: string;
  notas: string;
  rfc: string;
}

const FORMULARIO_VACIO: FormularioCliente = {
  nombre: "",
  telefono: "",
  email: "",
  notas: "",
  rfc: "",
};

export function EditarClienteModal({
  cliente,
  onClose,
  onGuardado,
}: EditarClienteModalProps) {
  const { showError, showSuccess } = useToast();
  const [formulario, setFormulario] = useState<FormularioCliente>(() =>
    cliente
      ? {
          nombre: cliente.nombre,
          telefono: cliente.telefono ?? "",
          email: cliente.email ?? "",
          notas: cliente.notas ?? "",
          rfc: cliente.rfc ?? "",
        }
      : FORMULARIO_VACIO,
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nombreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!cliente) return;
    nombreRef.current?.focus();
  }, [cliente]);

  useEffect(() => {
    if (!cliente) return;
    const manejarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onClose();
    };
    document.addEventListener("keydown", manejarTecla);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", manejarTecla);
      document.body.style.overflow = "";
    };
  }, [cliente, onClose]);

  if (!cliente) return null;

  function actualizarCampo(campo: keyof FormularioCliente, valor: string) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }));
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!cliente) return;

    if (formulario.nombre.trim() === "") {
      setError("El nombre del cliente es obligatorio.");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const actualizado = await actualizarClienteAdmin({
        id: cliente.id,
        nombre: formulario.nombre,
        telefono: formulario.telefono,
        email: formulario.email,
        notas: formulario.notas,
        rfc: formulario.rfc,
      });
      showSuccess("Cliente actualizado.");
      onGuardado(actualizado);
    } catch (err) {
      const mensaje =
        (err instanceof Error && err.message) ||
        ((err as Record<string, unknown>)?.message as string) ||
        "No se pudo actualizar el cliente.";
      setError(mensaje);
      showError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  const inputClass =
    "w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editar-cliente-titulo"
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-gray-200 dark:border-gray-700"
      >
        <form onSubmit={guardar}>
          <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3
                id="editar-cliente-titulo"
                className="text-lg font-bold text-gray-900 dark:text-gray-100"
              >
                Editar cliente
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Los cambios no modifican los tickets ya generados.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              aria-label="Cerrar"
            >
              <i className="fas fa-times" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            <div>
              <label
                htmlFor="editar-cliente-nombre"
                className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
              >
                Nombre *
              </label>
              <input
                id="editar-cliente-nombre"
                ref={nombreRef}
                type="text"
                value={formulario.nombre}
                onChange={(e) => actualizarCampo("nombre", e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="editar-cliente-telefono"
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                >
                  Teléfono
                </label>
                <input
                  id="editar-cliente-telefono"
                  type="tel"
                  value={formulario.telefono}
                  onChange={(e) => actualizarCampo("telefono", e.target.value)}
                  className={inputClass}
                  placeholder="55 1234 5678"
                />
              </div>
              <div>
                <label
                  htmlFor="editar-cliente-rfc"
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                >
                  RFC
                </label>
                <input
                  id="editar-cliente-rfc"
                  type="text"
                  value={formulario.rfc}
                  onChange={(e) =>
                    actualizarCampo("rfc", normalizarRfc(e.target.value))
                  }
                  className={`${inputClass} uppercase`}
                  maxLength={13}
                  placeholder="XAXX010101000"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="editar-cliente-email"
                className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
              >
                Correo
              </label>
              <input
                id="editar-cliente-email"
                type="email"
                value={formulario.email}
                onChange={(e) => actualizarCampo("email", e.target.value)}
                className={inputClass}
                placeholder="cliente@correo.com"
              />
            </div>

            <div>
              <label
                htmlFor="editar-cliente-notas"
                className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
              >
                Notas
              </label>
              <textarea
                id="editar-cliente-notas"
                value={formulario.notas}
                onChange={(e) => actualizarCampo("notas", e.target.value)}
                className={`${inputClass} min-h-[70px] resize-y`}
                placeholder="Preferencias, referencias, observaciones..."
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
