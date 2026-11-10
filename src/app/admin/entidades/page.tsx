"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  actualizarEntidadFiscal,
  listarEntidadesFiscales,
  type EntidadFiscal,
  type EntidadFiscalInput,
} from "./actions";

function aInput(entidad: EntidadFiscal): EntidadFiscalInput {
  return {
    nombre_comercial: entidad.nombre_comercial,
    razon_social: entidad.razon_social,
    rfc: entidad.rfc,
    regimen_fiscal: entidad.regimen_fiscal,
    direccion: entidad.direccion,
    telefonos: entidad.telefonos,
    email: entidad.email,
    sitio_web: entidad.sitio_web,
    logo_url: entidad.logo_url,
    cp_expedicion: entidad.cp_expedicion,
    serie_factura: entidad.serie_factura,
    facturacion_key: entidad.facturacion_key,
    activo: entidad.activo,
  };
}

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const labelClass = "block text-xs font-medium text-gray-600 mb-1";

function EntidadCard({
  entidad,
  onSaved,
}: {
  entidad: EntidadFiscal;
  onSaved: () => void;
}) {
  const { showError, showSuccess } = useToast();
  const [form, setForm] = useState<EntidadFiscalInput>(() => aInput(entidad));
  const [guardando, setGuardando] = useState(false);
  const [dirty, setDirty] = useState(false);

  function set<K extends keyof EntidadFiscalInput>(
    campo: K,
    valor: EntidadFiscalInput[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setDirty(true);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await actualizarEntidadFiscal(entidad.id, form);
      setDirty(false);
      showSuccess("Datos fiscales actualizados.");
      onSaved();
    } catch (err: unknown) {
      showError(
        err instanceof Error
          ? err.message
          : "Error al actualizar los datos fiscales.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={handleGuardar}
      className="bg-white rounded-xl shadow p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2 border-b border-gray-200 pb-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">
            {[entidad.marca_nombre, entidad.sucursal_nombre]
              .filter(Boolean)
              .join(" · ") || entidad.nombre_comercial}
          </h3>
          <p className="text-[11px] text-gray-400">{entidad.codigo}</p>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ${
            form.activo
              ? "bg-green-100 text-green-700"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {form.activo ? "Activa" : "Inactiva"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Nombre comercial</label>
          <input
            className={inputClass}
            value={form.nombre_comercial}
            onChange={(e) => set("nombre_comercial", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Razón social</label>
          <input
            className={inputClass}
            value={form.razon_social}
            onChange={(e) => set("razon_social", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>RFC</label>
          <input
            className={inputClass}
            value={form.rfc}
            onChange={(e) => set("rfc", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Régimen fiscal</label>
          <input
            className={inputClass}
            value={form.regimen_fiscal}
            onChange={(e) => set("regimen_fiscal", e.target.value)}
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Dirección</label>
          <textarea
            className={inputClass}
            rows={2}
            value={form.direccion}
            onChange={(e) => set("direccion", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Teléfonos</label>
          <input
            className={inputClass}
            value={form.telefonos ?? ""}
            onChange={(e) => set("telefonos", e.target.value || null)}
          />
        </div>
        <div>
          <label className={labelClass}>Correo</label>
          <input
            type="email"
            className={inputClass}
            value={form.email ?? ""}
            onChange={(e) => set("email", e.target.value || null)}
          />
        </div>
        <div>
          <label className={labelClass}>Sitio web</label>
          <input
            className={inputClass}
            value={form.sitio_web ?? ""}
            onChange={(e) => set("sitio_web", e.target.value || null)}
          />
        </div>
        <div>
          <label className={labelClass}>Logo (URL)</label>
          <input
            className={inputClass}
            value={form.logo_url ?? ""}
            onChange={(e) => set("logo_url", e.target.value || null)}
          />
        </div>
        <div>
          <label className={labelClass}>CP de expedición</label>
          <input
            className={inputClass}
            value={form.cp_expedicion}
            onChange={(e) => set("cp_expedicion", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Serie de factura</label>
          <input
            className={inputClass}
            value={form.serie_factura ?? ""}
            onChange={(e) => set("serie_factura", e.target.value || null)}
          />
        </div>
        <div>
          <label className={labelClass}>Clave de facturación</label>
          <select
            className={inputClass}
            value={form.facturacion_key}
            onChange={(e) => set("facturacion_key", e.target.value)}
          >
            <option value="PIC">PIC</option>
            <option value="FRX">FRX</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 mt-5">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) => set("activo", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Entidad activa
        </label>
      </div>

      <div className="bg-amber-50 text-amber-700 text-[11px] px-3 py-2 rounded-lg">
        Cambiar la serie o la clave de facturación afecta los CFDI futuros.
        Desactivar la entidad impide asignarla a usuarios.
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={guardando || !dirty}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

export default function EntidadesFiscalesPage() {
  const [entidades, setEntidades] = useState<EntidadFiscal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const data = await listarEntidadesFiscales();
      setEntidades(data);
      setError("");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar los datos fiscales.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    listarEntidadesFiscales()
      .then((data) => {
        if (ignore) return;
        setEntidades(data);
        setError("");
      })
      .catch((err: unknown) => {
        if (ignore) return;
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar los datos fiscales.",
        );
      })
      .finally(() => {
        if (!ignore) setCargando(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold text-gray-700 text-sm uppercase">
          Datos fiscales
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Datos con los que se emiten tickets y CFDI para cada razón social y
          sucursal.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="text-gray-400 text-sm text-center py-8">
          Cargando datos fiscales...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {entidades.map((entidad) => (
            <EntidadCard
              key={`${entidad.id}-${entidad.updated_at ?? ""}`}
              entidad={entidad}
              onSaved={cargar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
