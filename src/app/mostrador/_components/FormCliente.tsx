"use client";

import React, { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { es } from "date-fns/locale";
import { Autocompletar } from "@/components/ui/Autocompletar";
import { useAutocompletar } from "@/lib/hooks/useAutocompletar";
import { buscarClientes, type ClienteHistorial } from "@/lib/services/pedidos";
import { buscarClienteFiscal } from "@/lib/services/clientesFiscales";
import { redondearA30Min } from "@/lib/utils/pedido";
import { REGIMENES_FISCALES, USOS_CFDI } from "@/lib/utils/fiscalCatalogos";
import { cpValido, normalizarRfc, rfcValido } from "@/lib/utils/fiscal";
import { facturacionHabilitada } from "@/lib/config/features";

function fechaLocal(fecha: string): Date | null {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

function horaLocal(hora: string): Date | null {
  if (!hora) return null;
  const [horas, minutos] = hora.split(":").map(Number);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) return null;
  const fecha = new Date();
  fecha.setHours(horas, minutos, 0, 0);
  return fecha;
}

function formatoFecha(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function formatoHora(fecha: Date): string {
  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
}

interface FormClienteProps {
  nombre: string;
  telefono: string;
  email: string;
  fechaEntrega: string;
  horaEntrega: string;
  requiereFactura: boolean;
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  usoCfdi: string;
  cpFiscal: string;
  onNombreChange: (v: string) => void;
  onTelefonoChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onFechaEntregaChange: (v: string) => void;
  onHoraEntregaChange: (v: string) => void;
  onRequiereFacturaChange: (v: boolean) => void;
  onRfcChange: (v: string) => void;
  onRazonSocialChange: (v: string) => void;
  onRegimenFiscalChange: (v: string) => void;
  onUsoCfdiChange: (v: string) => void;
  onCpFiscalChange: (v: string) => void;
}

export function FormCliente({
  nombre,
  telefono,
  email,
  fechaEntrega,
  horaEntrega,
  requiereFactura,
  rfc,
  razonSocial,
  regimenFiscal,
  usoCfdi,
  cpFiscal,
  onNombreChange,
  onTelefonoChange,
  onEmailChange,
  onFechaEntregaChange,
  onHoraEntregaChange,
  onRequiereFacturaChange,
  onRfcChange,
  onRazonSocialChange,
  onRegimenFiscalChange,
  onUsoCfdiChange,
  onCpFiscalChange,
}: FormClienteProps) {
  const renderCliente = (c: ClienteHistorial) => {
    const base = c.telefono ? `${c.nombre} · ${c.telefono}` : c.nombre;
    return c.pedidos_count ? `${base} · ${c.pedidos_count} pedido(s)` : base;
  };

  const solicitudFiscalRef = useRef(0);
  const [fiscalCargado, setFiscalCargado] = useState(false);

  const seleccionarCliente = async (c: ClienteHistorial) => {
    onNombreChange(c.nombre);
    onTelefonoChange(c.telefono ?? "");
    onEmailChange(c.email ?? "");

    if (!facturacionHabilitada()) {
      setFiscalCargado(false);
      return;
    }

    const solicitud = ++solicitudFiscalRef.current;
    try {
      const fiscal = await buscarClienteFiscal(
        c.telefono ?? "",
        c.email ?? "",
      );
      if (solicitud !== solicitudFiscalRef.current) return;

      if (fiscal) {
        onRequiereFacturaChange(true);
        onRfcChange(fiscal.rfc);
        onRazonSocialChange(fiscal.razon_social);
        onRegimenFiscalChange(fiscal.regimen_fiscal ?? "");
        onUsoCfdiChange(fiscal.uso_cfdi ?? "");
        onCpFiscalChange(fiscal.cp_fiscal ?? "");
        setFiscalCargado(true);
      } else {
        setFiscalCargado(false);
      }
    } catch {
      if (solicitud === solicitudFiscalRef.current) setFiscalCargado(false);
    }
  };

  const opcionesCliente = {
    fetchFn: buscarClientes,
    onSelect: seleccionarCliente,
    renderItem: renderCliente,
    minChars: 2,
    idFromItem: (c: ClienteHistorial) => `${c.telefono ?? ""}-${c.nombre}`,
  };

  const autocompletarNombre = useAutocompletar<ClienteHistorial>(opcionesCliente);
  const autocompletarTelefono =
    useAutocompletar<ClienteHistorial>(opcionesCliente);

  useEffect(() => {
    const horaValida = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(horaEntrega);
    const minutos = Number(horaEntrega.slice(-2));
    if (horaValida && minutos % 30 !== 0) {
      onHoraEntregaChange(redondearA30Min(horaEntrega));
    }
  }, [horaEntrega, onHoraEntregaChange]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 space-y-3">
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
        Datos del Cliente
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="cliente-nombre" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Nombre del Cliente *{" "}
            <span className="text-gray-400">(busca clientes existentes)</span>
          </label>
          <Autocompletar
            id="cliente-nombre"
            placeholder="Nombre completo"
            valor={nombre}
            onChange={(v) => {
              autocompletarNombre.buscar(v);
              onNombreChange(v);
            }}
            opciones={autocompletarNombre.opciones}
            renderOpcion={renderCliente}
            onSelect={autocompletarNombre.seleccionar}
            abierto={autocompletarNombre.abierto}
            cargando={autocompletarNombre.cargando}
            indiceSeleccionado={autocompletarNombre.indiceSeleccionado}
            onKeyDown={autocompletarNombre.tecla}
            containerRef={autocompletarNombre.containerRef}
            inputRef={autocompletarNombre.inputRef}
            idFromItem={(c) => `${c.telefono ?? ""}-${c.nombre}`}
            dark
          />
        </div>
        <div>
          <label htmlFor="cliente-telefono" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Teléfono <span className="text-gray-400">(busca clientes existentes)</span>
          </label>
          <Autocompletar
            id="cliente-telefono"
            placeholder="55 1234 5678"
            valor={telefono}
            onChange={(v) => {
              autocompletarTelefono.buscar(v);
              onTelefonoChange(v);
              setFiscalCargado(false);
            }}
            opciones={autocompletarTelefono.opciones}
            renderOpcion={renderCliente}
            onSelect={autocompletarTelefono.seleccionar}
            abierto={autocompletarTelefono.abierto}
            cargando={autocompletarTelefono.cargando}
            indiceSeleccionado={autocompletarTelefono.indiceSeleccionado}
            onKeyDown={autocompletarTelefono.tecla}
            containerRef={autocompletarTelefono.containerRef}
            inputRef={autocompletarTelefono.inputRef}
            idFromItem={(c) => `${c.telefono ?? ""}-${c.nombre}`}
            dark
          />
        </div>
        <div>
          <label htmlFor="cliente-email" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Correo{" "}
            {!facturacionHabilitada()
              ? "(opcional)"
              : requiereFactura
                ? "*"
                : "(para factura)"}
          </label>
          <input
            id="cliente-email"
            type="email"
            value={email}
            onChange={(e) => {
              onEmailChange(e.target.value);
              setFiscalCargado(false);
            }}
            className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="cliente@correo.com"
          />
        </div>
        <div>
          <label htmlFor="cliente-fecha-entrega" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Fecha de Entrega *
          </label>
          <DatePicker
            id="cliente-fecha-entrega"
            selected={fechaLocal(fechaEntrega)}
            onChange={(fecha) => onFechaEntregaChange(fecha ? formatoFecha(fecha) : "")}
            selectsRange={false}
            selectsMultiple={false}
            dateFormat="dd/MM/yyyy"
            locale={es}
            placeholderText="Seleccionar fecha..."
            calendarClassName="pos-date-calendar"
            popperClassName="pos-datepicker-popper"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            showPopperArrow={false}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="cliente-hora-entrega" className="block text-xs font-medium text-gray-500 mb-1">
            Hora de Entrega *
          </label>
          <DatePicker
            id="cliente-hora-entrega"
            selected={horaLocal(horaEntrega)}
            onChange={(hora) => onHoraEntregaChange(hora ? formatoHora(hora) : "")}
            selectsRange={false}
            selectsMultiple={false}
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={30}
            timeCaption="Hora"
            dateFormat="HH:mm"
            locale={es}
            placeholderText="Seleccionar hora..."
            calendarClassName="pos-date-calendar"
            popperClassName="pos-datepicker-popper"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            showPopperArrow={false}
            autoComplete="off"
            isClearable
          />
        </div>
      </div>

      {facturacionHabilitada() && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-3">
        <label
          htmlFor="requiere-factura"
          className="flex items-start gap-2 cursor-pointer select-none"
        >
          <input
            id="requiere-factura"
            type="checkbox"
            checked={requiereFactura}
            onChange={(e) => onRequiereFacturaChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              ¿Requiere factura?
            </span>
            <span className="block text-xs text-gray-400 dark:text-gray-500">
              Sin RFC el pedido se incluirá en la factura global mensual.
            </span>
          </span>
        </label>

        {fiscalCargado && requiereFactura && (
          <p className="text-xs text-green-600 dark:text-green-400">
            <i className="fas fa-check-circle mr-1" />
            Datos fiscales cargados de una compra anterior.
          </p>
        )}

        {requiereFactura && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cliente-rfc" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                RFC *
              </label>
              <input
                id="cliente-rfc"
                type="text"
                value={rfc}
                onChange={(e) => onRfcChange(normalizarRfc(e.target.value))}
                maxLength={13}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="XAXX010101000"
                aria-invalid={rfc !== "" && !rfcValido(rfc)}
              />
              {rfc !== "" && !rfcValido(rfc) && (
                <p className="mt-1 text-[11px] text-red-500">RFC con formato inválido.</p>
              )}
            </div>
            <div>
              <label htmlFor="cliente-razon-social" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Razón social *
              </label>
              <input
                id="cliente-razon-social"
                type="text"
                value={razonSocial}
                onChange={(e) => onRazonSocialChange(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre fiscal"
              />
            </div>
            <div>
              <label htmlFor="cliente-regimen-fiscal" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Régimen fiscal *
              </label>
              <select
                id="cliente-regimen-fiscal"
                value={regimenFiscal}
                onChange={(e) => onRegimenFiscalChange(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar régimen...</option>
                {REGIMENES_FISCALES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cliente-uso-cfdi" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Uso de CFDI *
              </label>
              <select
                id="cliente-uso-cfdi"
                value={usoCfdi}
                onChange={(e) => onUsoCfdiChange(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar uso...</option>
                {USOS_CFDI.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cliente-cp-fiscal" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                CP fiscal *
              </label>
              <input
                id="cliente-cp-fiscal"
                type="text"
                inputMode="numeric"
                value={cpFiscal}
                onChange={(e) =>
                  onCpFiscalChange(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                maxLength={5}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="06450"
                aria-invalid={cpFiscal !== "" && !cpValido(cpFiscal)}
              />
              {cpFiscal !== "" && !cpValido(cpFiscal) && (
                <p className="mt-1 text-[11px] text-red-500">El CP debe tener 5 dígitos.</p>
              )}
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
