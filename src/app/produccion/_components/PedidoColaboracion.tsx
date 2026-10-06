"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  fetchComentarios,
  crearComentario,
  eliminarComentario,
  subirFotoPedido,
} from "@/lib/services/comentarios";
import type { Pedido, PedidoComentario, PrioridadPedido, TipoComentario } from "@/lib/supabase/types";

interface PedidoColaboracionProps {
  pedido: Pedido;
  usuarioId?: string | null;
  onCambiarPrioridad?: (pedidoId: string, prioridad: PrioridadPedido) => Promise<void>;
  onAsignar?: (pedidoId: string, usuarioId: string | null) => Promise<void>;
  onGuardarNotas?: (pedidoId: string, notas: string | null) => Promise<void>;
  onMarcarCorreccion?: (pedidoId: string, requiere: boolean, motivo: string | null) => Promise<void>;
}

export function PedidoColaboracion({
  pedido,
  usuarioId,
  onCambiarPrioridad,
  onAsignar,
  onGuardarNotas,
  onMarcarCorreccion,
}: PedidoColaboracionProps) {
  const [notas, setNotas] = useState(pedido.notas ?? "");
  const [motivo, setMotivo] = useState(pedido.motivo_correccion ?? "");
  const [comentarios, setComentarios] = useState<PedidoComentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [tipo, setTipo] = useState<TipoComentario>("comentario");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [confirmEntregaCorreccion, setConfirmEntregaCorreccion] = useState(false);

  const pedidoId = pedido.id;
  const esUrgente = pedido.prioridad === "urgente";
  const asignadoAMi = !!usuarioId && pedido.asignado_a === usuarioId;
  const asignado = !!pedido.asignado_a;

  useEffect(() => {
    let ignore = false;
    fetchComentarios(pedidoId)
      .then((data) => {
        if (!ignore) setComentarios(data);
      })
      .catch(() => {
        if (!ignore) setComentarios([]);
      });
    return () => {
      ignore = true;
    };
  }, [pedidoId]);

  async function ejecutar(accion: string, fn: () => Promise<void>) {
    setOcupado(accion);
    try {
      await fn();
    } catch (err) {
      console.error("Error en acción de colaboración:", err);
    } finally {
      setOcupado(null);
    }
  }

  async function enviarComentario() {
    const texto = nuevoComentario.trim();
    if (!texto || !usuarioId) return;
    await ejecutar("comentario", async () => {
      let fotoUrl: string | null = null;
      if (archivo) {
        fotoUrl = await subirFotoPedido(archivo, pedidoId);
      }
      const nuevo = await crearComentario({
        pedidoId,
        autorId: usuarioId,
        texto,
        tipo,
        fotoUrl,
      });
      setComentarios((prev) => [...prev, nuevo]);
      setNuevoComentario("");
      setArchivo(null);
    });
  }

  async function borrarComentario(id: string) {
    await ejecutar(id, async () => {
      await eliminarComentario(id);
      setComentarios((prev) => prev.filter((c) => c.id !== id));
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {onCambiarPrioridad && (
          <button
            type="button"
            disabled={ocupado === "prioridad"}
            onClick={() =>
              ejecutar("prioridad", () => onCambiarPrioridad(pedidoId, esUrgente ? "normal" : "urgente"))
            }
            className={`text-xs font-medium rounded-lg px-3 py-1.5 border transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 ${
              esUrgente
                ? "bg-red-600 text-white border-red-600"
                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-red-400"
            }`}
          >
            <i className="fas fa-flag" />
            {esUrgente ? "Prioritario" : "Marcar prioritario"}
          </button>
        )}
        {onAsignar && usuarioId && (
          <button
            type="button"
            disabled={ocupado === "asignar"}
            onClick={() => ejecutar("asignar", () => onAsignar(pedidoId, asignadoAMi ? null : usuarioId))}
            className={`text-xs font-medium rounded-lg px-3 py-1.5 border transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 ${
              asignadoAMi
                ? "bg-purple-600 text-white border-purple-600"
                : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-purple-400"
            }`}
          >
            <i className={`fas ${asignadoAMi ? "fa-user-minus" : "fa-user-plus"}`} />
            {asignadoAMi ? "Asignado a mí" : "Asignarme"}
          </button>
        )}
        {asignado && !asignadoAMi && (
          <span className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
            <i className="fas fa-user" />
            Asignado a otro operador
          </span>
        )}
      </div>

      {onMarcarCorreccion && (
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <i className="fas fa-triangle-exclamation text-gray-400" />
            Corrección
          </h3>
          {pedido.requiere_correccion ? (
            <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3 space-y-2">
              <p className="text-xs text-orange-800 dark:text-orange-300">
                Este pedido requiere corrección.
              </p>
              {pedido.motivo_correccion && (
                <p className="text-xs text-gray-700 dark:text-gray-200">
                  <span className="font-semibold">Motivo:</span> {pedido.motivo_correccion}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={ocupado === "correccion"}
                onClick={() => setConfirmEntregaCorreccion(true)}
              >
                Quitar corrección
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                placeholder="Describe el motivo de la corrección..."
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={!motivo.trim() || ocupado === "correccion"}
                onClick={() =>
                  ejecutar("correccion", async () => {
                    await onMarcarCorreccion(pedidoId, true, motivo);
                  })
                }
              >
                <i className="fas fa-flag mr-1" />
                Marcar requiere corrección
              </Button>
            </div>
          )}
        </div>
      )}

      {onGuardarNotas && (
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <i className="fas fa-note-sticky text-gray-400" />
            Notas
          </h3>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Notas internas del pedido..."
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={ocupado === "notas"}
              onClick={() => ejecutar("notas", () => onGuardarNotas(pedidoId, notas))}
            >
              <i className="fas fa-save mr-1" />
              Guardar notas
            </Button>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <i className="fas fa-comments text-gray-400" />
          Comentarios ({comentarios.length})
        </h3>
        <div className="space-y-2 max-h-56 overflow-y-auto mb-3">
          {comentarios.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">Sin comentarios.</p>
          ) : (
            comentarios.map((c) => (
              <div
                key={c.id}
                className={`rounded-lg p-2.5 border text-xs ${
                  c.tipo === "incidencia"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`font-semibold ${c.tipo === "incidencia" ? "text-red-700 dark:text-red-300" : "text-gray-600 dark:text-gray-300"}`}>
                    {c.tipo === "incidencia" ? "Incidencia" : "Comentario"}
                    {c.autor_id === usuarioId ? " · Tú" : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {new Date(c.created_at).toLocaleString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {c.autor_id === usuarioId && (
                      <button
                        type="button"
                        onClick={() => borrarComentario(c.id)}
                        disabled={ocupado === c.id}
                        className="text-gray-400 hover:text-red-500 cursor-pointer disabled:opacity-50"
                        aria-label="Eliminar comentario"
                      >
                        <i className="fas fa-times" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{c.texto}</p>
                {c.foto_url && (
                  <a href={c.foto_url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.foto_url}
                      alt="Adjunto de la incidencia"
                      className="rounded-lg max-h-36 border border-gray-200 dark:border-gray-700"
                    />
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        {usuarioId && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoComentario)}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="comentario">Comentario</option>
                <option value="incidencia">Incidencia</option>
              </select>
              <input
                type="text"
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviarComentario()}
                placeholder="Escribe un comentario..."
                className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1.5 cursor-pointer border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 hover:border-blue-400 transition-colors">
                <i className="fas fa-image" />
                {archivo ? "Cambiar foto" : "Adjuntar foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                />
              </label>
              {archivo && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400 inline-flex items-center gap-1 truncate">
                  <i className="fas fa-paperclip" />
                  {archivo.name}
                  <button
                    type="button"
                    onClick={() => setArchivo(null)}
                    className="text-gray-400 hover:text-red-500 cursor-pointer"
                    aria-label="Quitar foto adjunta"
                  >
                    <i className="fas fa-times" />
                  </button>
                </span>
              )}
            </div>
            <Button
              size="sm"
              disabled={!nuevoComentario.trim() || ocupado === "comentario"}
              onClick={enviarComentario}
            >
              <i className="fas fa-paper-plane mr-1" />
              Enviar
            </Button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmEntregaCorreccion}
        title="Quitar corrección"
        message="¿Confirmar que la corrección fue atendida y quitar la marca del pedido?"
        confirmLabel="Sí, quitar"
        cancelLabel="Cancelar"
        variant="warning"
        onConfirm={() => {
          setConfirmEntregaCorreccion(false);
          ejecutar("correccion", () => onMarcarCorreccion?.(pedidoId, false, null) ?? Promise.resolve());
        }}
        onCancel={() => setConfirmEntregaCorreccion(false)}
      />
    </div>
  );
}
