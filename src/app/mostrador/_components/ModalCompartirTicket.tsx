"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ModalCompartirTicketProps {
  pedidoId: string;
  numeroPedido?: string | null;
  clienteEmail?: string | null;
  onClose: () => void;
}

type Pestana = "link" | "email";

export function ModalCompartirTicket({
  pedidoId,
  numeroPedido,
  clienteEmail,
  onClose,
}: ModalCompartirTicketProps) {
  const { showError, showSuccess } = useToast();
  const [pestana, setPestana] = useState<Pestana>("link");
  const [enlace, setEnlace] = useState<string | null>(null);
  const [cargandoEnlace, setCargandoEnlace] = useState(false);
  const [email, setEmail] = useState(clienteEmail ?? "");
  const [incluirEnlace, setIncluirEnlace] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const generarEnlace = useCallback(async () => {
    setCargandoEnlace(true);
    setError("");
    try {
      const res = await fetch(
        `/api/ticket/${encodeURIComponent(pedidoId)}/enlace`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo generar el enlace");
      }
      setEnlace(data.url);
    } catch (err) {
      const detalle =
        err instanceof Error ? err.message : "Error al generar el enlace";
      setError(detalle);
      showError(detalle);
    } finally {
      setCargandoEnlace(false);
    }
  }, [pedidoId, showError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void generarEnlace();
    }, 0);
    return () => clearTimeout(timer);
  }, [generarEnlace]);

  async function copiarEnlace() {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      showSuccess("Link copiado al portapapeles");
    } catch {
      showError("No se pudo copiar el link");
    }
  }

  function compartirWhatsApp() {
    if (!enlace) return;
    const texto = encodeURIComponent(
      `Tu ticket${numeroPedido ? ` ${numeroPedido}` : ""}: ${enlace}`,
    );
    window.open(
      `https://wa.me/?text=${texto}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function compartirNativo() {
    if (!enlace) return;
    if (typeof navigator.share !== "function") {
      compartirWhatsApp();
      return;
    }
    try {
      await navigator.share({
        title: `Ticket ${numeroPedido ?? ""}`.trim(),
        text: "Consulta tu ticket",
        url: enlace,
      });
    } catch {
      // El usuario canceló el diálogo de compartir.
    }
  }

  async function enviarPorEmail() {
    if (!EMAIL_RE.test(email.trim())) {
      setError("Correo electrónico inválido");
      return;
    }

    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/ticket/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pedidoId,
          email: email.trim(),
          incluirEnlace,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo enviar el ticket");
      }
      showSuccess(`Ticket enviado a ${email.trim()}`);
      onClose();
    } catch (err) {
      const detalle =
        err instanceof Error ? err.message : "Error al enviar el ticket";
      setError(detalle);
      showError(detalle);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Compartir ticket
            </h2>
            {numeroPedido && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {numeroPedido}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            aria-label="Cerrar"
          >
            <i className="fas fa-times text-lg" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setPestana("link")}
              className={`flex-1 px-3 py-1.5 text-sm rounded-md font-medium transition-colors cursor-pointer ${
                pestana === "link"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <i className="fas fa-link mr-1" />
              Link
            </button>
            <button
              type="button"
              onClick={() => setPestana("email")}
              className={`flex-1 px-3 py-1.5 text-sm rounded-md font-medium transition-colors cursor-pointer ${
                pestana === "email"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <i className="fas fa-envelope mr-1" />
              Email
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {pestana === "link" ? (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Cualquier persona con este link podrá ver el ticket. Válido por
                30 días.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={
                    cargandoEnlace
                      ? "Generando link..."
                      : enlace ?? "Sin link"
                  }
                  className="flex-1 min-w-0 px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={generarEnlace}
                  disabled={cargandoEnlace}
                  title="Regenerar link"
                >
                  <i className="fas fa-rotate" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={copiarEnlace}
                  disabled={!enlace}
                >
                  <i className="fas fa-copy mr-1" />
                  Copiar
                </Button>
                <Button
                  size="sm"
                  variant="success"
                  onClick={compartirWhatsApp}
                  disabled={!enlace}
                >
                  <i className="fab fa-whatsapp mr-1" />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={compartirNativo}
                  disabled={!enlace}
                >
                  <i className="fas fa-share-nodes mr-1" />
                  Compartir
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Correo del cliente
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@correo.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={incluirEnlace}
                  onChange={(e) => setIncluirEnlace(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Incluir link al ticket en línea
              </label>
            </>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={enviando}>
            Cerrar
          </Button>
          {pestana === "email" && (
            <Button variant="success" onClick={enviarPorEmail} disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar ticket"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
